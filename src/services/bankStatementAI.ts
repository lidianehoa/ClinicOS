import { getIntegrationsConfig } from './dataService';
import { BankTransaction } from '../utils/statementParsers';

/**
 * Converte um File (PDF) para Base64
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data:application/pdf;base64, prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Falha ao converter arquivo'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Analisa um extrato bancário em PDF usando a API da Anthropic (Claude)
 */
export const parsePDFWithClaude = async (file: File): Promise<BankTransaction[]> => {
  const config = await getIntegrationsConfig();
  
  if (!config?.anthropicApiKey) {
    throw new Error('Chave da API da Anthropic (Claude) não configurada. Configure em Integrações.');
  }

  const base64Data = await fileToBase64(file);

  const prompt = `
Você é um assistente financeiro especializado em contabilidade clínica.
Extraia todas as transações bancárias deste extrato em PDF.
Ignore saldos, cabeçalhos informativos, propagandas e dados do banco.
Concentre-se apenas na Tabela de Transações/Lançamentos.

Retorne EXATAMENTE UM JSON ARRAY com os seguintes campos para cada transação:
- date: no formato "YYYY-MM-DD"
- amount: número (flutuante, positivo para crédito, negativo para débito)
- description: string (histórico ou descrição da transação)

Exemplo de retorno esperado:
[
  { "date": "2026-06-25", "amount": -150.00, "description": "TARIFA BANCARIA" },
  { "date": "2026-06-26", "amount": 800.00, "description": "PIX RECEBIDO" }
]

NÃO retorne nenhum texto antes ou depois do JSON. Apenas o array JSON puro.
`;

  try {
    // Nota: Em produção, chamadas à API da Anthropic devem passar por um backend (ex: Firebase Functions)
    // para evitar exposição da API Key e bloqueios de CORS no browser.
    // Para fins de demonstração (ou se usado um proxy local), estamos fazendo o fetch direto.
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25', // Habilita o suporte a PDF
        'anthropic-dangerous-direct-browser-access': 'true' // Permite o CORS para testes
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64Data
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Erro ao comunicar com a API da Anthropic.');
    }

    const data = await response.json();
    const responseText = data.content[0].text;

    // Extrai o JSON da resposta (caso o modelo inclua texto markdown como ```json)
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Formato de resposta inesperado da IA.');
    }

    const transactions = JSON.parse(jsonMatch[0]);

    return transactions.map((t: any) => ({
      id: `bt_${generateId()}`,
      date: t.date,
      amount: Number(t.amount),
      description: String(t.description)
    }));

  } catch (error: any) {
    console.error('Erro no parser AI:', error);
    throw new Error(`Falha na leitura IA do PDF: ${error.message}`);
  }
};
