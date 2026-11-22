/**
 * Integração VetZap CRM (extensão do Chrome) ↔ ClinicOS.
 *
 * Autenticação: chave da clínica gerada em Configurações → Integrações → VetZap.
 * Só o hash SHA-256 da chave fica salvo (em /integracoes_vetzap/{hash}); a chave
 * em texto aparece uma única vez para o usuário copiar.
 *
 * Ações (POST JSON, cabeçalho "Authorization: Bearer <chave>"):
 *   { acao: 'ping' }
 *   { acao: 'enviarLead', contato: { nome, telefone, pet?, origem?, notas? } }
 *   { acao: 'status', telefones: string[] }
 */
import * as crypto from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

const db = () => getFirestore();

export const hashChave = (chave: string) => crypto.createHash('sha256').update(chave).digest('hex');

/** Últimos 10 ou 11 dígitos do telefone (DDD + número), ignorando DDI e formatação. */
export function chaveTelefone(tel: string | undefined | null): string {
  const d = String(tel || '').replace(/\D/g, '');
  if (!d) return '';
  const semDdi = d.startsWith('55') && d.length >= 12 ? d.slice(2) : d;
  // Normaliza celular com e sem o 9 extra: guarda DDD + 8 últimos dígitos
  return semDdi.length >= 10 ? semDdi.slice(0, 2) + semDdi.slice(-8) : semDdi;
}

// ─── Geração de chave (chamada pelo app, usuário logado e administrador da clínica) ──

export async function gerarChaveVetzap(uid: string, tenantId: string): Promise<{ chave: string }> {
  if (!tenantId) throw new HttpsError('invalid-argument', 'Clínica não informada.');
  const perfil = (await db().collection('usuarios').doc(uid).get()).data() || {};
  const membro = perfil.activeTenantId === tenantId || (Array.isArray(perfil.tenants) && perfil.tenants.includes(tenantId));
  if (!membro || !['administrador', 'gerente'].includes(perfil.role)) {
    throw new HttpsError('permission-denied', 'Só o administrador da clínica pode gerar a chave do VetZap.');
  }

  const chave = 'vz_' + crypto.randomBytes(24).toString('base64url');
  const hash = hashChave(chave);
  const cfgRef = db().collection('clinicas').doc(tenantId).collection('config').doc('integracao_vetzap');
  const anterior = (await cfgRef.get()).data()?.hashChave;

  const batch = db().batch();
  if (anterior) batch.delete(db().collection('integracoes_vetzap').doc(anterior)); // a chave antiga deixa de valer
  batch.set(db().collection('integracoes_vetzap').doc(hash), {
    tenantId,
    criadoPor: uid,
    criadoEm: new Date().toISOString(),
  });
  batch.set(cfgRef, {
    hashChave: hash,
    finalChave: chave.slice(-4),
    geradaEm: new Date().toISOString(),
    geradaPor: uid,
  });
  await batch.commit();
  return { chave };
}

// ─── API usada pela extensão ────────────────────────────────────────────────

async function tenantDaChave(authHeader: string | undefined): Promise<string> {
  const chave = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
  if (!chave.startsWith('vz_')) throw new HttpsError('unauthenticated', 'Chave do VetZap ausente ou inválida.');
  const snap = await db().collection('integracoes_vetzap').doc(hashChave(chave)).get();
  if (!snap.exists) throw new HttpsError('unauthenticated', 'Chave do VetZap inválida ou substituída. Gere uma nova no ClinicOS.');
  return snap.data()!.tenantId as string;
}

function adivinharEspecie(texto: string): string {
  const t = texto.toLowerCase();
  if (/\b(gat[oa]s?|felin[oa]|cat)\b/.test(t)) return 'Felina';
  if (/\b(c[aã]o|cachorr[oa]|cadel[ao]|canin[oa]|dog)\b/.test(t)) return 'Canina';
  return '';
}

async function acharResponsaveisPorTelefone(tenantId: string) {
  const snap = await db().collection('clinicas').doc(tenantId).collection('responsaveis').get();
  const mapa = new Map<string, { id: string; nome: string }[]>();
  snap.forEach(d => {
    const k = chaveTelefone(d.data().telefone);
    if (!k) return;
    mapa.set(k, [...(mapa.get(k) || []), { id: d.id, nome: d.data().nomeCompleto || '' }]);
  });
  return mapa;
}

async function enviarLead(tenantId: string, contato: any) {
  const nome = String(contato?.nome || '').trim().slice(0, 120);
  const telefone = String(contato?.telefone || '').replace(/\D/g, '').slice(0, 15);
  if (!nome || !telefone) throw new HttpsError('invalid-argument', 'Contato precisa de nome e telefone.');

  const clinica = db().collection('clinicas').doc(tenantId);
  const k = chaveTelefone(telefone);
  const existentes = (await acharResponsaveisPorTelefone(tenantId)).get(k) || [];

  let responsavelId: string;
  let criado = false;
  const agora = new Date().toISOString();
  if (existentes.length) {
    responsavelId = existentes[0].id;
  } else {
    const ref = clinica.collection('responsaveis').doc();
    responsavelId = ref.id;
    await ref.set({
      id: ref.id,
      nomeCompleto: nome,
      telefone,
      cpf: '',
      email: '',
      origem: String(contato?.origem || 'WhatsApp (VetZap)').slice(0, 60),
      observacoes: String(contato?.notas || '').slice(0, 2000),
      criadoEm: agora,
      tenantId,
    });
    criado = true;
  }

  // Pet: cria se veio o nome e ainda não existe para este tutor
  let pacienteCriado = false;
  const petTexto = String(contato?.pet || '').trim().slice(0, 80);
  if (petTexto) {
    const petNome = petTexto.split(/[\/,(-]/)[0].trim() || petTexto;
    const pets = await clinica.collection('pacientes').where('tutorId', '==', responsavelId).get();
    const jaExiste = pets.docs.some(p => String(p.data().nome || '').toLowerCase() === petNome.toLowerCase());
    if (!jaExiste) {
      const ref = clinica.collection('pacientes').doc();
      await ref.set({
        id: ref.id,
        nome: petNome,
        especie: adivinharEspecie(petTexto),
        raca: '',
        sexo: '',
        idade: '',
        peso: 0,
        tutorId: responsavelId,
        criadoEm: agora,
        tenantId,
      });
      pacienteCriado = true;
    }
  }

  return { responsavelId, criado, pacienteCriado };
}

/**
 * Calcula a etapa do funil do VetZap a partir do que aconteceu no ClinicOS.
 * Os nomes seguem o funil padrão do VetZap; a extensão só aplica se a etapa existir lá.
 */
async function statusPorTelefone(tenantId: string, telefones: string[]) {
  const clinica = db().collection('clinicas').doc(tenantId);
  const responsaveis = await acharResponsaveisPorTelefone(tenantId);

  // Agenda usa o cadastro de clientes (customers); ligamos pelo telefone também
  const clientesPorTel = new Map<string, string[]>();
  (await clinica.collection('customers').get()).forEach(d => {
    const k = chaveTelefone(d.data().telefone);
    if (k) clientesPorTel.set(k, [...(clientesPorTel.get(k) || []), d.id]);
  });

  const hoje = new Date();
  const hojeIso = hoje.toISOString().slice(0, 10);
  const dias = (iso: string) => (hoje.getTime() - new Date(iso).getTime()) / 86400000;

  const resultados: Record<string, { etapa: string | null; responsavelId?: string; proximaData?: string }> = {};

  for (const tel of telefones.slice(0, 500)) {
    const k = chaveTelefone(tel);
    const resp = responsaveis.get(k) || [];
    const idsCliente = [...resp.map(r => r.id), ...(clientesPorTel.get(k) || [])];
    if (!idsCliente.length) {
      resultados[tel] = { etapa: null };
      continue;
    }

    // Consultas realizadas (do tutor)
    let ultimaConsulta = '' as string;
    for (const r of resp) {
      const cs = await clinica.collection('consultas_clinicas').where('tutorId', '==', r.id).get();
      cs.forEach(c => {
        const data = String(c.data().data || c.data().criadoEm || '');
        if (data && data > ultimaConsulta) ultimaConsulta = data;
      });
    }

    // Próximo agendamento (até 10 ids por consulta "in")
    let proxima = '' as string;
    for (let i = 0; i < idsCliente.length; i += 10) {
      const ag = await clinica
        .collection('appointments')
        .where('clientId', 'in', idsCliente.slice(i, i + 10))
        .get();
      ag.forEach(a => {
        const d = a.data();
        if (['scheduled', 'confirmed'].includes(d.status) && d.date >= hojeIso) {
          if (!proxima || d.date < proxima) proxima = d.date;
        }
        if (d.status === 'completed' && d.date && d.date > ultimaConsulta) ultimaConsulta = d.date;
      });
    }

    let etapa: string | null = null;
    if (proxima) etapa = ultimaConsulta ? 'Retorno agendado' : 'Consulta agendada';
    else if (ultimaConsulta && dias(ultimaConsulta) <= 15) etapa = 'Em tratamento';
    else if (ultimaConsulta && dias(ultimaConsulta) <= 60) etapa = 'Acompanhamento pós-tratamento';
    else if (ultimaConsulta) etapa = 'Cliente ativo';

    resultados[tel] = { etapa, responsavelId: resp[0]?.id, ...(proxima ? { proximaData: proxima } : {}) };
  }
  return { resultados };
}

export async function processarVetzapApi(authHeader: string | undefined, body: any) {
  const tenantId = await tenantDaChave(authHeader);
  const acao = body?.acao;
  if (acao === 'ping') {
    const cfg = (await db().collection('clinicas').doc(tenantId).collection('config').doc('clinic').get()).data();
    return { ok: true, clinica: cfg?.name || tenantId };
  }
  if (acao === 'enviarLead') return enviarLead(tenantId, body.contato);
  if (acao === 'status') {
    const telefones = Array.isArray(body.telefones) ? body.telefones.map(String) : [];
    return statusPorTelefone(tenantId, telefones);
  }
  throw new HttpsError('invalid-argument', 'Ação desconhecida.');
}
