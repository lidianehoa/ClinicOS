import * as admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

const ALFABETO_DISPENSACAO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface DispensarItemInput {
  index: number;
  quantidade: number;
  lote?: string;
}

export interface DispensarPayload {
  token: string;
  farmaceuticoNome: string;
  farmaceuticoCrf: string;
  farmaceuticoCrfUf: string;
  farmaciaNome: string;
  farmaciaCnpj: string;
  itens: DispensarItemInput[];
  declaracaoConferida: boolean;
  observacoes?: string;
}

/**
 * Validação de Rate Limiting por IP (10 requisições / minuto)
 */
export async function checkRateLimit(ip: string = 'unknown_ip'): Promise<void> {
  const cleanIp = ip.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 64) || 'unknown';
  const db = getFirestore();
  const rateLimitRef = db.collection('rate_limits_farmacia').doc(cleanIp);

  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minuto
  const maxRequests = 10;

  try {
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(rateLimitRef);
      if (!snap.exists) {
        transaction.set(rateLimitRef, {
          count: 1,
          resetAt: now + windowMs,
          updatedAt: new Date().toISOString(),
        });
        return;
      }

      const data = snap.data()!;
      const resetAt = data.resetAt || (now + windowMs);

      if (now > resetAt) {
        transaction.set(rateLimitRef, {
          count: 1,
          resetAt: now + windowMs,
          updatedAt: new Date().toISOString(),
        });
      } else {
        if (data.count >= maxRequests) {
          throw new HttpsError(
            'resource-exhausted',
            'Muitas tentativas, aguarde 1 minuto.'
          );
        }
        transaction.update(rateLimitRef, {
          count: FieldValue.increment(1),
          updatedAt: new Date().toISOString(),
        });
      }
    });
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    // Falha fechada: se não for possível conferir o limite, a consulta é recusada.
    console.error('Erro ao verificar rate limit (requisição recusada):', err);
    throw new HttpsError('unavailable', 'Serviço temporariamente indisponível. Tente novamente em instantes.');
  }
}

/**
 * Registra log de auditoria do Portal da Farmácia
 */
export async function logAuditoriaFarmacia(data: {
  token: string;
  ip: string;
  acao: 'consulta_sucesso' | 'consulta_invalida' | 'dispensacao_sucesso' | 'dispensacao_falha';
  crf?: string;
  cnpj?: string;
  detalhes?: any;
}) {
  try {
    const db = getFirestore();
    await db.collection('auditoria_farmacia').add({
      ...data,
      data: new Date().toISOString(),
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('Falha ao gravar auditoria da farmácia:', err);
  }
}

/**
 * Valida formato do Token (DDMMAAAA-XXXXXX)
 */
function isValidTokenFormat(token?: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const clean = token.trim().toUpperCase();
  if (!/^\d{8}-[A-Z0-9]{6}$/.test(clean)) return false;
  const chars = clean.split('-')[1];
  for (const c of chars) {
    if (!ALFABETO_DISPENSACAO.includes(c)) return false;
  }
  return true;
}

/**
 * Mascara CPF para LGPD (ex: ***.456.789-**)
 */
function maskCpf(cpf?: string): string {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '***.***.***-**';
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

/**
 * Consulta de Receita para o Portal da Farmácia
 */
export async function processarConsultaFarmacia(ip: string, tokenParam: string) {
  await checkRateLimit(ip);

  const cleanToken = (tokenParam || '').trim().toUpperCase();

  if (!isValidTokenFormat(cleanToken)) {
    await logAuditoriaFarmacia({
      token: cleanToken || 'invalido',
      ip,
      acao: 'consulta_invalida',
      detalhes: 'Formato de token incorreto',
    });
    throw new HttpsError('not-found', 'Receita não encontrada.');
  }

  const db = getFirestore();
  const tokenDoc = await db.collection('tokens_receita').doc(cleanToken).get();

  if (!tokenDoc.exists) {
    await logAuditoriaFarmacia({
      token: cleanToken,
      ip,
      acao: 'consulta_invalida',
      detalhes: 'Token inexistente',
    });
    throw new HttpsError('not-found', 'Receita não encontrada.');
  }

  const tokenData = tokenDoc.data()!;
  const tenantId = tokenData.tenantId;
  const receitaId = tokenData.receitaId;

  const receitaDoc = await db
    .collection('clinicas')
    .doc(tenantId)
    .collection('receitas')
    .doc(receitaId)
    .get();

  if (!receitaDoc.exists) {
    await logAuditoriaFarmacia({
      token: cleanToken,
      ip,
      acao: 'consulta_invalida',
      detalhes: 'Documento da receita não encontrado no tenant',
    });
    throw new HttpsError('not-found', 'Receita não encontrada.');
  }

  const receita = receitaDoc.data()!;

  // Validação de Vencimento
  let isExpirada = false;
  if (receita.validadeAte) {
    const parts = receita.validadeAte.split('/');
    if (parts.length === 3) {
      const dataValidade = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), 23, 59, 59);
      if (Date.now() > dataValidade.getTime()) {
        isExpirada = true;
      }
    }
  }

  // Validação de Exigência de Assinatura Qualificada ICP-Brasil
  const subtipo = receita.subtipo || (receita.tipo === 'receita_manipulada' ? 'magistral' : 'simples');
  const exigeAssinaturaIcp = ['controle_especial', 'antimicrobiano', 'magistral'].includes(subtipo);
  const isAssinada = receita.status === 'assinada' && !!receita.assinatura;

  let dispensavel = true;
  let motivoBloqueio: string | null = null;

  if (receita.status === 'cancelada') {
    dispensavel = false;
    motivoBloqueio = 'Esta receita foi cancelada pelo médico veterinário prescritor.';
  } else if (receita.status === 'substituida') {
    dispensavel = false;
    motivoBloqueio = 'Esta receita foi substituída por uma nova versão e perdeu sua validade.';
  } else if (isExpirada) {
    dispensavel = false;
    motivoBloqueio = 'O prazo de validade desta receita expirou.';
  } else if (exigeAssinaturaIcp && !isAssinada) {
    dispensavel = false;
    motivoBloqueio = 'Esta receita requer assinatura digital qualificada ICP-Brasil para dispensação.';
  } else if (receita.statusDispensacao === 'dispensada') {
    dispensavel = false;
    motivoBloqueio = 'Todos os medicamentos desta receita já foram totalmente dispensados.';
  }

  // Montar itens estruturados com saldo
  const rawItens = Array.isArray(receita.itens) ? receita.itens : [];
  const itens = rawItens.map((item: any, idx: number) => {
    const qtdPrescrita = Number(item.quantidade) || 0;
    const qtdDispensada = Number(item.quantidadeDispensada) || 0;
    const saldoRestante = typeof item.saldoRestante === 'number'
      ? item.saldoRestante
      : Math.max(0, qtdPrescrita - qtdDispensada);

    return {
      index: idx,
      produto: item.produto || `Item ${idx + 1}`,
      concentracao: item.concentracao || '',
      quantidadePrescrita: qtdPrescrita,
      quantidadeExtenso: item.quantidadeExtenso || '',
      unidade: item.unidade || 'unidade(s)',
      posologia: item.posologia || '',
      quantidadeDispensada: qtdDispensada,
      saldoRestante,
      dispensadoTotalmente: saldoRestante <= 0,
    };
  });

  // Gravar log de sucesso da consulta
  await logAuditoriaFarmacia({
    token: cleanToken,
    ip,
    acao: 'consulta_sucesso',
  });

  // Retornar dados higienizados para o Portal da Farmácia (LGPD estrita)
  return {
    success: true,
    token: cleanToken,
    subtipo,
    status: receita.status,
    statusDispensacao: receita.statusDispensacao || 'nao_dispensada',
    dispensavel,
    motivoBloqueio,
    dataEmissao: receita.criadoEm,
    validadeAte: receita.validadeAte,
    validadeDias: receita.validadeDias || 30,
    isControlado: !!receita.isControlado,
    numeroNotificacaoSipeagro: receita.numeroNotificacaoSipeagro || null,
    prescritor: {
      nome: receita.veterinarioNome,
      crmv: receita.veterinarioCrmv,
      registroMapa: receita.registroMapa || null,
      clinicaNome: receita.clinicaNome || null,
    },
    paciente: {
      nome: receita.pacienteNome,
      especie: receita.pacienteEspecie || null,
      raca: receita.pacienteRaca || null,
      sexo: receita.pacienteSexo || null,
      idade: receita.pacienteIdade || null,
      peso: receita.pacientePeso || null,
    },
    tutor: {
      nome: receita.tutorNome,
      cpfMascarado: maskCpf(receita.tutorCpf),
    },
    itens,
    orientacoes: Array.isArray(receita.orientacoes) ? receita.orientacoes : [],
    observacoesResponsavel: receita.observacoesResponsavel || null,
    assinatura: isAssinada
      ? {
          isAssinada: true,
          titular: receita.assinatura.titular,
          emissorAC: receita.assinatura.emissorAC,
          dataAssinatura: receita.assinatura.em,
          cpfMascarado: receita.assinatura.cpfMascarado,
          pdfUrl: receita.pdfAssinadoUrl || null,
        }
      : {
          isAssinada: false,
          pdfUrl: receita.originalPdfUrl || null,
        },
    dispensacoes: Array.isArray(receita.dispensacoes) ? receita.dispensacoes : [],
  };
}

/**
 * Registro de Dispensação pelo Farmacêutico (Transação Firestore Atômica)
 */
export async function processarDispensacaoFarmacia(ip: string, payload: DispensarPayload) {
  await checkRateLimit(ip);

  const cleanToken = (payload.token || '').trim().toUpperCase();

  if (!isValidTokenFormat(cleanToken)) {
    throw new HttpsError('invalid-argument', 'Token de dispensação inválido.');
  }

  if (!payload.declaracaoConferida) {
    throw new HttpsError(
      'failed-precondition',
      'É obrigatório declarar a conferência da receita e identidade do tutor.'
    );
  }

  if (!payload.farmaceuticoNome || !payload.farmaceuticoCrf || !payload.farmaciaCnpj) {
    throw new HttpsError(
      'invalid-argument',
      'Preencha todos os campos obrigatórios (Nome do farmacêutico, CRF, UF e CNPJ da farmácia).'
    );
  }

  if (!payload.itens || !Array.isArray(payload.itens) || payload.itens.length === 0) {
    throw new HttpsError('invalid-argument', 'Nenhum medicamento informado para dispensação.');
  }

  const db = getFirestore();
  const tokenRef = db.collection('tokens_receita').doc(cleanToken);

  const result = await db.runTransaction(async (transaction) => {
    const tokenSnap = await transaction.get(tokenRef);
    if (!tokenSnap.exists) {
      throw new HttpsError('not-found', 'Receita não encontrada.');
    }

    const tokenData = tokenSnap.data()!;
    const tenantId = tokenData.tenantId;
    const receitaId = tokenData.receitaId;

    const recRef = db.collection('clinicas').doc(tenantId).collection('receitas').doc(receitaId);
    const recSnap = await transaction.get(recRef);
    if (!recSnap.exists) {
      throw new HttpsError('not-found', 'Receita não encontrada.');
    }

    const recData = recSnap.data()!;

    if (recData.status === 'cancelada') {
      throw new HttpsError('failed-precondition', 'Receita cancelada.');
    }
    if (recData.status === 'substituida') {
      throw new HttpsError('failed-precondition', 'Receita substituída por outra versão.');
    }

    // Verificar se já totalmente dispensada
    if (recData.statusDispensacao === 'dispensada') {
      throw new HttpsError('failed-precondition', 'Esta receita já foi totalmente dispensada.');
    }

    // Exigência de assinatura digital ICP
    const subtipo = recData.subtipo || (recData.tipo === 'receita_manipulada' ? 'magistral' : 'simples');
    if (['controle_especial', 'antimicrobiano', 'magistral'].includes(subtipo) && recData.status !== 'assinada') {
      throw new HttpsError('failed-precondition', 'Receita não assinada com certificado digital ICP-Brasil.');
    }

    // Processar itens e verificar saldos
    const currentItens = Array.isArray(recData.itens) ? [...recData.itens] : [];
    let totalDispensadoAgora = 0;
    const itensDispensadosNoAto: any[] = [];

    for (const dispItem of payload.itens) {
      const idx = dispItem.index;
      if (idx < 0 || idx >= currentItens.length) {
        throw new HttpsError('invalid-argument', `Item índice ${idx} não existe na receita.`);
      }

      const itemRef = currentItens[idx];
      const qtdPrescrita = Number(itemRef.quantidade) || 0;
      const qtdJaDispensada = Number(itemRef.quantidadeDispensada) || 0;
      const saldoAtual = typeof itemRef.saldoRestante === 'number'
        ? itemRef.saldoRestante
        : Math.max(0, qtdPrescrita - qtdJaDispensada);

      const qtdADispensar = Number(dispItem.quantidade) || 0;

      if (qtdADispensar < 0) {
        throw new HttpsError('invalid-argument', 'A quantidade informada não pode ser negativa.');
      }

      if (qtdADispensar > 0) {
        if (qtdADispensar > saldoAtual) {
          throw new HttpsError(
            'failed-precondition',
            `Quantidade solicitada (${qtdADispensar}) excede o saldo restante (${saldoAtual}) do medicamento ${itemRef.produto}.`
          );
        }

        const novoSaldo = saldoAtual - qtdADispensar;
        const novaQtdDispensada = qtdJaDispensada + qtdADispensar;

        currentItens[idx] = {
          ...itemRef,
          quantidadeDispensada: novaQtdDispensada,
          saldoRestante: novoSaldo,
          dispensadoTotalmente: novoSaldo <= 0,
        };

        totalDispensadoAgora += qtdADispensar;
        itensDispensadosNoAto.push({
          index: idx,
          produto: itemRef.produto,
          concentracao: itemRef.concentracao || '',
          quantidadeDispensada: qtdADispensar,
          lote: dispItem.lote || '',
          saldoRestanteApos: novoSaldo,
        });
      }
    }

    if (totalDispensadoAgora <= 0) {
      throw new HttpsError('invalid-argument', 'Informe a quantidade de pelo menos um medicamento para dispensar.');
    }

    // Calcular se todos os itens foram zerados
    const todosZerados = currentItens.every((it: any) => {
      const saldo = typeof it.saldoRestante === 'number' ? it.saldoRestante : 0;
      return saldo <= 0;
    });

    const novoStatusDispensacao = todosZerados ? 'dispensada' : 'parcialmente_dispensada';
    const timestampIso = new Date().toISOString();
    const existingDispensacoes = Array.isArray(recData.dispensacoes) ? recData.dispensacoes : [];
    const seqDispensacao = existingDispensacoes.length + 1;
    const protocolo = `DISP-${cleanToken}-${seqDispensacao}`;

    const novoRegistroDispensacao = {
      id: `disp_${Date.now()}_${seqDispensacao}`,
      protocolo,
      data: timestampIso,
      farmaceuticoNome: payload.farmaceuticoNome,
      farmaceuticoCrf: `${payload.farmaceuticoCrf}/${payload.farmaceuticoCrfUf}`,
      farmaciaNome: payload.farmaciaNome,
      farmaciaCnpj: payload.farmaciaCnpj,
      itensDispensados: itensDispensadosNoAto,
      observacoes: payload.observacoes || '',
      declaracaoConferida: true,
      ip,
    };

    // Atualizar documento da receita
    transaction.update(recRef, {
      itens: currentItens,
      statusDispensacao: novoStatusDispensacao,
      dispensacoes: [...existingDispensacoes, novoRegistroDispensacao],
      ultimaDispensacaoEm: timestampIso,
      atualizadoEm: timestampIso,
    });

    // Atualizar documento do token de dispensação
    transaction.update(tokenRef, {
      statusDispensacao: novoStatusDispensacao,
      ultimaDispensacaoEm: timestampIso,
      dispensacoesCount: seqDispensacao,
      atualizadoEm: timestampIso,
    });

    return {
      protocolo,
      novoStatusDispensacao,
      timestampIso,
      itensDispensados: itensDispensadosNoAto,
    };
  });

  // Gravar auditoria
  await logAuditoriaFarmacia({
    token: cleanToken,
    ip,
    acao: 'dispensacao_sucesso',
    crf: `${payload.farmaceuticoCrf}/${payload.farmaceuticoCrfUf}`,
    cnpj: payload.farmaciaCnpj,
    detalhes: {
      protocolo: result.protocolo,
      itens: result.itensDispensados,
      statusFinal: result.novoStatusDispensacao,
    },
  });

  return {
    success: true,
    protocolo: result.protocolo,
    statusDispensacao: result.novoStatusDispensacao,
    dataDispensacao: result.timestampIso,
    itensDispensados: result.itensDispensados,
  };
}

/**
 * Cancelamento de Receita pelo Veterinário / Admin da Clínica
 */
export async function processarCancelamentoReceita(
  uid: string,
  tenantId: string,
  receitaId: string,
  motivo: string
) {
  if (!motivo || !motivo.trim()) {
    throw new HttpsError('invalid-argument', 'O motivo do cancelamento é obrigatório.');
  }

  const db = getFirestore();
  const recRef = db.collection('clinicas').doc(tenantId).collection('receitas').doc(receitaId);
  const recDoc = await recRef.get();

  if (!recDoc.exists) {
    throw new HttpsError('not-found', 'Receita não encontrada.');
  }

  const recData = recDoc.data()!;
  const agoraIso = new Date().toISOString();

  await recRef.update({
    status: 'cancelada',
    statusDispensacao: 'cancelada',
    motivoCancelamento: motivo.trim(),
    canceladoEm: agoraIso,
    canceladoPor: uid,
    atualizadoEm: agoraIso,
  });

  const token = recData.tokenDispensacao;
  if (token) {
    await db.collection('tokens_receita').doc(token).set(
      {
        status: 'cancelada',
        statusDispensacao: 'cancelada',
        motivoCancelamento: motivo.trim(),
        canceladoEm: agoraIso,
        atualizadoEm: agoraIso,
      },
      { merge: true }
    );
  }

  const codVerif = recData.codigoVerificacao;
  if (codVerif) {
    await db.collection('verificacao_receitas').doc(codVerif).set(
      {
        status: 'cancelada',
        motivoCancelamento: motivo.trim(),
        atualizadoEm: agoraIso,
      },
      { merge: true }
    );
  }

  return { success: true, receitaId, canceladoEm: agoraIso };
}
