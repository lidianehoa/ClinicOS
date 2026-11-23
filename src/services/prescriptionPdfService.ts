import { PDFDocument, rgb, StandardFonts, PDFString } from 'pdf-lib';
import QRCode from 'qrcode';
import {
  SubtipoReceita,
  formatDataExtensoPtBR,
  formatIdadeCalculada,
  getTituloCentralReceita,
  mascararCpf
} from './dispensationService';

export interface PrescricaoItemData {
  produto: string;
  concentracao?: string;
  quantidade: string | number;
  quantidadeExtenso?: string;
  unidade?: string;
  posologia: string;
}

export interface PrescricaoPdfData {
  tokenDispensacao: string;
  codigoVerificacao?: string;
  tenantSlug?: string;
  subtipo?: SubtipoReceita;
  tipo?: 'receita_simples' | 'receita_manipulada';
  status: 'rascunho' | 'aguardando_assinatura' | 'assinada' | 'substituida' | 'cancelada' | 'importada';
  dataEmissao: string; // ISO date ou DD/MM/AAAA
  validadeAte?: string; // DD/MM/AAAA
  validadeDias?: number; // ex: 30 ou 10

  // Clínica ou Veterinário Autônomo
  clinicName?: string;
  clinicCnpj?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  clinicAddress?: string;
  clinicLogoBase64?: string; // data URL ou base64
  clinicSlogan?: string;
  primaryColorHex?: string; // ex: #0f766e

  // Médico Veterinário / Prescritor
  veterinarioNome: string;
  veterinarioCrmv: string;
  veterinarioEmail?: string;
  veterinarioTelefone?: string;
  veterinarioEndereco?: string;
  veterinarioCpf?: string;
  cpfPrescritorModo?: 'ocultar' | 'mascarado' | 'completo';
  registroMapa?: string;

  // Paciente (Animal)
  pacienteNome: string;
  pacienteEspecie?: string;
  pacienteRaca?: string;
  pacienteSexo?: string;
  pacienteIdade?: string; // ex: "5 anos e 2 meses"
  pacientePeso?: number | string;
  pacienteDataPeso?: string;

  // Tutor (Responsável Legal)
  tutorNome: string;
  tutorCpf?: string;
  tutorTelefone?: string;
  tutorEndereco?: string;

  // Itens da Prescrição
  itens?: PrescricaoItemData[];
  conteudoClinico?: string; // Fallback se texto livre

  // Orientações ao Tutor
  orientacoes?: string[] | string;

  // Observações ao Responsável Legal
  observacoesResponsavel?: string;

  // Medicamento Controlado / SIPEAGRO
  isControlado?: boolean;
  numeroNotificacaoSipeagro?: string;

  // Dados da Assinatura ICP-Brasil (se assinada)
  assinaturaInfo?: {
    em: string;
    titular: string;
    cpfMascarado: string;
    emissorAC: string;
    serial?: string;
    hashSha256?: string;
  };

  dominio?: string;
}

export interface GeneratedPdfResult {
  pdfBytes: Uint8Array;
  originalSize: number;
  originalHashSha256: string;
  dispensationUrl: string;
  verificationUrl: string;
  fileName: string;
}

/**
 * Converte cor hexadecimal (#RRGGBB) para valores rgb do pdf-lib [0..1]
 */
function hexToRgb(hex?: string): { r: number; g: number; b: number } {
  if (!hex || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) {
    return { r: 0.05, g: 0.38, b: 0.35 }; // Teal escuro padrão #0d6159
  }
  let h = hex.slice(1);
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('');
  }
  const num = parseInt(h, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

/**
 * Quebra texto longo em linhas com largura máxima aproximada em caracteres
 */
function wrapText(text: string, maxCharsPerLine: number = 80): string[] {
  if (!text) return [];
  const result: string[] = [];
  const paragraphs = text.split('\n');

  for (const para of paragraphs) {
    if (!para.trim()) {
      result.push('');
      continue;
    }
    if (para.length <= maxCharsPerLine) {
      result.push(para);
    } else {
      const words = para.split(' ');
      let currentLine = '';
      for (const w of words) {
        if ((currentLine + (currentLine ? ' ' : '') + w).length <= maxCharsPerLine) {
          currentLine += (currentLine ? ' ' : '') + w;
        } else {
          if (currentLine) result.push(currentLine);
          currentLine = w;
        }
      }
      if (currentLine) result.push(currentLine);
    }
  }
  return result;
}

/**
 * Adiciona anotação de link clicável (URI) em uma região retangular da página do PDF
 */
function addClickableLink(page: any, x: number, y: number, width: number, height: number, url: string) {
  try {
    const doc = page.doc;
    const linkAnnot = doc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, y, x + width, y + height],
      Border: [0, 0, 0],
      C: [0, 0, 0],
      A: {
        Type: 'Action',
        S: 'URI',
        URI: PDFString.of(url),
      },
    });
    const linkRef = doc.context.register(linkAnnot);
    page.node.addAnnot(linkRef);
  } catch (err) {
    console.warn('Não foi possível registrar link interativo no PDF:', err);
  }
}

/**
 * Calcula o hash SHA-256 de um Uint8Array usando WebCrypto nativo do navegador
 */
export async function computeSha256(data: Uint8Array): Promise<string> {
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Retorna o nome padrão do arquivo PDF
 * Exemplo: Receita_Rex_22-11-2026.pdf ou Receita_assinada_Rex_22-11-2026.pdf
 */
export function getReceitaFileName(
  pacienteNome: string,
  dataEmissao: Date | string = new Date(),
  assinada: boolean = false
): string {
  const d = typeof dataEmissao === 'string' ? new Date(dataEmissao) : dataEmissao;
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  const dataFormatada = `${dia}-${mes}-${ano}`;
  const nomeLimpo = (pacienteNome || 'Animal')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  const prefixo = assinada ? 'Receita_assinada' : 'Receita';
  return `${prefixo}_${nomeLimpo}_${dataFormatada}.pdf`;
}

/**
 * Gera o documento PDF oficial da receita com selo de assinatura digital ICP-Brasil e QR Code
 * Conformidade com os 11 blocos de layout e máximo de 2 páginas A4.
 */
export async function gerarPdfReceita(data: PrescricaoPdfData): Promise<GeneratedPdfResult> {
  const doc = await PDFDocument.create();
  const pageWidth = 595.28; // A4 pt
  const pageHeight = 841.89; // A4 pt
  const margin = 36; // 12.7mm de margem
  const contentWidth = pageWidth - margin * 2;

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.CourierBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Paleta de cores
  const primaryClinic = hexToRgb(data.primaryColorHex);
  const colorHeaderBg = rgb(primaryClinic.r, primaryClinic.g, primaryClinic.b);
  const textDark = rgb(0.06, 0.09, 0.16); // #0f172a
  const textMuted = rgb(0.39, 0.45, 0.55); // #64748b
  const borderLight = rgb(0.85, 0.88, 0.92);
  const bgBox = rgb(0.97, 0.98, 0.99);

  // Subtipo da receita
  const subtipo: SubtipoReceita =
    data.subtipo ||
    (data.tipo === 'receita_manipulada' ? 'magistral' : data.isControlado ? 'controle_especial' : 'simples');

  const tituloCentral = getTituloCentralReceita(subtipo);

  // Determinar URL de dispensação e domínio
  const defaultDomain = typeof window !== 'undefined' ? window.location.origin : 'https://monitorbea.web.app';
  const domain = data.dominio || defaultDomain;
  const dispensationUrl = `${domain}/farmacia/d/${data.tokenDispensacao}`;
  const itiUrl = 'https://validar.iti.gov.br';
  const verificationUrl = data.codigoVerificacao
    ? `${domain}/${data.tenantSlug || 'clinica'}/verificar/${data.codigoVerificacao}`
    : dispensationUrl;

  // Gerar imagens dos dois QR Codes em PNG (mínimo 25mm = ~72pt, usaremos 76pt)
  const qrSizePt = 76;
  let qrDispensaImg: any = null;
  let qrItiImg: any = null;

  try {
    const qrDispDataUrl = await QRCode.toDataURL(dispensationUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 180,
      color: { dark: '#0a192f', light: '#ffffff' },
    });
    const qrDispBytes = Uint8Array.from(atob(qrDispDataUrl.split(',')[1]), c => c.charCodeAt(0));
    qrDispensaImg = await doc.embedPng(qrDispBytes);
  } catch (err) {
    console.warn('Erro ao gerar QR Code de Dispensação:', err);
  }

  try {
    const qrItiDataUrl = await QRCode.toDataURL(itiUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 180,
      color: { dark: '#0a192f', light: '#ffffff' },
    });
    const qrItiBytes = Uint8Array.from(atob(qrItiDataUrl.split(',')[1]), c => c.charCodeAt(0));
    qrItiImg = await doc.embedPng(qrItiBytes);
  } catch (err) {
    console.warn('Erro ao gerar QR Code do ITI:', err);
  }

  // Tentar embutir a Logo da Clínica
  let clinicLogoImg: any = null;
  if (data.clinicLogoBase64) {
    try {
      const base64Data = data.clinicLogoBase64.includes(',')
        ? data.clinicLogoBase64.split(',')[1]
        : data.clinicLogoBase64;
      const logoBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      if (data.clinicLogoBase64.includes('image/png') || data.clinicLogoBase64.startsWith('iVBORw')) {
        clinicLogoImg = await doc.embedPng(logoBytes);
      } else {
        clinicLogoImg = await doc.embedJpg(logoBytes);
      }
    } catch (e) {
      console.warn('Não foi possível carregar logo da clínica no PDF:', e);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Função para desenhar o Bloco 1: Cabeçalho com faixa escura
  // ──────────────────────────────────────────────────────────────────────────
  const drawHeaderBlock = (targetPage: any) => {
    const headerHeight = 64;
    const headerY = pageHeight - margin - headerHeight;

    // Faixa de fundo escura
    targetPage.drawRectangle({
      x: margin,
      y: headerY,
      width: contentWidth,
      height: headerHeight,
      color: colorHeaderBg,
    });

    let currentX = margin + 12;

    // Logo à esquerda
    if (clinicLogoImg) {
      try {
        const logoMaxW = 85;
        const logoMaxH = 46;
        let lW = clinicLogoImg.width;
        let lH = clinicLogoImg.height;
        const ratio = Math.min(logoMaxW / lW, logoMaxH / lH);
        lW = lW * ratio;
        lH = lH * ratio;
        const logoY = headerY + (headerHeight - lH) / 2;

        targetPage.drawImage(clinicLogoImg, {
          x: currentX,
          y: logoY,
          width: lW,
          height: lH,
        });
        currentX += lW + 12;
      } catch (err) {
        console.warn('Erro renderizando imagem de logo no header:', err);
      }
    }

    // Centro: Identificação profissional e clínica
    const centerTitle = data.clinicName || data.veterinarioNome;
    targetPage.drawText(centerTitle, {
      x: currentX,
      y: headerY + 44,
      size: 11,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // CRMV e MAPA (se houver)
    const profLines: string[] = [];
    if (data.veterinarioCrmv) {
      profLines.push(`CRMV: ${data.veterinarioCrmv}`);
    }
    if (data.registroMapa) {
      profLines.push(`Registro MAPA: ${data.registroMapa}`);
    }
    if (profLines.length > 0) {
      targetPage.drawText(profLines.join('  •  '), {
        x: currentX,
        y: headerY + 30,
        size: 8,
        font: fontRegular,
        color: rgb(0.9, 0.95, 0.95),
      });
    }

    // Endereço (se houver)
    if (data.clinicAddress) {
      const addressLines = wrapText(data.clinicAddress, 48);
      targetPage.drawText(addressLines[0] || '', {
        x: currentX,
        y: headerY + 16,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.85, 0.9, 0.9),
      });
    }

    // Direita: Contato e CNPJ (nunca exibir "Não informado")
    const rightParts: string[] = [];
    if (data.clinicPhone) rightParts.push(`Tel: ${data.clinicPhone}`);
    if (data.clinicEmail) rightParts.push(data.clinicEmail);
    if (data.clinicCnpj) rightParts.push(`CNPJ: ${data.clinicCnpj}`);

    let rY = headerY + 44;
    for (const p of rightParts) {
      const pWidth = fontRegular.widthOfTextAtSize(p, 7.5);
      targetPage.drawText(p, {
        x: margin + contentWidth - pWidth - 12,
        y: rY,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.9, 0.95, 0.95),
      });
      rY -= 13;
    }

    return headerY;
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PÁGINA 1
  // ──────────────────────────────────────────────────────────────────────────
  let page1 = doc.addPage([pageWidth, pageHeight]);
  let curY = drawHeaderBlock(page1);

  curY -= 14;

  // 2. Linha de Título: Tipo do documento à esquerda, data de emissão à direita
  const tipoDocNome =
    subtipo === 'controle_especial'
      ? 'RECEITUÁRIO DE CONTROLE ESPECIAL'
      : subtipo === 'antimicrobiano'
      ? 'RECEITUÁRIO DE ANTIMICROBIANOS'
      : subtipo === 'magistral'
      ? 'RECEITUÁRIO DE MANIPULAÇÃO MAGISTRAL'
      : 'RECEITUÁRIO MÉDICO-VETERINÁRIO';

  page1.drawText(tipoDocNome, {
    x: margin,
    y: curY,
    size: 8.5,
    font: fontBold,
    color: rgb(primaryClinic.r, primaryClinic.g, primaryClinic.b),
  });

  const textoDataExtenso = formatDataExtensoPtBR(data.dataEmissao || new Date());
  const dataExtensoWidth = fontRegular.widthOfTextAtSize(textoDataExtenso, 8);
  page1.drawText(textoDataExtenso, {
    x: margin + contentWidth - dataExtensoWidth,
    y: curY,
    size: 8,
    font: fontRegular,
    color: textMuted,
  });

  curY -= 14;

  // 3. Dois quadros lado a lado: PACIENTE / ANIMAL e RESPONSÁVEL LEGAL
  const boxH = 56;
  const colW = (contentWidth - 12) / 2;

  // Quadro Paciente
  page1.drawRectangle({
    x: margin,
    y: curY - boxH,
    width: colW,
    height: boxH,
    color: bgBox,
    borderColor: borderLight,
    borderWidth: 1,
  });

  page1.drawText('PACIENTE / ANIMAL', {
    x: margin + 10,
    y: curY - 14,
    size: 7,
    font: fontBold,
    color: textMuted,
  });

  page1.drawText(data.pacienteNome || 'Não especificado', {
    x: margin + 10,
    y: curY - 27,
    size: 9.5,
    font: fontBold,
    color: textDark,
  });

  // Linhas de detalhes do animal
  const detalhesAnimal1 = [
    data.pacienteEspecie,
    data.pacienteRaca,
    data.pacienteSexo ? `Sexo: ${data.pacienteSexo}` : null,
  ].filter(Boolean).join(' • ');

  const idadeStr = formatIdadeCalculada(data.pacienteIdade);
  const pesoStr = data.pacientePeso
    ? `${data.pacientePeso} kg${data.pacienteDataPeso ? ` (em ${data.pacienteDataPeso})` : ''}`
    : null;
  const detalhesAnimal2 = [idadeStr, pesoStr].filter(Boolean).join(' • ');

  if (detalhesAnimal1) {
    page1.drawText(detalhesAnimal1, {
      x: margin + 10,
      y: curY - 39,
      size: 7.5,
      font: fontRegular,
      color: textMuted,
    });
  }
  if (detalhesAnimal2) {
    page1.drawText(detalhesAnimal2, {
      x: margin + 10,
      y: curY - 50,
      size: 7.5,
      font: fontRegular,
      color: textMuted,
    });
  }

  // Quadro Tutor / Responsável Legal
  const tutorX = margin + colW + 12;
  page1.drawRectangle({
    x: tutorX,
    y: curY - boxH,
    width: colW,
    height: boxH,
    color: bgBox,
    borderColor: borderLight,
    borderWidth: 1,
  });

  page1.drawText('RESPONSÁVEL LEGAL / TUTOR', {
    x: tutorX + 10,
    y: curY - 14,
    size: 7,
    font: fontBold,
    color: textMuted,
  });

  page1.drawText(data.tutorNome || 'Não informado', {
    x: tutorX + 10,
    y: curY - 27,
    size: 9.5,
    font: fontBold,
    color: textDark,
  });

  const tutorParts = [
    data.tutorCpf ? `CPF: ${mascararCpf(data.tutorCpf)}` : null,
    data.tutorTelefone ? `Contato: ${data.tutorTelefone}` : null,
  ].filter(Boolean).join(' • ');

  if (tutorParts) {
    page1.drawText(tutorParts, {
      x: tutorX + 10,
      y: curY - 39,
      size: 7.5,
      font: fontRegular,
      color: textMuted,
    });
  }

  if (data.tutorEndereco) {
    const tutorEndLines = wrapText(data.tutorEndereco, 42);
    page1.drawText(tutorEndLines[0] || '', {
      x: tutorX + 10,
      y: curY - 50,
      size: 7.5,
      font: fontRegular,
      color: textMuted,
    });
  }

  curY -= (boxH + 16);

  // 4. Título central sublinhado + "Uso veterinário"
  const titleW = fontBold.widthOfTextAtSize(tituloCentral, 12);
  const titleX = margin + (contentWidth - titleW) / 2;

  page1.drawText(tituloCentral, {
    x: titleX,
    y: curY,
    size: 12,
    font: fontBold,
    color: textDark,
  });

  // Linha sublinhada elegante
  page1.drawLine({
    start: { x: titleX, y: curY - 3 },
    end: { x: titleX + titleW, y: curY - 3 },
    thickness: 1.2,
    color: rgb(primaryClinic.r, primaryClinic.g, primaryClinic.b),
  });

  curY -= 15;

  const subUso = 'Uso veterinário';
  const subUsoW = fontOblique.widthOfTextAtSize(subUso, 8.5);
  page1.drawText(subUso, {
    x: margin + (contentWidth - subUsoW) / 2,
    y: curY,
    size: 8.5,
    font: fontOblique,
    color: textMuted,
  });

  curY -= 14;

  // Alerta de Notificação SIPEAGRO (se aplicável)
  if (data.isControlado && data.numeroNotificacaoSipeagro) {
    const alertH = 22;
    page1.drawRectangle({
      x: margin,
      y: curY - alertH,
      width: contentWidth,
      height: alertH,
      color: rgb(0.95, 0.96, 1.0),
      borderColor: rgb(0.75, 0.8, 0.98),
      borderWidth: 1,
    });

    page1.drawText(`NOTIFICAÇÃO DE RECEITA SIPEAGRO / MAPA Nº: ${data.numeroNotificacaoSipeagro}`, {
      x: margin + 12,
      y: curY - 15,
      size: 8,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.7),
    });
    curY -= (alertH + 12);
  }

  // Linha divisória fina
  page1.drawLine({
    start: { x: margin, y: curY },
    end: { x: margin + contentWidth, y: curY },
    thickness: 0.8,
    color: borderLight,
  });

  curY -= 14;

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Itens da Prescrição e 6. Orientações
  // Suporte a multi-página inteligente (máximo 2 páginas)
  // ──────────────────────────────────────────────────────────────────────────
  const bottomBlocksHeight = 230; // Altura estimada necessária para os blocos 7 a 11
  let activePage = page1;
  let pageCount = 1;

  // Processar itens
  let page2: any = null;
  const itensPrescritos: PrescricaoItemData[] =
    data.itens && data.itens.length > 0
      ? data.itens
      : (data.conteudoClinico || '')
          .split('\n\n')
          .filter(t => t.trim().length > 0)
          .map((bloco, idx) => {
            const lines = bloco.split('\n');
            return {
              produto: lines[0] || `Item ${idx + 1}`,
              quantidade: '',
              posologia: lines.slice(1).join('\n') || '',
            };
          });

  // Desenhar título dos itens
  activePage.drawText('MEDICAMENTOS PRESCRITOS', {
    x: margin,
    y: curY,
    size: 8,
    font: fontBold,
    color: rgb(primaryClinic.r, primaryClinic.g, primaryClinic.b),
  });

  curY -= 14;

  for (let i = 0; i < itensPrescritos.length; i++) {
    const item = itensPrescritos[i];
    // Se o espaço na página 1 estiver quase no limite para caber os blocos finais,
    // quebramos para a página 2
    if (pageCount === 1 && curY - 50 < margin + bottomBlocksHeight) {
      // Criar página 2
      page2 = doc.addPage([pageWidth, pageHeight]);
      activePage = page2;
      pageCount = 2;
      curY = drawHeaderBlock(page2) - 18;

      activePage.drawText('MEDICAMENTOS PRESCRITOS (continuação)', {
        x: margin,
        y: curY,
        size: 8,
        font: fontBold,
        color: rgb(primaryClinic.r, primaryClinic.g, primaryClinic.b),
      });
      curY -= 14;
    }

    // Linha do Item em Negrito
    let linhaTitulo = `${i + 1}. ${item.produto}`;
    if (item.concentracao) linhaTitulo += ` ${item.concentracao}`;
    if (item.quantidadeExtenso) {
      linhaTitulo += ` — ${item.quantidadeExtenso}`;
    } else if (item.quantidade) {
      linhaTitulo += ` — ${item.quantidade} ${item.unidade || 'unidade(s)'}`;
    }

    activePage.drawText(linhaTitulo, {
      x: margin + 6,
      y: curY,
      size: 9,
      font: fontBold,
      color: textDark,
    });

    curY -= 13;

    // Linha da Posologia
    const posologiaLines = wrapText(item.posologia || 'Conforme orientação veterinária.', 85);
    for (const pl of posologiaLines) {
      activePage.drawText(pl, {
        x: margin + 18,
        y: curY,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.18, 0.22, 0.3),
      });
      curY -= 12;
    }

    curY -= 6; // Espaço entre itens
  }

  // 6. Orientações (se houver)
  const orientacoesList: string[] = Array.isArray(data.orientacoes)
    ? data.orientacoes
    : data.orientacoes
    ? [data.orientacoes]
    : [];

  if (orientacoesList.length > 0) {
    if (pageCount === 1 && curY - (orientacoesList.length * 14 + 30) < margin + bottomBlocksHeight) {
      page2 = doc.addPage([pageWidth, pageHeight]);
      activePage = page2;
      pageCount = 2;
      curY = drawHeaderBlock(page2) - 18;
    }

    curY -= 6;
    activePage.drawText('ORIENTAÇÕES GERAIS', {
      x: margin,
      y: curY,
      size: 8,
      font: fontBold,
      color: rgb(primaryClinic.r, primaryClinic.g, primaryClinic.b),
    });
    curY -= 13;

    for (const ori of orientacoesList) {
      const oriLines = wrapText(ori, 84);
      for (let oi = 0; oi < oriLines.length; oi++) {
        const prefix = oi === 0 ? '• ' : '  ';
        activePage.drawText(`${prefix}${oriLines[oi]}`, {
          x: margin + 6,
          y: curY,
          size: 8,
          font: fontRegular,
          color: rgb(0.2, 0.25, 0.32),
        });
        curY -= 11;
      }
    }
  }

  // Garantir que os blocos de assinatura e dispensação caibam perfeitamente
  // Se ainda estiver na página 1 mas o espaço restante for inferior a bottomBlocksHeight,
  // cria a página 2 para acomodar os blocos finais.
  if (pageCount === 1 && curY < margin + bottomBlocksHeight) {
    page2 = doc.addPage([pageWidth, pageHeight]);
    activePage = page2;
    pageCount = 2;
    curY = drawHeaderBlock(page2) - 20;
  }

  // Posicionamento ancorado para o rodapé final
  curY = Math.max(curY - 12, margin + bottomBlocksHeight);

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Quadros Lado a Lado: IDENTIFICAÇÃO DO PRESCRITOR e OBSERVAÇÕES
  // ──────────────────────────────────────────────────────────────────────────
  const prescritorBoxH = 60;
  const bottomColW = (contentWidth - 12) / 2;
  const prescritorY = curY - prescritorBoxH;

  // Box 7A: Identificação do Prescritor
  activePage.drawRectangle({
    x: margin,
    y: prescritorY,
    width: bottomColW,
    height: prescritorBoxH,
    color: bgBox,
    borderColor: borderLight,
    borderWidth: 1,
  });

  activePage.drawText('IDENTIFICAÇÃO DO PRESCRITOR / EMITENTE', {
    x: margin + 8,
    y: prescritorY + prescritorBoxH - 12,
    size: 6.5,
    font: fontBold,
    color: textMuted,
  });

  activePage.drawText(data.veterinarioNome, {
    x: margin + 8,
    y: prescritorY + prescritorBoxH - 24,
    size: 8.5,
    font: fontBold,
    color: textDark,
  });

  // Detalhes do profissional (CRMV, MAPA, CPF conforme configuração)
  let vetCpfTexto = '';
  if (data.cpfPrescritorModo === 'completo' && data.veterinarioCpf) {
    vetCpfTexto = `CPF: ${data.veterinarioCpf}`;
  } else if (data.cpfPrescritorModo === 'mascarado' && data.veterinarioCpf) {
    vetCpfTexto = `CPF: ${mascararCpf(data.veterinarioCpf)}`;
  } // 'ocultar' por padrão

  const vetInfo1 = [
    `CRMV: ${data.veterinarioCrmv}`,
    data.registroMapa ? `MAPA: ${data.registroMapa}` : null,
    vetCpfTexto || null,
  ].filter(Boolean).join('  •  ');

  activePage.drawText(vetInfo1, {
    x: margin + 8,
    y: prescritorY + prescritorBoxH - 36,
    size: 7,
    font: fontRegular,
    color: textMuted,
  });

  const vetInfo2 = [
    data.veterinarioEndereco || data.clinicAddress,
    data.veterinarioTelefone || data.clinicPhone,
  ].filter(Boolean).join('  •  ');

  if (vetInfo2) {
    const endWrap = wrapText(vetInfo2, 44);
    activePage.drawText(endWrap[0] || '', {
      x: margin + 8,
      y: prescritorY + prescritorBoxH - 48,
      size: 7,
      font: fontRegular,
      color: textMuted,
    });
  }

  // Box 7B: Observações ao Responsável Legal
  const obsX = margin + bottomColW + 12;
  activePage.drawRectangle({
    x: obsX,
    y: prescritorY,
    width: bottomColW,
    height: prescritorBoxH,
    color: bgBox,
    borderColor: borderLight,
    borderWidth: 1,
  });

  activePage.drawText('OBSERVAÇÕES AO RESPONSÁVEL LEGAL', {
    x: obsX + 8,
    y: prescritorY + prescritorBoxH - 12,
    size: 6.5,
    font: fontBold,
    color: textMuted,
  });

  const obsTexto =
    data.observacoesResponsavel ||
    'Receita médico-veterinária com validade legal em todo o território nacional. Manter fora do alcance de crianças e animais.';
  const obsLines = wrapText(obsTexto, 45).slice(0, 3);
  let obsY = prescritorY + prescritorBoxH - 24;
  for (const ol of obsLines) {
    activePage.drawText(ol, {
      x: obsX + 8,
      y: obsY,
      size: 7,
      font: fontRegular,
      color: rgb(0.25, 0.3, 0.38),
    });
    obsY -= 11;
  }

  curY = prescritorY - 10;

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Quadro DISPENSAÇÃO EM FARMÁCIA (com QR Code >= 25mm e link anotado)
  // ──────────────────────────────────────────────────────────────────────────
  const dispensaBoxH = 80;
  const dispensaY = curY - dispensaBoxH;

  activePage.drawRectangle({
    x: margin,
    y: dispensaY,
    width: contentWidth,
    height: dispensaBoxH,
    color: rgb(0.97, 1.0, 0.99),
    borderColor: rgb(0.2, 0.75, 0.65),
    borderWidth: 1.2,
  });

  // QR Code de Dispensação à esquerda (76 pt = ~26.8 mm)
  if (qrDispensaImg) {
    activePage.drawImage(qrDispensaImg, {
      x: margin + 8,
      y: dispensaY + (dispensaBoxH - qrSizePt) / 2 + 3,
      width: qrSizePt - 6,
      height: qrSizePt - 6,
    });
    // Link interativo clicável no QR Code
    addClickableLink(activePage, margin + 8, dispensaY + (dispensaBoxH - qrSizePt) / 2 + 3, qrSizePt - 6, qrSizePt - 6, dispensationUrl);

    activePage.drawText('Dispensação em farmácia', {
      x: margin + 7,
      y: dispensaY + 5,
      size: 5.8,
      font: fontBold,
      color: rgb(primaryClinic.r, primaryClinic.g, primaryClinic.b),
    });
  }

  // Textos de instrução à direita do QR Code
  const dispTextX = margin + qrSizePt + 14;

  activePage.drawText('DISPENSAÇÃO EM FARMÁCIA', {
    x: dispTextX,
    y: dispensaY + dispensaBoxH - 14,
    size: 7.5,
    font: fontBold,
    color: rgb(primaryClinic.r, primaryClinic.g, primaryClinic.b),
  });

  activePage.drawText(`Para dispensação em farmácia, peça ao farmacêutico que acesse ${domain.replace(/^https?:\/\//, '')}/farmacia`, {
    x: dispTextX,
    y: dispensaY + dispensaBoxH - 26,
    size: 7.5,
    font: fontRegular,
    color: textDark,
  });

  // Token destacado em Monoespaçado
  activePage.drawText('TOKEN: ', {
    x: dispTextX,
    y: dispensaY + dispensaBoxH - 42,
    size: 11,
    font: fontBold,
    color: textDark,
  });

  activePage.drawText(data.tokenDispensacao, {
    x: dispTextX + 52,
    y: dispensaY + dispensaBoxH - 42,
    size: 12,
    font: fontMono,
    color: rgb(primaryClinic.r, primaryClinic.g, primaryClinic.b),
  });

  // Validade da receita
  const validadeTexto = `Válida até ${data.validadeAte || '—'} (${data.validadeDias || 30} dias)`;
  activePage.drawText(validadeTexto, {
    x: dispTextX,
    y: dispensaY + dispensaBoxH - 57,
    size: 8,
    font: fontBold,
    color: textMuted,
  });

  // Rodapé do quadro de dispensação
  const msgFarmaceutico = `Farmacêutico: escaneie o QR Code ao lado ou acesse ${dispensationUrl}`;
  activePage.drawText(msgFarmaceutico, {
    x: dispTextX,
    y: dispensaY + 8,
    size: 6.5,
    font: fontRegular,
    color: textMuted,
  });
  // Anotação clicável na URL de texto
  addClickableLink(activePage, dispTextX, dispensaY + 6, fontRegular.widthOfTextAtSize(msgFarmaceutico, 6.5), 10, dispensationUrl);

  curY = dispensaY - 8;

  // ──────────────────────────────────────────────────────────────────────────
  // 9 e 10. Quadros Lado a Lado: ASSINATURA DO PRESCRITOR e ASSINATURA ICP-BRASIL
  // ──────────────────────────────────────────────────────────────────────────
  const sealBoxH = 68;
  const sealY = curY - sealBoxH;

  // Quadro 9: ASSINATURA DO PRESCRITOR (Eletrônica)
  activePage.drawRectangle({
    x: margin,
    y: sealY,
    width: bottomColW,
    height: sealBoxH,
    color: bgBox,
    borderColor: borderLight,
    borderWidth: 1,
  });

  // Ícone de Verificação Gráfico
  activePage.drawCircle({
    x: margin + 18,
    y: sealY + sealBoxH - 18,
    size: 8,
    color: rgb(0.1, 0.65, 0.55),
  });
  activePage.drawText('✓', {
    x: margin + 14.5,
    y: sealY + sealBoxH - 22,
    size: 10,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  activePage.drawText('ASSINATURA DO PRESCRITOR', {
    x: margin + 32,
    y: sealY + sealBoxH - 16,
    size: 7,
    font: fontBold,
    color: textDark,
  });

  activePage.drawText('Este documento foi emitido eletronicamente.', {
    x: margin + 12,
    y: sealY + sealBoxH - 32,
    size: 7.5,
    font: fontRegular,
    color: textDark,
  });

  const formattedEmitDate = new Date(data.dataEmissao || Date.now()).toLocaleDateString('pt-BR');
  const emitidoTxt = `Emitido em ${formattedEmitDate} por ${data.veterinarioNome}`;
  activePage.drawText(wrapText(emitidoTxt, 36)[0] || '', {
    x: margin + 12,
    y: sealY + sealBoxH - 44,
    size: 7,
    font: fontRegular,
    color: textMuted,
  });

  activePage.drawText(`CRMV: ${data.veterinarioCrmv}`, {
    x: margin + 12,
    y: sealY + sealBoxH - 56,
    size: 7,
    font: fontBold,
    color: rgb(primaryClinic.r, primaryClinic.g, primaryClinic.b),
  });

  // Quadro 10: ASSINATURA QUALIFICADA ICP-BRASIL (com QR Code >= 25mm e link anotado)
  const icpBoxX = margin + bottomColW + 12;
  activePage.drawRectangle({
    x: icpBoxX,
    y: sealY,
    width: bottomColW,
    height: sealBoxH,
    color: rgb(0.97, 0.99, 1.0),
    borderColor: rgb(0.18, 0.45, 0.8),
    borderWidth: 1.1,
  });

  // QR Code do ITI à esquerda
  const qrItiSize = 52;
  if (qrItiImg) {
    activePage.drawImage(qrItiImg, {
      x: icpBoxX + 6,
      y: sealY + (sealBoxH - qrItiSize) / 2 + 4,
      width: qrItiSize,
      height: qrItiSize,
    });
    // Link interativo clicável apontando para validar.iti.gov.br
    addClickableLink(activePage, icpBoxX + 6, sealY + (sealBoxH - qrItiSize) / 2 + 4, qrItiSize, qrItiSize, itiUrl);

    activePage.drawText('Escaneie e envie o PDF', {
      x: icpBoxX + 4,
      y: sealY + 4,
      size: 5.2,
      font: fontBold,
      color: rgb(0.12, 0.35, 0.7),
    });
  }

  const icpTextX = icpBoxX + qrItiSize + 12;

  activePage.drawText('CERTIFICAÇÃO ICP-BRASIL', {
    x: icpTextX,
    y: sealY + sealBoxH - 14,
    size: 7,
    font: fontBold,
    color: rgb(0.12, 0.35, 0.7),
  });

  if (data.status === 'assinada' && data.assinaturaInfo) {
    activePage.drawText('Assinatura Qualificada Válida', {
      x: icpTextX,
      y: sealY + sealBoxH - 24,
      size: 6.8,
      font: fontBold,
      color: rgb(0.08, 0.55, 0.3),
    });

    activePage.drawText(`Titular: ${data.assinaturaInfo.titular}`, {
      x: icpTextX,
      y: sealY + sealBoxH - 34,
      size: 6.2,
      font: fontRegular,
      color: textDark,
    });

    activePage.drawText(`CPF: ${data.assinaturaInfo.cpfMascarado || '—'}`, {
      x: icpTextX,
      y: sealY + sealBoxH - 43,
      size: 6.2,
      font: fontRegular,
      color: textMuted,
    });

    activePage.drawText(`AC: ${wrapText(data.assinaturaInfo.emissorAC || 'ICP-Brasil', 22)[0]}`, {
      x: icpTextX,
      y: sealY + sealBoxH - 52,
      size: 5.8,
      font: fontRegular,
      color: textMuted,
    });

    const itiLinkText = 'validar.iti.gov.br';
    activePage.drawText(itiLinkText, {
      x: icpTextX,
      y: sealY + sealBoxH - 62,
      size: 6.5,
      font: fontBold,
      color: rgb(0.12, 0.35, 0.7),
    });
    addClickableLink(activePage, icpTextX, sealY + sealBoxH - 64, 70, 10, itiUrl);
  } else {
    activePage.drawText('Aguardando Assinatura ICP', {
      x: icpTextX,
      y: sealY + sealBoxH - 25,
      size: 6.8,
      font: fontBold,
      color: rgb(0.7, 0.45, 0.1),
    });

    activePage.drawText('Assine via PAdES no app do PSC', {
      x: icpTextX,
      y: sealY + sealBoxH - 37,
      size: 6.2,
      font: fontRegular,
      color: textDark,
    });

    activePage.drawText('(SafeID, BirdID, NeoID, etc.)', {
      x: icpTextX,
      y: sealY + sealBoxH - 47,
      size: 6,
      font: fontRegular,
      color: textMuted,
    });

    const itiLinkText = 'Confira em validar.iti.gov.br';
    activePage.drawText(itiLinkText, {
      x: icpTextX,
      y: sealY + sealBoxH - 59,
      size: 6.2,
      font: fontBold,
      color: rgb(0.12, 0.35, 0.7),
    });
    addClickableLink(activePage, icpTextX, sealY + sealBoxH - 61, 95, 10, itiUrl);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 11. Rodapé Final
  // ──────────────────────────────────────────────────────────────────────────
  const footerY = margin + 8;
  const slogan = data.clinicSlogan || 'ClinicOS • Gestão Clínica Veterinária e Receituário Digital Seguro';

  activePage.drawText(slogan, {
    x: margin,
    y: footerY,
    size: 6.5,
    font: fontRegular,
    color: rgb(0.55, 0.6, 0.68),
  });

  const pageNumText = pageCount === 2 ? `Página 2 de 2` : `Página 1 de 1`;
  const pageNumW = fontRegular.widthOfTextAtSize(pageNumText, 6.5);
  activePage.drawText(pageNumText, {
    x: margin + contentWidth - pageNumW,
    y: footerY,
    size: 6.5,
    font: fontRegular,
    color: rgb(0.55, 0.6, 0.68),
  });

  if (pageCount === 2) {
    page1.drawText(`Página 1 de 2`, {
      x: margin + contentWidth - fontRegular.widthOfTextAtSize('Página 1 de 2', 6.5),
      y: footerY,
      size: 6.5,
      font: fontRegular,
      color: rgb(0.55, 0.6, 0.68),
    });
  }

  // Salvar bytes finais do PDF
  // Sem object streams: mantém a tabela xref clássica, exigida para acrescentar a assinatura
  // como atualização incremental (os bytes originais ficam intactos no início do arquivo).
  const pdfBytes = await doc.save({ useObjectStreams: false });
  const originalSize = pdfBytes.length;
  const originalHashSha256 = await computeSha256(pdfBytes);
  const fileName = getReceitaFileName(data.pacienteNome, data.dataEmissao, data.status === 'assinada');

  return {
    pdfBytes,
    originalSize,
    originalHashSha256,
    dispensationUrl,
    verificationUrl,
    fileName,
  };
}
