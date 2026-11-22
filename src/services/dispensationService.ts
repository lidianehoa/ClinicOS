/**
 * Serviço de Token de Dispensação e Formatação da Receita Digital ClinicOS
 *
 * Formato do Token: DDMMAAAA-XXXXXX
 * Onde:
 *  - DDMMAAAA = Data de emissão (ex: 22112026)
 *  - XXXXXX   = 6 caracteres do alfabeto seguro (sem 0, O, 1, I)
 */

// Alfabeto Base32 seguro sem caracteres ambíguos (sem 0, O, 1, I)
export const ALFABETO_DISPENSACAO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type SubtipoReceita = 'simples' | 'controle_especial' | 'antimicrobiano' | 'magistral';

export type StatusDispensacao = 'nao_dispensada' | 'parcialmente_dispensada' | 'dispensada' | 'cancelada';

/**
 * Prazos legais padrão em dias para cada tipo de receita
 */
export const PRAZOS_VALIDADE_PADRAO: Record<SubtipoReceita, number> = {
  simples: 30,
  controle_especial: 30,
  antimicrobiano: 10,
  magistral: 30,
};

/**
 * Gera um token único de dispensação no formato DDMMAAAA-XXXXXX
 */
export function generateDispensationToken(dataReferencia: Date = new Date()): string {
  const d = dataReferencia;
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = String(d.getFullYear());
  const prefixoData = `${dia}${mes}${ano}`;

  let codigo = '';
  // Seis caracteres seguros do alfabeto
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * ALFABETO_DISPENSACAO.length);
    codigo += ALFABETO_DISPENSACAO[idx];
  }

  return `${prefixoData}-${codigo}`;
}

/**
 * Calcula a data de validade de uma receita conforme seu subtipo ou prazo customizado
 */
export function calcularValidadeReceita(
  subtipo: SubtipoReceita,
  dataEmissao: Date | string = new Date(),
  customDias?: number
): { validadeAte: string; validadeDias: number; dataValidade: Date } {
  const emissao = typeof dataEmissao === 'string' ? new Date(dataEmissao) : dataEmissao;
  const dias = customDias && customDias > 0 ? customDias : (PRAZOS_VALIDADE_PADRAO[subtipo] || 30);

  const dataValidade = new Date(emissao.getTime());
  dataValidade.setDate(dataValidade.getDate() + dias);

  const dia = String(dataValidade.getDate()).padStart(2, '0');
  const mes = String(dataValidade.getMonth() + 1).padStart(2, '0');
  const ano = dataValidade.getFullYear();

  return {
    validadeAte: `${dia}/${mes}/${ano}`,
    validadeDias: dias,
    dataValidade
  };
}

/**
 * Formata data em português por extenso: "Emitido em sexta-feira, 22 de novembro de 2026"
 */
export function formatDataExtensoPtBR(data: Date | string = new Date()): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  if (isNaN(d.getTime())) return '';

  const diasSemana = [
    'domingo',
    'segunda-feira',
    'terça-feira',
    'quarta-feira',
    'quinta-feira',
    'sexta-feira',
    'sábado'
  ];

  const meses = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro'
  ];

  const diaSemana = diasSemana[d.getDay()];
  const dia = d.getDate();
  const mes = meses[d.getMonth()];
  const ano = d.getFullYear();

  return `Emitido em ${diaSemana}, ${dia} de ${mes} de ${ano}`;
}

/**
 * Formata idade calculada amigável: "5 anos e 2 meses", "8 meses" ou "1 ano"
 */
export function formatIdadeCalculada(idadeOuNascimento?: string | number): string {
  if (!idadeOuNascimento) return '';

  // Se for número puro (anos)
  if (typeof idadeOuNascimento === 'number') {
    const anos = Math.floor(idadeOuNascimento);
    const meses = Math.round((idadeOuNascimento - anos) * 12);
    if (anos === 0) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
    if (meses === 0) return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
    return `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  }

  // Se for string de data ISO (YYYY-MM-DD)
  const d = new Date(idadeOuNascimento);
  if (!isNaN(d.getTime()) && idadeOuNascimento.includes('-') && idadeOuNascimento.length >= 8) {
    const hoje = new Date();
    let anos = hoje.getFullYear() - d.getFullYear();
    let meses = hoje.getMonth() - d.getMonth();
    if (hoje.getDate() < d.getDate()) {
      meses--;
    }
    if (meses < 0) {
      anos--;
      meses += 12;
    }
    if (anos < 0) return '';
    if (anos === 0 && meses === 0) return 'menos de 1 mês';
    if (anos === 0) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
    if (meses === 0) return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
    return `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  }

  // Se já for string descritiva (ex: "5 anos", "2 meses")
  return String(idadeOuNascimento);
}

/**
 * Título oficial central sublinhado segundo o subtipo da receita
 */
export function getTituloCentralReceita(subtipo: SubtipoReceita): string {
  switch (subtipo) {
    case 'controle_especial':
      return 'RECEITA DE CONTROLE ESPECIAL';
    case 'antimicrobiano':
      return 'RECEITA DE ANTIMICROBIANO';
    case 'magistral':
      return 'PRESCRIÇÃO DE PREPARAÇÃO MAGISTRAL VETERINÁRIA';
    case 'simples':
    default:
      return 'RECEITA';
  }
}

/**
 * Mascara CPF no formato "700.***.***-15"
 */
export function mascararCpf(cpf?: string): string {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9, 11)}`;
}
