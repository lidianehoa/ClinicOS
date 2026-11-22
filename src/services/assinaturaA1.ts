/**
 * Assinatura de receitas com certificado digital A1 (arquivo .pfx/.p12) DENTRO DO NAVEGADOR.
 *
 * - O arquivo do certificado e a senha nunca saem do computador do veterinário:
 *   nada é enviado ao servidor nem salvo (nem no Firestore, nem no navegador).
 * - A assinatura é acrescentada como atualização incremental do PDF, então os bytes
 *   originais ficam intactos no início do arquivo. É isso que permite à Cloud Function
 *   validarPdfAssinado conferir que o PDF assinado é o mesmo que foi gerado.
 * - O PDF assinado é depois enviado ao validarPdfAssinado (mesmo fluxo da Fase 1).
 */
import { Buffer } from 'buffer';
import forge from 'node-forge';
import { plainAddPlaceholder } from '@signpdf/placeholder-plain';
import { P12Signer } from '@signpdf/signer-p12';
import signpdfModule from '@signpdf/signpdf';

// As bibliotecas de assinatura usam Buffer (API do Node); no navegador usamos o polyfill.
if (typeof (globalThis as any).Buffer === 'undefined') {
  (globalThis as any).Buffer = Buffer;
}

const signpdf: any = (signpdfModule as any).default || signpdfModule;

const OID_CPF_PESSOA_FISICA = '2.16.76.1.3.1';

export interface InfoCertificadoA1 {
  titular: string;
  cpf: string | null;
  emissor: string;
  validoDe: Date;
  validoAte: Date;
  vencido: boolean;
}

export class ErroCertificadoA1 extends Error {}

function lerP12(pfx: ArrayBuffer, senha: string): forge.pkcs12.Pkcs12Pfx {
  try {
    const der = forge.util.binary.raw.encode(new Uint8Array(pfx));
    const asn1 = forge.asn1.fromDer(der);
    return forge.pkcs12.pkcs12FromAsn1(asn1, false, senha);
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (/mac|password|invalid/i.test(msg)) {
      throw new ErroCertificadoA1('Senha do certificado incorreta.');
    }
    throw new ErroCertificadoA1('Não foi possível abrir o certificado. Confira se o arquivo é um .pfx ou .p12 válido.');
  }
}

/** Extrai o CPF do campo otherName 2.16.76.1.3.1 (padrão ICP-Brasil: data de nascimento + CPF + ...). */
/** Junta todo o texto de um nó ASN.1 (o valor pode vir como PrintableString, UTF8 ou OCTET STRING). */
function textoAsn1(no: any): string {
  if (!no) return '';
  if (typeof no.value === 'string') return no.value;
  if (Array.isArray(no.value)) return no.value.map(textoAsn1).join('');
  return '';
}

function extrairCpf(cert: forge.pki.Certificate): string | null {
  const ext: any = cert.getExtension('subjectAltName');
  const altNames: any[] = ext?.altNames || [];
  for (const alt of altNames) {
    // forge expõe otherName como type 0 com o valor ASN.1 cru
    if (alt.type === 0 && alt.value) {
      try {
        // forge entrega o otherName como lista ASN.1: [OID, [0] EXPLICIT valor]
        const partes: any[] = Array.isArray(alt.value)
          ? alt.value
          : (forge.asn1.fromDer(alt.value).value as any[]);
        const oid = forge.asn1.derToOid(partes[0].value);
        if (oid === OID_CPF_PESSOA_FISICA) {
          const digitos = textoAsn1(partes[1]).replace(/\D/g, '');
          if (digitos.length >= 19) return digitos.substring(8, 19);
        }
      } catch {
        /* segue para o próximo nome */
      }
    }
  }
  // Alternativa: muitos certificados trazem "NOME:CPF" no CN
  const cn = String(cert.subject.getField('CN')?.value || '');
  const m = cn.match(/:(\d{11})\s*$/);
  return m ? m[1] : null;
}

function certificadoDoTitular(p12: forge.pkcs12.Pkcs12Pfx): forge.pki.Certificate {
  const bags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || [];
  const chave: any = keyBags[0]?.key;
  // O certificado do titular é o que corresponde à chave privada
  for (const bag of bags) {
    const cert = bag.cert as any;
    if (cert && chave && cert.publicKey?.n && chave.n && cert.publicKey.n.equals(chave.n)) return cert;
  }
  const primeiro = bags.find(b => b.cert)?.cert;
  if (!primeiro) throw new ErroCertificadoA1('O arquivo não contém um certificado.');
  return primeiro;
}

export function lerCertificadoA1(pfx: ArrayBuffer, senha: string): InfoCertificadoA1 {
  const p12 = lerP12(pfx, senha);
  const cert = certificadoDoTitular(p12);
  const cn = String(cert.subject.getField('CN')?.value || '');
  const emissor = String(cert.issuer.getField('CN')?.value || cert.issuer.getField('O')?.value || '');
  const agora = new Date();
  return {
    titular: cn.split(':')[0].trim() || cn,
    cpf: extrairCpf(cert),
    emissor,
    validoDe: cert.validity.notBefore,
    validoAte: cert.validity.notAfter,
    vencido: agora < cert.validity.notBefore || agora > cert.validity.notAfter,
  };
}

export interface OpcoesAssinaturaA1 {
  /** CPF cadastrado no perfil do veterinário, para conferir se o certificado é dele. */
  cpfEsperado?: string | null;
  motivo?: string;
  local?: string;
}

/**
 * Assina o PDF da receita com o certificado A1 e devolve o PDF assinado.
 * O arquivo e a senha só existem em memória durante a chamada.
 */
export async function assinarPdfComA1(
  pdfBytes: Uint8Array,
  pfx: ArrayBuffer,
  senha: string,
  opcoes: OpcoesAssinaturaA1 = {}
): Promise<{ pdfAssinado: Uint8Array; certificado: InfoCertificadoA1 }> {
  const certificado = lerCertificadoA1(pfx, senha);

  if (certificado.vencido) {
    throw new ErroCertificadoA1(
      `Certificado fora da validade (válido até ${certificado.validoAte.toLocaleDateString('pt-BR')}).`
    );
  }
  const cpfEsperado = (opcoes.cpfEsperado || '').replace(/\D/g, '');
  if (!cpfEsperado) {
    throw new ErroCertificadoA1('Cadastre o seu CPF em Configurações → O Meu Perfil antes de assinar.');
  }
  if (certificado.cpf && certificado.cpf !== cpfEsperado) {
    throw new ErroCertificadoA1('Este certificado é de outra pessoa: o CPF não confere com o do seu perfil.');
  }

  const pdfComEspaco = plainAddPlaceholder({
    pdfBuffer: Buffer.from(pdfBytes),
    reason: opcoes.motivo || 'Receita veterinária',
    contactInfo: '',
    name: certificado.titular,
    location: opcoes.local || 'Brasil',
    signatureLength: 16384,
    subFilter: 'ETSI.CAdES.detached',
  });

  try {
    const signer = new P12Signer(Buffer.from(new Uint8Array(pfx)), { passphrase: senha });
    const assinado: Buffer = await signpdf.sign(pdfComEspaco, signer);
    return { pdfAssinado: new Uint8Array(assinado), certificado };
  } catch (err: any) {
    console.error('Erro ao assinar com A1:', err);
    throw new ErroCertificadoA1('Não foi possível assinar o PDF com este certificado.');
  }
}

export function bytesParaBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}
