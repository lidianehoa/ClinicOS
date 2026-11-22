"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processarValidacaoPdfAssinado = processarValidacaoPdfAssinado;
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const crypto = __importStar(require("crypto"));
const pkijs = __importStar(require("pkijs"));
const asn1js = __importStar(require("asn1js"));
const https_1 = require("firebase-functions/v2/https");
// Inicializar motor criptográfico do PKIjs usando WebCrypto do Node.js
const engine = new pkijs.CryptoEngine({
    name: 'node',
    crypto: globalThis.crypto,
    subtle: globalThis.crypto.subtle,
});
pkijs.setEngine('node', engine);
function maskCpf(cpf) {
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11)
        return '***.***.***-**';
    return `***.${clean.substring(3, 6)}.${clean.substring(6, 9)}-**`;
}
function cleanCpf(cpf) {
    if (!cpf)
        return '';
    return cpf.replace(/\D/g, '');
}
/**
 * Localiza e extrai o dicionário de assinatura (/ByteRange e /Contents) do PDF
 */
function extractPdfSignatureInfo(pdfBuffer) {
    const text = pdfBuffer.toString('latin1');
    const regex = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;
    let match;
    let lastMatch = null;
    while ((match = regex.exec(text)) !== null) {
        lastMatch = match;
    }
    if (!lastMatch) {
        throw new https_1.HttpsError('invalid-argument', 'O arquivo não tem assinatura digital (dicionário /ByteRange ausente).');
    }
    const r0 = parseInt(lastMatch[1], 10);
    const r1 = parseInt(lastMatch[2], 10);
    const r2 = parseInt(lastMatch[3], 10);
    const r3 = parseInt(lastMatch[4], 10);
    if (r0 !== 0 || r1 <= 0 || r2 <= r1 || r2 + r3 > pdfBuffer.length) {
        throw new https_1.HttpsError('invalid-argument', 'O arquivo possui estrutura de assinatura PDF corrompida ou inválida.');
    }
    // O conteúdo hex assinado fica localizado entre (r0 + r1) e r2
    const middle = pdfBuffer.subarray(r0 + r1, r2).toString('latin1');
    const sIdx = middle.indexOf('<');
    const eIdx = middle.lastIndexOf('>');
    if (sIdx === -1 || eIdx === -1 || eIdx <= sIdx) {
        throw new https_1.HttpsError('invalid-argument', 'O arquivo não tem assinatura digital (campo /Contents ausente ou malformatado).');
    }
    const hex = middle.substring(sIdx + 1, eIdx).replace(/[^0-9a-fA-F]/g, '');
    if (!hex || hex.length < 100) {
        throw new https_1.HttpsError('invalid-argument', 'O arquivo não contém uma estrutura de assinatura digital válida no campo /Contents.');
    }
    return {
        byteRange: [r0, r1, r2, r3],
        contentsHex: hex,
    };
}
/**
 * Extrai o CPF do certificado ICP-Brasil via SubjectAltName (OID 2.16.76.1.3.1) ou Subject CN
 */
function extractCpfFromCertificate(cert) {
    // 1. Primário: SubjectAltName (OID 2.5.29.17) -> otherName OID 2.16.76.1.3.1 (Pessoa Física ICP-Brasil)
    try {
        const sanExt = cert.extensions?.find((e) => e.extnID === '2.5.29.17');
        if (sanExt) {
            // Tentar tanto parsedValue.altNames quanto parsedValue.names
            const altNamesList = sanExt.parsedValue?.altNames ||
                sanExt.parsedValue?.names ||
                [];
            for (const gn of altNamesList) {
                if (gn.type === 0 && gn.value) {
                    // otherName
                    const elements = gn.value.valueBlock?.value;
                    if (Array.isArray(elements) && elements.length >= 2) {
                        const typeId = elements[0].valueBlock?.toString();
                        if (typeId === '2.16.76.1.3.1') {
                            // ICP-Brasil: 8 dígitos DDMMAAAA + 11 dígitos CPF + ...
                            const inner = elements[1].valueBlock?.value?.[0];
                            let rawString = '';
                            if (inner?.valueBlock?.valueHexView) {
                                rawString = Buffer.from(inner.valueBlock.valueHexView).toString('latin1');
                            }
                            else if (inner?.valueBlock?.value) {
                                rawString = String(inner.valueBlock.value);
                            }
                            if (rawString.length >= 19) {
                                const cpfCandidate = rawString.substring(8, 19).replace(/\D/g, '');
                                if (cpfCandidate.length === 11) {
                                    return cpfCandidate;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    catch (err) {
        console.warn('Erro ao inspecionar SubjectAltName do certificado:', err);
    }
    // 2. Secundário / Fallback: Subject CN (Common Name) formatado como "NOME:12345678901"
    try {
        for (const rdn of cert.subject.typesAndValues) {
            if (rdn.type === '2.5.4.3') {
                // commonName
                const cn = String(rdn.value.valueBlock?.value || '');
                const match = cn.match(/:(\d{11})$/) || cn.match(/:(\d{14})$/);
                if (match) {
                    return match[1].slice(-11);
                }
            }
        }
    }
    catch (err) {
        console.warn('Erro ao inspecionar Subject CN do certificado:', err);
    }
    return null;
}
function getSignerName(cert) {
    for (const rdn of cert.subject.typesAndValues) {
        if (rdn.type === '2.5.4.3') {
            const cn = String(rdn.value.valueBlock?.value || '');
            // Remove ":CPF" se existir
            return cn.split(':')[0].trim();
        }
    }
    return 'Médico(a) Veterinário(a)';
}
function getIssuerName(cert) {
    for (const rdn of cert.issuer.typesAndValues) {
        if (rdn.type === '2.5.4.3') {
            return String(rdn.value.valueBlock?.value || '').trim();
        }
    }
    return 'Autoridade Certificadora ICP-Brasil';
}
/**
 * Função executora da validação e arquivamento do PDF assinado
 */
async function processarValidacaoPdfAssinado(uid, data) {
    const { tenantId, receitaId, pdfBase64 } = data;
    if (!tenantId || !receitaId || !pdfBase64) {
        throw new https_1.HttpsError('invalid-argument', 'Parâmetros obrigatórios ausentes: tenantId, receitaId ou pdfBase64.');
    }
    const db = (0, firestore_1.getFirestore)();
    // 1. Obter registro da receita no Firestore
    const receitaRef = db
        .collection('clinicas')
        .doc(tenantId)
        .collection('receitas')
        .doc(receitaId);
    const receitaSnap = await receitaRef.get();
    if (!receitaSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Receita não encontrada no sistema.');
    }
    const receita = receitaSnap.data();
    if (receita.status === 'assinada') {
        throw new https_1.HttpsError('failed-precondition', 'Esta receita já está assinada digitalmente e não pode ser re-assinada ou alterada.');
    }
    if (receita.status === 'substituida' || receita.status === 'cancelada') {
        throw new https_1.HttpsError('failed-precondition', `Esta receita está ${receita.status} e não permite novas assinaturas.`);
    }
    if (!receita.originalSize || !receita.originalHashSha256) {
        throw new https_1.HttpsError('failed-precondition', 'Dados de integridade da receita original ausentes no registro.');
    }
    // 2. Obter cadastro e CPF do veterinário
    let registeredCpf = cleanCpf(receita.veterinarioCpf);
    if (!registeredCpf) {
        // Buscar no perfil do usuário (/usuarios/{uid})
        const userSnap = await db.collection('usuarios').doc(uid).get();
        if (userSnap.exists) {
            registeredCpf = cleanCpf(userSnap.data()?.cpf);
        }
    }
    if (!registeredCpf && receita.veterinarioId) {
        // Buscar no staff da clínica
        const staffSnap = await db
            .collection('clinicas')
            .doc(tenantId)
            .collection('staff')
            .doc(receita.veterinarioId)
            .get();
        if (staffSnap.exists) {
            registeredCpf = cleanCpf(staffSnap.data()?.cpf);
        }
    }
    if (!registeredCpf) {
        throw new https_1.HttpsError('failed-precondition', 'CPF do veterinário não encontrado no cadastro. Atualize seu CPF em Configurações para validar a assinatura digital ICP-Brasil.');
    }
    // 3. Converter base64 para Buffer
    const signedPdfBuffer = Buffer.from(pdfBase64, 'base64');
    // 4. Regra de Integridade Incremental:
    // "o PDF assinado deve começar com os mesmos bytes do PDF gerado em (1).
    // Basta comparar o hash dos primeiros N bytes, onde N = tamanho do PDF original."
    if (signedPdfBuffer.length < receita.originalSize) {
        throw new https_1.HttpsError('invalid-argument', 'Este não é o PDF desta receita (arquivo com tamanho inferior ao original gerado).');
    }
    const prefixBytes = signedPdfBuffer.subarray(0, receita.originalSize);
    const prefixHash = crypto.createHash('sha256').update(prefixBytes).digest('hex');
    if (prefixHash.toLowerCase() !== String(receita.originalHashSha256).toLowerCase()) {
        throw new https_1.HttpsError('invalid-argument', 'Este não é o PDF desta receita (o conteúdo pré-assinatura foi alterado ou adulterado).');
    }
    // 5. Extrair ByteRange e Contents
    const { byteRange, contentsHex } = extractPdfSignatureInfo(signedPdfBuffer);
    const [r0, r1, r2, r3] = byteRange;
    // 6. Decodificar CMS e obter certificado
    const cmsBuffer = Buffer.from(contentsHex, 'hex');
    const cmsArrayBuffer = cmsBuffer.buffer.slice(cmsBuffer.byteOffset, cmsBuffer.byteOffset + cmsBuffer.byteLength);
    const asn1 = asn1js.fromBER(cmsArrayBuffer);
    if (asn1.offset === -1) {
        throw new https_1.HttpsError('invalid-argument', 'O arquivo não tem assinatura digital (falha na decodificação ASN.1 do CMS).');
    }
    let contentInfo;
    let signedData;
    try {
        contentInfo = new pkijs.ContentInfo({ schema: asn1.result });
        signedData = new pkijs.SignedData({ schema: contentInfo.content });
    }
    catch (err) {
        throw new https_1.HttpsError('invalid-argument', `O arquivo não contém uma estrutura PAdES/CAdES válida: ${err.message}`);
    }
    if (!signedData.certificates || signedData.certificates.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'Nenhum certificado digital foi encontrado no arquivo assinado.');
    }
    const signerInfo = signedData.signerInfos[0];
    if (!signerInfo) {
        throw new https_1.HttpsError('invalid-argument', 'SignerInfo ausente na assinatura digital.');
    }
    // Localizar o certificado do signatário
    let signerCert = null;
    for (const c of signedData.certificates) {
        if (c instanceof pkijs.Certificate) {
            if (signerInfo.sid instanceof pkijs.IssuerAndSerialNumber) {
                if (c.serialNumber.isEqual(signerInfo.sid.serialNumber)) {
                    signerCert = c;
                    break;
                }
            }
            else {
                signerCert = c;
                break;
            }
        }
    }
    if (!signerCert && signedData.certificates.length > 0) {
        signerCert = signedData.certificates[0];
    }
    if (!signerCert) {
        throw new https_1.HttpsError('invalid-argument', 'Não foi possível extrair o certificado do signatário do arquivo.');
    }
    // 7. Checagem de Validade Temporal do Certificado
    const notBefore = signerCert.notBefore.value;
    const notAfter = signerCert.notAfter.value;
    const now = new Date();
    if (now < notBefore || now > notAfter) {
        throw new https_1.HttpsError('invalid-argument', `Certificado fora da validade. Período válido: ${notBefore.toLocaleDateString('pt-BR')} até ${notAfter.toLocaleDateString('pt-BR')}.`);
    }
    // 8. Checagem do CPF do Signatário
    const certCpf = extractCpfFromCertificate(signerCert);
    if (!certCpf) {
        throw new https_1.HttpsError('invalid-argument', 'Não foi possível identificar o CPF no certificado digital. Certifique-se de usar um certificado e-CPF padrão ICP-Brasil.');
    }
    if (certCpf !== registeredCpf) {
        throw new https_1.HttpsError('invalid-argument', `Certificado de outra pessoa: o CPF do certificado (${maskCpf(certCpf)}) não confere com o CPF cadastrado do veterinário (${maskCpf(registeredCpf)}).`);
    }
    // 9. Checagem do messageDigest contra o conteúdo do ByteRange
    const signedBytes = Buffer.concat([
        signedPdfBuffer.subarray(r0, r0 + r1),
        signedPdfBuffer.subarray(r2, r2 + r3),
    ]);
    let digestAlgo = 'sha256';
    const digestOid = signerInfo.digestAlgorithm?.algorithmId;
    if (digestOid === '2.16.840.1.101.3.4.2.2')
        digestAlgo = 'sha384';
    else if (digestOid === '2.16.840.1.101.3.4.2.3')
        digestAlgo = 'sha512';
    else if (digestOid === '1.3.14.3.2.26')
        digestAlgo = 'sha1';
    const computedDigest = crypto.createHash(digestAlgo).update(signedBytes).digest();
    const mdAttr = signerInfo.signedAttrs?.attributes.find((a) => a.type === '1.2.840.113549.1.9.4');
    if (!mdAttr || !mdAttr.values || mdAttr.values.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'Atributo messageDigest ausente na assinatura do documento.');
    }
    const expectedDigest = Buffer.from(mdAttr.values[0].valueBlock.valueHexView);
    if (!computedDigest.equals(expectedDigest)) {
        throw new https_1.HttpsError('invalid-argument', 'Assinatura digital corrompida: o resumo criptográfico do documento assinado não confere com o conteúdo assinado.');
    }
    // 10. Salvar o PDF assinado oficial no Storage
    // Caminho exigido: clinicas/{tenantId}/receitas/{receitaId}/assinada.pdf
    const bucket = (0, storage_1.getStorage)().bucket();
    const storageFilePath = `clinicas/${tenantId}/receitas/${receitaId}/assinada.pdf`;
    const file = bucket.file(storageFilePath);
    await file.save(signedPdfBuffer, {
        contentType: 'application/pdf',
        metadata: {
            metadata: {
                receitaId,
                tenantId,
                assinadoPor: getSignerName(signerCert),
                cpfMascarado: maskCpf(certCpf),
                assinadoEm: new Date().toISOString(),
            },
        },
    });
    // Gerar URL de acesso ao PDF assinado
    let downloadUrl = '';
    try {
        const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: '2030-01-01',
        });
        downloadUrl = signedUrl;
    }
    catch (err) {
        console.warn('getSignedUrl falhou, gerando URL padrão do Storage:', err);
        downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storageFilePath)}?alt=media`;
    }
    // 11. Gravar metadados da assinatura no Firestore
    const fullFileHash = crypto.createHash('sha256').update(signedPdfBuffer).digest('hex');
    const titular = getSignerName(signerCert);
    const emissorAC = getIssuerName(signerCert);
    const serial = signerCert.serialNumber.valueBlock.toString();
    const assinadoEm = new Date().toISOString();
    const assinaturaInfo = {
        em: assinadoEm,
        titular,
        cpfMascarado: maskCpf(certCpf),
        emissorAC,
        serial,
        hashSha256: fullFileHash,
        metodo: 'upload',
    };
    // Atualizar documento da receita na clínica
    await receitaRef.update({
        status: 'assinada',
        assinatura: assinaturaInfo,
        pdfAssinadoPath: storageFilePath,
        pdfAssinadoUrl: downloadUrl,
        atualizadoEm: assinadoEm,
        assinadoEm: assinadoEm,
    });
    // Atualizar também na coleção de verificação pública (/verificacao_receitas/{codigo})
    const codigoVerificacao = receita.codigoVerificacao;
    if (codigoVerificacao) {
        await db.collection('verificacao_receitas').doc(codigoVerificacao).set({
            codigo: codigoVerificacao,
            tenantId,
            receitaId,
            nomeVeterinario: receita.veterinarioNome || titular,
            crmvVeterinario: receita.veterinarioCrmv || '',
            dataEmissao: receita.criadoEm || assinadoEm,
            dataAssinatura: assinadoEm,
            status: 'assinada',
            pdfUrl: downloadUrl,
            hashSha256: fullFileHash,
            atualizadoEm: assinadoEm,
        }, { merge: true });
    }
    // Atualizar índice global de tokens de dispensação (/tokens_receita/{token})
    const tokenDispensacao = receita.tokenDispensacao;
    if (tokenDispensacao) {
        await db.collection('tokens_receita').doc(tokenDispensacao).set({
            isAssinada: true,
            status: 'assinada',
            statusAssinatura: 'assinada',
            pdfAssinadoUrl: downloadUrl,
            pdfAssinadoHash: fullFileHash,
            assinadoEm,
            titular,
            atualizadoEm: assinadoEm,
        }, { merge: true });
    }
    return {
        success: true,
        assinatura: assinaturaInfo,
        pdfUrl: downloadUrl,
    };
}
//# sourceMappingURL=validarPdfAssinado.js.map