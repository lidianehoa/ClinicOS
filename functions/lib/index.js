"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiProxy = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = require("firebase-admin");
admin.initializeApp();
const geminiApiKey = (0, params_1.defineSecret)('GEMINI_API_KEY');
// ─── Configuração Técnica Obrigatória ──────────────────────────────────────────
const MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
exports.geminiProxy = (0, https_1.onRequest)({
    region: 'us-central1',
    secrets: [geminiApiKey],
    timeoutSeconds: 60,
    memory: '256MiB',
    cors: true,
}, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const apiKey = geminiApiKey.value();
    if (!apiKey) {
        res.status(500).json({ error: 'Configuração do servidor incompleta (chave ausente).' });
        return;
    }
    const { contents, systemInstruction } = req.body;
    if (!contents || !Array.isArray(contents)) {
        res.status(400).json({ error: 'O campo "contents" é obrigatório.' });
        return;
    }
    // Payload Estruturado (MANDATÓRIO conforme prompt inicial)
    const requestBody = { contents };
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
                error: (_b = (_a = result === null || result === void 0 ? void 0 : result.error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : 'Erro na API Gemini',
            });
            return;
        }
        const text = (_h = (_g = (_f = (_e = (_d = (_c = result.candidates) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.content) === null || _e === void 0 ? void 0 : _e.parts) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.text) !== null && _h !== void 0 ? _h : 'Sem resposta.';
        res.status(200).json({ text });
    }
    catch (err) {
        console.error('Erro na Cloud Function geminiProxy:', err);
        res.status(500).json({ error: (_j = err.message) !== null && _j !== void 0 ? _j : 'Erro interno.' });
    }
});
//# sourceMappingURL=index.js.map