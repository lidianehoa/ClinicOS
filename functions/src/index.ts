import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';

admin.initializeApp();

const geminiApiKey = defineSecret('GEMINI_API_KEY');

// ─── Configuração Técnica Obrigatória ──────────────────────────────────────────
const MODEL = 'gemini-1.5-flash';
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
