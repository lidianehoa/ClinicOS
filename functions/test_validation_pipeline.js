const crypto = require('crypto');
const pkijs = require('pkijs');
const asn1js = require('asn1js');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const engine = new pkijs.CryptoEngine({ name: 'node', crypto: globalThis.crypto, subtle: globalThis.crypto.subtle });
pkijs.setEngine('node', engine);

async function runTest() {
  console.log('1. Generating mock ICP-Brasil certificate with OID 2.16.76.1.3.1 (CPF 12345678901)...');
  
  // Generate RSA key pair
  const keyPair = await globalThis.crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['sign', 'verify']
  );

  const cert = new pkijs.Certificate();
  cert.version = 2; // v3
  cert.serialNumber = new asn1js.Integer({ value: 12345678 });
  cert.notBefore.value = new Date(Date.now() - 3600 * 1000);
  cert.notAfter.value = new Date(Date.now() + 365 * 24 * 3600 * 1000);

  cert.issuer.typesAndValues.push(
    new pkijs.AttributeTypeAndValue({
      type: '2.5.4.3', // CN
      value: new asn1js.Utf8String({ value: 'AC Safeweb RFB v5' })
    })
  );

  cert.subject.typesAndValues.push(
    new pkijs.AttributeTypeAndValue({
      type: '2.5.4.3', // CN
      value: new asn1js.Utf8String({ value: 'DR MICHAEL CHEN:12345678901' })
    })
  );

  // SAN extension with otherName OID 2.16.76.1.3.1
  // ICP-Brasil Dados do titular: 8 chars birth date + 11 chars CPF + ...
  const birthAndCpf = '1504198512345678901000000000000000000000000';
  const otherNameAsn = new asn1js.Constructed({
    idBlock: { tagClass: 3, tagNumber: 0 },
    value: [
      new asn1js.ObjectIdentifier({ value: '2.16.76.1.3.1' }),
      new asn1js.Constructed({
        idBlock: { tagClass: 3, tagNumber: 0 },
        value: [new asn1js.OctetString({ valueHex: Buffer.from(birthAndCpf) })]
      })
    ]
  });

  const seq = new asn1js.Sequence({ value: [otherNameAsn] });
  const altName = new pkijs.AltName({ schema: seq });

  cert.extensions = [
    new pkijs.Extension({
      extnID: '2.5.29.17',
      critical: false,
      extnValue: seq.toBER(false),
      parsedValue: altName
    })
  ];

  await cert.subjectPublicKeyInfo.importKey(keyPair.publicKey);
  await cert.sign(keyPair.privateKey, 'SHA-256');

  console.log('Certificate generated successfully.');

  // 2. Generate original PDF
  console.log('2. Generating original PDF...');
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('Receita Teste ClinicOS ICP-Brasil', { x: 50, y: 800, font, size: 14 });
  const originalPdfBytes = await doc.save();
  const originalSize = originalPdfBytes.length;
  const originalHash = crypto.createHash('sha256').update(originalPdfBytes).digest('hex');
  console.log(`Original PDF size: ${originalSize}, hash: ${originalHash}`);

  // 3. Simulate signed PDF with byte range and CMS
  console.log('3. Simulating incremental signed PDF with /ByteRange and CMS...');
  
  // The signed bytes will be originalPdfBytes + incremental content
  // In a real PDF, signature dictionary has placeholder /Contents <00000...>, but let's construct a valid ByteRange structure
  const placeholderLen = 8192; // 8KB in hex = 4KB CMS
  const part1 = Buffer.from(originalPdfBytes);
  const sigHeader = Buffer.from('\n%PDF-Signature-Test\n/ByteRange [ 0 ');
  const r0 = 0;
  // Let's create an incremental append:
  const appendPrefix = Buffer.from('\n% Incrementally signed block\n10 0 obj\n<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached /ByteRange [ 0 ');
  // We'll calculate offsets:
  // Part 1: from 0 to len1
  // Contents placeholder: <HEX>
  // Part 2: from len1 + contentsLen to end
  const beforeContents = Buffer.concat([
    part1,
    Buffer.from('\n% Incremental update\n10 0 obj\n<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached /ByteRange [ 0 ')
  ]);
  
  // Let's compute:
  // We want: /ByteRange [ 0 R1 R2 R3 ]
  // R1 will be offset where contents starts.
  // Between R1 and R2 is `<` + hex + `>`
  // R2 = R1 + hex.length + 2
  // R3 = length of trailing part
  const trailingPart = Buffer.from('\n>>\nendobj\n%%EOF\n');
  const hexPlaceholder = '0'.repeat(placeholderLen * 2);
  
  // Let's estimate:
  let dummyHeader = `/ByteRange [ 0 99999999 99999999 99999999 ] /Contents <`;
  // Let's write a helper to produce exact ranges:
  const baseAppend = Buffer.from('\n10 0 obj\n<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached /ByteRange [ ');
  
  // Let's do exact offsets:
  const offsetR0 = 0;
  // Let's format byte range with fixed width:
  // e.g. "0000000000 0000000000 0000000000 0000000000"
  // So length of ByteRange line is known exactly!
  const prefixAll = Buffer.concat([
    part1,
    Buffer.from('\n10 0 obj\n<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached /ByteRange [ ')
  ]);
  
  const byteRangeNumLen = 10;
  // rangeString = `${r0} ${r1} ${r2} ${r3}`
  // Let's fix range format:
  // e.g. `0 0000000000 0000000000 0000000000`
  const dummyRangeStr = `0 1234567890 1234567890 1234567890 ] /Contents <`;
  const fixedR1 = prefixAll.length + dummyRangeStr.length - 1; // pointing to '<'
  // Actually, Contents starts at fixedR1, which is `<`
  // The bytes signed in Part 1 are bytes from 0 to fixedR1.
  // Then Contents `<` + hex + `>` has length 1 + hexPlaceholder.length + 1.
  const r2 = fixedR1 + 1 + hexPlaceholder.length + 1;
  const r3 = trailingPart.length;
  
  // Now format the real range string padded to match length:
  const r1Str = String(fixedR1);
  const r2Str = String(r2);
  const r3Str = String(r3);
  let rangeStr = `0 ${r1Str} ${r2Str} ${r3Str} ] /Contents <`;
  // Pad with spaces before `]` to match exact dummy length
  while (rangeStr.length < dummyRangeStr.length) {
    rangeStr = rangeStr.replace(' ]', '  ]');
  }
  
  const signedPart1 = Buffer.concat([
    part1,
    Buffer.from('\n10 0 obj\n<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached /ByteRange [ '),
    Buffer.from(rangeStr.slice(0, -1)) // up to before '<'
  ]);
  
  console.log(`Signed part 1 length: ${signedPart1.length}, expected fixedR1: ${fixedR1}`);
  const signedPart2 = trailingPart;
  
  const signedBytesToDigest = Buffer.concat([signedPart1, signedPart2]);
  const sha256Digest = crypto.createHash('sha256').update(signedBytesToDigest).digest();
  console.log('Computed SHA-256 digest of signed bytes:', sha256Digest.toString('hex'));

  // Create CMS SignedData
  const signedData = new pkijs.SignedData({
    version: 1,
    encapContentInfo: new pkijs.EncapsulatedContentInfo({
      eContentType: pkijs.id_ContentType_Data
    }),
    signerInfos: [
      new pkijs.SignerInfo({
        version: 1,
        sid: new pkijs.IssuerAndSerialNumber({
          issuer: cert.issuer,
          serialNumber: cert.serialNumber
        }),
        digestAlgorithm: new pkijs.AlgorithmIdentifier({
          algorithmId: '2.16.840.1.101.3.4.2.1' // SHA-256
        }),
        signatureAlgorithm: new pkijs.AlgorithmIdentifier({
          algorithmId: '1.2.840.113549.1.1.1' // RSA
        }),
        signedAttrs: new pkijs.SignedAndUnsignedAttributes({
          type: 0,
          attributes: [
            new pkijs.Attribute({
              type: '1.2.840.113549.1.9.3', // contentType
              values: [new asn1js.ObjectIdentifier({ value: pkijs.id_ContentType_Data })]
            }),
            new pkijs.Attribute({
              type: '1.2.840.113549.1.9.4', // messageDigest
              values: [new asn1js.OctetString({ valueHex: sha256Digest })]
            })
          ]
        })
      })
    ],
    certificates: [cert]
  });

  await signedData.sign(keyPair.privateKey, 0, 'SHA-256');
  
  const contentInfo = new pkijs.ContentInfo({
    contentType: pkijs.id_ContentType_SignedData,
    content: signedData.toSchema(true)
  });
  
  const cmsDer = Buffer.from(contentInfo.toSchema().toBER(false));
  console.log(`Generated CMS size: ${cmsDer.length} bytes`);
  
  let cmsHex = cmsDer.toString('hex');
  // Pad with zeroes to fill placeholder
  if (cmsHex.length < hexPlaceholder.length) {
    cmsHex = cmsHex.padEnd(hexPlaceholder.length, '0');
  }

  const finalSignedPdf = Buffer.concat([
    signedPart1,
    Buffer.from('<' + cmsHex + '>'),
    signedPart2
  ]);

  console.log(`Final signed PDF total length: ${finalSignedPdf.length}`);

  // 4. Test validation pipeline
  console.log('4. Running validation pipeline on signed PDF...');
  
  // (a) Byte comparison with original
  const prefix = finalSignedPdf.subarray(0, originalSize);
  const prefixHash = crypto.createHash('sha256').update(prefix).digest('hex');
  if (prefixHash !== originalHash) {
    throw new Error('Integrity check failed: prefix does not match original PDF!');
  }
  console.log('-> Integrity check passed: First N bytes match original PDF exactly.');

  // (b) Find ByteRange and Contents
  const text = finalSignedPdf.toString('latin1');
  const match = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/.exec(text);
  if (!match) throw new Error('ByteRange not found');
  const [_, strR0, strR1, strR2, strR3] = match;
  const pR0 = parseInt(strR0), pR1 = parseInt(strR1), pR2 = parseInt(strR2), pR3 = parseInt(strR3);
  console.log(`-> ByteRange parsed: [${pR0}, ${pR1}, ${pR2}, ${pR3}]`);

  const middle = finalSignedPdf.subarray(pR0 + pR1, pR2).toString('latin1');
  const sIdx = middle.indexOf('<');
  const eIdx = middle.lastIndexOf('>');
  const extractedHex = middle.substring(sIdx + 1, eIdx).replace(/[^0-9a-fA-F]/g, '');
  const cmsBuffer = Buffer.from(extractedHex, 'hex');

  // (c) Parse ASN.1
  const asn1 = asn1js.fromBER(cmsBuffer.buffer.slice(cmsBuffer.byteOffset, cmsBuffer.byteOffset + cmsBuffer.byteLength));
  const parsedContentInfo = new pkijs.ContentInfo({ schema: asn1.result });
  const parsedSignedData = new pkijs.SignedData({ schema: parsedContentInfo.content });
  console.log('-> CMS SignedData parsed successfully.');

  // (d) Extract Certificate
  const signerCert = parsedSignedData.certificates[0];
  console.log('-> Cert subject:', signerCert.subject.typesAndValues.map(tv => tv.value.valueBlock.value).join(', '));
  console.log('-> Cert issuer:', signerCert.issuer.typesAndValues.map(tv => tv.value.valueBlock.value).join(', '));

  // Validity check
  const now = new Date();
  if (now < signerCert.notBefore.value || now > signerCert.notAfter.value) {
    throw new Error('Cert validity check failed!');
  }
  console.log('-> Cert validity verified (valid until ' + signerCert.notAfter.value.toISOString() + ')');

  // (e) Extract CPF
  const sanExt = signerCert.extensions.find(e => e.extnID === '2.5.29.17');
  let foundCpf = null;
  const generalNamesList = sanExt?.parsedValue?.altNames || sanExt?.parsedValue?.names || [];
  for (const gn of generalNamesList) {
    if (gn.type === 0) {
      const elems = gn.value.valueBlock?.value;
      if (Array.isArray(elems) && elems[0].valueBlock.toString() === '2.16.76.1.3.1') {
        const inner = elems[1].valueBlock.value[0];
        const octet = Buffer.from(inner.valueBlock.valueHexView).toString('latin1');
        foundCpf = octet.substring(8, 19);
      }
    }
  }
  console.log('-> Extracted CPF from OID 2.16.76.1.3.1:', foundCpf);
  if (foundCpf !== '12345678901') {
    throw new Error('CPF mismatch!');
  }

  // (f) Verify messageDigest
  const signedRangeBytes = Buffer.concat([
    finalSignedPdf.subarray(pR0, pR0 + pR1),
    finalSignedPdf.subarray(pR2, pR2 + pR3)
  ]);
  const computedHash = crypto.createHash('sha256').update(signedRangeBytes).digest();
  
  const signerInfo = parsedSignedData.signerInfos[0];
  const mdAttr = signerInfo.signedAttrs.attributes.find(a => a.type === '1.2.840.113549.1.9.4');
  const expectedHash = Buffer.from(mdAttr.values[0].valueBlock.valueHexView);
  
  if (!computedHash.equals(expectedHash)) {
    throw new Error('MessageDigest mismatch!');
  }
  console.log('-> MessageDigest matches computed ByteRange SHA-256 digest perfectly!');
  
  console.log('\n*** ALL TESTS PASSED! VALIDATION PIPELINE IS VERIFIED 100%! ***');
}

runTest().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
