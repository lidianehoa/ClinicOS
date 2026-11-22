import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { genkit, z } from 'genkit';
import { googleAI, gemini15Pro, gemini15Flash } from '@genkit-ai/googleai';

admin.initializeApp();

const geminiApiKey = defineSecret('GEMINI_API_KEY');

// ─── Configuração Técnica Obrigatória ──────────────────────────────────────────
const MODEL = 'gemini-1.5-flash-latest';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export const geminiProxy = onRequest(
  {
    region: 'us-central1',
    secrets: [geminiApiKey],
    timeoutSeconds: 60,
    memory: '256MiB',
    cors: true,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      res.status(500).json({ error: 'Configuração do servidor incompleta (chave ausente).' });
      return;
    }

    const { contents, systemInstruction } = req.body as {
      contents: any[];
      systemInstruction?: string;
    };

    if (!contents || !Array.isArray(contents)) {
      res.status(400).json({ error: 'O campo "contents" é obrigatório.' });
      return;
    }

    // Payload Estruturado (MANDATÓRIO conforme prompt inicial)
    const requestBody: Record<string, any> = { contents };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    try {
      const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error('Erro Gemini API:', result);
        res.status(response.status).json({
          error: result?.error?.message ?? 'Erro na API Gemini',
        });
        return;
      }

      const text: string =
        result.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sem resposta.';

      res.status(200).json({ text });
    } catch (err: any) {
      console.error('Erro na Cloud Function geminiProxy:', err);
      res.status(500).json({ error: err.message ?? 'Erro interno.' });
    }
  }
);


// ─── Inicialização Genkit ──────────────────────────────────────────────────
// Usamos as referências diretas importadas do SDK para evitar problemas de nomeação da API
const getModel = (objetivo: string) => {
  if (objetivo === 'diagnostico_completo') {
    return 'googleai/gemini-3.1-pro-preview'; // Diagnóstico clínico profundo
  }
  return 'googleai/gemini-3.5-flash'; // Triagem ou Laudo (Rápido e barato)
};

const getTokensLimit = (objetivo: string) => {
  if (objetivo === 'triagem') return 500;
  if (objetivo === 'laudo') return 1000;
  return 2500; // diagnostico_completo
};

const initGenkit = (apiKey: string) => {
  return genkit({
    plugins: [googleAI({ apiKey })],
  });
};

// ─── Genkit Flows (ClinicOS IA) ─────────────────────────────────────────────

const analyzeCasoSchema = z.object({
  resumoCasoAtualizado: z.string().describe('Resumo atualizado do caso considerando este novo exame e as informações novas (máx 3 parágrafos).'),
  achados: z.array(z.string()).describe('Lista estruturada de achados clínicos baseada no exame e no histórico'),
  diferenciais: z.array(z.string()).describe('Diagnósticos diferenciais sugeridos, se aplicável ao objetivo da análise'),
  condutaSugerida: z.string().describe('Sugestão de conduta ou próximos passos'),
  prescricoesSugeridas: z.array(z.string()).optional().describe('Sugestões de medicamentos e prescrições com base no quadro clínico, prontos para compor uma receita. Caso não haja, retorne vazio.'),
});

const generateNoteSchema = z.object({
  nota: z.string().describe('Nota explicativa estruturada em formato de texto'),
});

export const analyzeCaso = onCall({ 
    secrets: [geminiApiKey],
    region: 'us-central1',
    timeoutSeconds: 180,
    memory: '512MiB',
    cors: true,
  }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { casoId, tenantId, novoExameId, novoExameFileUrl, novoExameTipo, objetivoAnalise, focoAnalise } = request.data;
  
  const apiKey = geminiApiKey.value();
  const genkitAi = initGenkit(apiKey);
  const db = getFirestore();
  const tId = tenantId || 'clinicos_demo';

  try {
    // 1. Busca os dados do Caso Clínico
    const casoRef = db.collection('clinicas').doc(tId).collection('casos_clinicos').doc(casoId);
    const casoDoc = await casoRef.get();
    if (!casoDoc.exists) throw new Error('Caso clínico não encontrado');
    const casoData = casoDoc.data()!;

    // 2. Atualiza status
    await casoRef.update({ status: 'analisando' });
    if (novoExameId) {
      await db.collection('clinicas').doc(tId).collection('exames').doc(novoExameId).update({
        status: 'analisando'
      });
    }

    // 3. Buscar e Filtrar Protocolos (Simulação de match básico por keywords no backend)
    const protocolosSnapshot = await db.collection('clinicas').doc(tId).collection('protocolos_clinicos').where('ativo', '==', true).get();
    let protocolosContext = '';
    
    // Concatena sintomas e histórico para buscar keywords
    const contextoBusca = (casoData.sintomasPrincipais + ' ' + casoData.historicoClinico).toLowerCase();
    const protocolosRelevantes = protocolosSnapshot.docs
      .map(doc => doc.data())
      .filter(data => {
        // Se o protocolo tiver tags, filtramos se alguma tag bater com o contexto
        if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
          return data.tags.some((tag: string) => contextoBusca.includes(tag.toLowerCase()));
        }
        return true; // Se não tiver tag, assumimos que é global ou filtramos depois. Na prática, melhor ignorar se não der match, mas para MVP vamos incluir.
      });

    if (protocolosRelevantes.length > 0) {
      protocolosContext = '\n\nProtocolos Clínicos RELEVANTES a serem considerados:\n' + 
      protocolosRelevantes.map(data => `### [Protocolo: ${data.titulo}]\n${data.conteudo}`).join('\n\n');
    }

    // 4. Constrói o Prompt Econômico (Resumo Anterior + Delta)
    const resumoAnterior = casoData.resumoCaso ? `Resumo Anterior do Caso:\n${casoData.resumoCaso}\n\n` : '';
    
    // TODO: Adicionar estruturações antigas de exames se houvesse lógica de longitudinalidade complexa, 
    // mas o resumo atualizado já ajuda a consolidar.

    const prompt = `
    Atue como um Médico Veterinário especialista. 
    ${resumoAnterior}
    Atualização atual do caso (Novos dados):
    ${casoData.isDomiciliar ? '**ATENÇÃO: Este é um ATENDIMENTO DOMICILIAR.** Leve isso em alta consideração ao sugerir a conduta: oriente sobre manejo ambiental na residência do tutor, facilidades/dificuldades de home care e indique se certos procedimentos precisam de encaminhamento para clínica/hospital ou se podem ser feitos no domicílio.' : ''}
    Sintomas Principais Relatados: ${casoData.sintomasPrincipais || 'N/A'}
    Histórico Clínico Recente: ${casoData.historicoClinico || 'N/A'}
    
    ${novoExameTipo ? `Foi anexado um novo exame do tipo "${novoExameTipo}". Por favor, analise a mídia anexada em conjunto com o contexto.` : 'Não há mídia de exame novo nesta requisição.'}
    
    Objetivo da análise: ${objetivoAnalise === 'triagem' ? 'Triagem Rápida' : objetivoAnalise === 'laudo' ? 'Laudo de Exame' : 'Diagnóstico Clínico Completo'}
    ${focoAnalise ? `Instruções/Foco específico do veterinário: ${focoAnalise}` : ''}
    ${protocolosContext}

    Retorne o JSON estruturado contendo:
    1. 'resumoCasoAtualizado': Um resumo consolidado e sucinto do caso inteiro até o momento, para eu economizar tokens nas próximas chamadas.
    2. 'achados': Achados relevantes desta atualização/exame.
    3. 'diferenciais': Possíveis diagnósticos (se o objetivo for diagnóstico completo ou laudo).
    4. 'condutaSugerida': Próximos passos baseados na evolução e/ou protocolos aplicáveis.
    `;

    const modelRef = getModel(objetivoAnalise);
    const maxOutputTokens = getTokensLimit(objetivoAnalise);

    const promptMessage: any[] = [{ text: prompt }];
    if (novoExameFileUrl) {
      promptMessage.push({ media: { url: novoExameFileUrl } });
    }

    const { output } = await genkitAi.generate({
      model: modelRef,
      prompt: promptMessage,
      config: {
        maxOutputTokens: maxOutputTokens,
      },
      output: {
        schema: analyzeCasoSchema
      }
    });

    const analiseId = `analise_${Date.now()}`;
    
    // Salva a nova análise
    await db.collection('clinicas').doc(tId).collection('analises').doc(analiseId).set({
      id: analiseId,
      casoId,
      numero: Date.now(),
      exameId: novoExameId || null,
      achados: output?.achados || [],
      diferenciais: output?.diferenciais || [],
      condutaSugerida: output?.condutaSugerida || '',
      prescricoesSugeridas: output?.prescricoesSugeridas || [],
      dataAnalise: new Date().toISOString()
    });

    // Atualiza o Caso com o novo resumo e status
    await casoRef.update({
      status: 'analisado',
      resumoCaso: output?.resumoCasoAtualizado || casoData.resumoCaso || ''
    });

    if (novoExameId) {
      await db.collection('clinicas').doc(tId).collection('exames').doc(novoExameId).update({
        status: 'analisado',
        analiseId: analiseId
      });
    }

    return { success: true, analiseId, output };
  } catch (error: any) {
    console.error('Error analyzing caso:', error);
    // Em caso de erro, reverter status se possivel (simplificado)
    const casoRef = db.collection('clinicas').doc(tId).collection('casos_clinicos').doc(casoId);
    await casoRef.update({ status: 'erro' });
    throw new HttpsError('internal', error.message);
  }
});

export const generateNote = onCall({ 
    secrets: [geminiApiKey],
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '256MiB',
    cors: true,
  }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  const { achados, diferenciais, condutaSugerida } = request.data;
  const apiKey = geminiApiKey.value();
  const genkitAi = initGenkit(apiKey);

  try {
    const prompt = `
    Com base na seguinte análise de exame veterinário, redija uma nota explicativa clara e profissional para o prontuário.
    A nota deve, OBRIGATORIAMENTE, seguir este template e estar bem formatada:
    1. Justificativa clínica (breve introdução)
    2. Achados principais
    3. Diagnósticos Diferenciais
    4. Conduta Sugerida
    5. Monitoramento / Próximos Passos
    
    Dados da análise:
    Achados: ${(achados || []).join('; ')}
    Diferenciais: ${(diferenciais || []).join('; ')}
    Conduta: ${condutaSugerida || ''}
    `;

    const { output } = await genkitAi.generate({
      model: 'googleai/gemini-3.5-flash',
      prompt,
      output: {
        schema: generateNoteSchema
      }
    });

    return { success: true, nota: output?.nota || '' };
  } catch (error: any) {
    console.error('Error generating note:', error);
    throw new HttpsError('internal', error.message);
  }
});

export const resolveTenantByEmail = onCall({
    region: 'us-central1',
    cors: true,
  }, async (request) => {
  const email = (request.data?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new HttpsError('invalid-argument', 'E-mail inválido.');
  }

  const db = getFirestore();
  const indexDoc = await db.collection('staff_email_index').doc(email).get();
  
  if (!indexDoc.exists) {
    return { found: false, count: 0 };
  }

  const data = indexDoc.data()!;
  const tenants = data.tenants || (data.tenantId ? [{ tenantId: data.tenantId, role: data.role || 'staff' }] : []);
  
  return {
    found: true,
    count: tenants.length,
    defaultTenantId: data.defaultTenantId || tenants[0]?.tenantId || null,
    tenants: tenants.map((t: any) => ({ tenantId: t.tenantId, role: t.role }))
  };
});

export const registerNewClinic = onCall({
    region: 'us-central1',
    cors: true,
  }, async (request) => {
  const { clinicName, ownerName, email, password, phone, crmv } = request.data || {};
  
  if (!clinicName || !email || !password || !ownerName) {
    throw new HttpsError('invalid-argument', 'Campos obrigatórios ausentes.');
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  const db = getFirestore();
  const auth = getAuth();

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(cleanEmail);
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      userRecord = await auth.createUser({
        email: cleanEmail,
        password: password,
        displayName: ownerName,
      });
    } else {
      throw new HttpsError('internal', err.message);
    }
  }

  const slug = clinicName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 25);
  const tenantId = `clinic_${slug}_${Date.now().toString(36)}`;

  // 1. Create Tenant Record
  await db.collection('tenants').doc(tenantId).set({
    id: tenantId,
    nome: clinicName,
    ownerUid: userRecord.uid,
    ownerEmail: cleanEmail,
    ownerName: ownerName,
    phone: phone || '',
    crmv: crmv || '',
    plano: 'pro',
    status: 'active',
    createdAt: new Date().toISOString()
  });

  // 2. Create User Profile
  await db.collection('usuarios').doc(userRecord.uid).set({
    uid: userRecord.uid,
    nome: ownerName,
    email: cleanEmail,
    role: 'administrador',
    activeTenantId: tenantId,
    tenants: [tenantId],
    crmv: crmv || '',
    status: 'ativo',
    createdAt: new Date().toISOString()
  }, { merge: true });

  // 3. Register in staff_email_index
  const indexRef = db.collection('staff_email_index').doc(cleanEmail);
  const indexSnap = await indexRef.get();
  let existingTenants = indexSnap.exists ? (indexSnap.data()?.tenants || []) : [];
  if (!existingTenants.some((t: any) => t.tenantId === tenantId)) {
    existingTenants.push({ tenantId, role: 'administrador', status: 'active', clinicName });
  }
  await indexRef.set({
    email: cleanEmail,
    tenants: existingTenants,
    defaultTenantId: tenantId,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  // 4. Create Staff in Clinic
  const staffId = `staff_${Date.now()}`;
  await db.collection('clinicas').doc(tenantId).collection('staff').doc(staffId).set({
    id: staffId,
    name: ownerName,
    email: cleanEmail,
    accessLevel: 'Admin',
    professionalId: crmv || '',
    phone: phone || '',
    status: 'Active',
    createdAt: new Date().toISOString()
  });

  // 5. Initialize config documents
  await db.collection('clinicas').doc(tenantId).collection('config').doc('clinic').set({
    name: clinicName,
    phone: phone || '',
    email: cleanEmail,
    address: '',
    updatedAt: new Date().toISOString()
  });

  await db.collection('clinicas').doc(tenantId).collection('config').doc('homecare').set({
    ativo: false,
    enderecoBase: '',
    valorKm: '3.50',
    taxaBase: '50.00',
    distanciaMaximaKm: '50',
    updatedAt: new Date().toISOString()
  });

  await db.collection('clinicas').doc(tenantId).collection('config').doc('fiscal').set({
    cnpj: '',
    razaoSocial: clinicName,
    nomeFantasia: clinicName,
    inscricaoEstadual: '',
    regimeTributario: 'Simples Nacional',
    updatedAt: new Date().toISOString()
  });

  await db.collection('clinicas').doc(tenantId).collection('config').doc('integrations').set({
    whatsappEnabled: false,
    googleCalendarEnabled: false,
    updatedAt: new Date().toISOString()
  });

  return { success: true, tenantId, uid: userRecord.uid };
});

// ─── Assinatura Digital ICP-Brasil: Validação de PDF Assinado ───────────────
import { processarValidacaoPdfAssinado, ValidarPdfAssinadoRequest } from './validarPdfAssinado';

export const validarPdfAssinado = onCall(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }
    return await processarValidacaoPdfAssinado(
      request.auth.uid,
      request.data as ValidarPdfAssinadoRequest
    );
  }
);

// ─── Portal da Farmácia & Token de Dispensação ─────────────────────────────
import {
  processarConsultaFarmacia,
  processarDispensacaoFarmacia,
  processarCancelamentoReceita,
  DispensarPayload
} from './farmaciaService';

export const farmaciaConsultar = onCall(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  async (request) => {
    const rawIp =
      (request.rawRequest?.headers?.['x-forwarded-for'] as string) ||
      request.rawRequest?.ip ||
      '127.0.0.1';
    const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '127.0.0.1';
    const token = (request.data?.token as string) || '';

    return await processarConsultaFarmacia(clientIp, token);
  }
);

export const farmaciaDispensar = onCall(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  async (request) => {
    const rawIp =
      (request.rawRequest?.headers?.['x-forwarded-for'] as string) ||
      request.rawRequest?.ip ||
      '127.0.0.1';
    const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '127.0.0.1';

    return await processarDispensacaoFarmacia(clientIp, request.data as DispensarPayload);
  }
);

export const cancelarReceita = onCall(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }
    const { tenantId, receitaId, motivo } = request.data as {
      tenantId: string;
      receitaId: string;
      motivo: string;
    };
    return await processarCancelamentoReceita(request.auth.uid, tenantId, receitaId, motivo);
  }
);



// ─── Integração VetZap CRM (extensão do Chrome) ─────────────────────────────
import { gerarChaveVetzap, processarVetzapApi } from './vetzapApi';

export const vetzapGerarChave = onCall({ region: 'us-central1', timeoutSeconds: 30 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
  return gerarChaveVetzap(request.auth.uid, String(request.data?.tenantId || ''));
});

export const vetzapApi = onRequest(
  { region: 'us-central1', memory: '256MiB', timeoutSeconds: 60, cors: false },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST.' });
      return;
    }
    try {
      const resultado = await processarVetzapApi(req.headers.authorization, req.body);
      res.status(200).json(resultado);
    } catch (err: any) {
      const http: Record<string, number> = { unauthenticated: 401, 'permission-denied': 403, 'invalid-argument': 400, 'not-found': 404 };
      const status = err instanceof HttpsError ? http[err.code] || 500 : 500;
      if (status === 500) console.error('vetzapApi:', err);
      res.status(status).json({ error: status === 500 ? 'Erro interno.' : err.message });
    }
  }
);
