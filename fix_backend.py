import re
import os

f = 'functions/src/index.ts'
with open(f, 'r') as file:
    content = file.read()

new_backend = """// ─── Inicialização Genkit ──────────────────────────────────────────────────
import { gemini15Flash, gemini15Pro } from '@genkit-ai/googleai';

// Usaremos strings diretas de modelo para referenciar as novas gerações, 
// caso o SDK do Genkit no ambiente ainda não as tenha exportadas.
const getModelString = (objetivo: string) => {
  if (objetivo === 'diagnostico_completo') {
    return 'googleai/gemini-3-pro'; // Diagnóstico clínico profundo
  }
  return 'googleai/gemini-2.5-flash-lite'; // Triagem ou Laudo (Rápido e barato)
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
    const casoRef = db.collection('artifacts').doc(tId).collection('public').doc('data').collection('casos_clinicos').doc(casoId);
    const casoDoc = await casoRef.get();
    if (!casoDoc.exists) throw new Error('Caso clínico não encontrado');
    const casoData = casoDoc.data()!;

    // 2. Atualiza status
    await casoRef.update({ status: 'analisando' });
    if (novoExameId) {
      await db.collection('artifacts').doc(tId).collection('public').doc('data').collection('exames').doc(novoExameId).update({
        status: 'analisando'
      });
    }

    // 3. Buscar e Filtrar Protocolos (Simulação de match básico por keywords no backend)
    const protocolosSnapshot = await db.collection('artifacts').doc(tId).collection('public').doc('data').collection('protocolos_clinicos').where('ativo', '==', true).get();
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
      protocolosContext = '\\n\\nProtocolos Clínicos RELEVANTES a serem considerados:\\n' + 
      protocolosRelevantes.map(data => `### [Protocolo: ${data.titulo}]\\n${data.conteudo}`).join('\\n\\n');
    }

    // 4. Constrói o Prompt Econômico (Resumo Anterior + Delta)
    const resumoAnterior = casoData.resumoCaso ? `Resumo Anterior do Caso:\\n${casoData.resumoCaso}\\n\\n` : '';
    
    // TODO: Adicionar estruturações antigas de exames se houvesse lógica de longitudinalidade complexa, 
    // mas o resumo atualizado já ajuda a consolidar.

    const prompt = `
    Atue como um Médico Veterinário especialista. 
    ${resumoAnterior}
    Atualização atual do caso (Novos dados):
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

    const modelName = getModelString(objetivoAnalise);
    const maxOutputTokens = getTokensLimit(objetivoAnalise);

    const promptMessage: any[] = [{ text: prompt }];
    if (novoExameFileUrl) {
      promptMessage.push({ media: { url: novoExameFileUrl } });
    }

    const { output } = await genkitAi.generate({
      model: modelName,
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
    await db.collection('artifacts').doc(tId).collection('public').doc('data').collection('analises').doc(analiseId).set({
      id: analiseId,
      casoId,
      exameId: novoExameId || null,
      achados: output?.achados || [],
      diferenciais: output?.diferenciais || [],
      condutaSugerida: output?.condutaSugerida || '',
      dataAnalise: new Date().toISOString()
    });

    // Atualiza o Caso com o novo resumo e status
    await casoRef.update({
      status: 'analisado',
      resumoCaso: output?.resumoCasoAtualizado || casoData.resumoCaso || ''
    });

    if (novoExameId) {
      await db.collection('artifacts').doc(tId).collection('public').doc('data').collection('exames').doc(novoExameId).update({
        status: 'analisado',
        analiseId: analiseId
      });
    }

    return { success: true, analiseId, output };
  } catch (error: any) {
    console.error('Error analyzing caso:', error);
    // Em caso de erro, reverter status se possivel (simplificado)
    const casoRef = db.collection('artifacts').doc(tId).collection('public').doc('data').collection('casos_clinicos').doc(casoId);
    await casoRef.update({ status: 'erro' });
    throw new HttpsError('internal', error.message);
  }
});
"""

start_idx = content.find('// ─── Inicialização Genkit')
if start_idx != -1:
    content = content[:start_idx] + new_backend + """
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
      model: 'googleai/gemini-2.5-flash-lite',
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
"""
with open(f, 'w') as file:
    file.write(content)
