import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// AI Service logic on the server with rotation
const getAI = () => {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GEMINI_API_KEY_7,
    process.env.GEMINI_API_KEY_8,
    process.env.GEMINI_API_KEY_9
  ].filter(k => k && k.length > 5 && k !== 'AI Studio Free Tier');

  if (keys.length === 0) return null;
  
  // Pick a random key for basic load balancing/rotation
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return new GoogleGenAI({ apiKey: randomKey! });
};

app.get('/api/health', (req, res) => {
  const keysCount = [
    'GEMINI_API_KEY', 'GEMINI_API_KEY_1', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3',
    'GEMINI_API_KEY_4', 'GEMINI_API_KEY_5', 'GEMINI_API_KEY_6', 'GEMINI_API_KEY_7',
    'GEMINI_API_KEY_8', 'GEMINI_API_KEY_9'
  ].filter(k => process.env[k]).length;

  res.json({ 
    status: 'ok', 
    environment: process.env.NODE_ENV, 
    keysAvailable: keysCount,
    hasSupabase: !!process.env.VITE_SUPABASE_URL
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Mensagens inválidas' });

    const ai = getAI();
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada na Vercel. Por favor, adiciona-a nas configurações do projeto.' });
    }

    const systemPrompt = `Tu és o Kidia Nutri AI, um assistente virtual de nutrição especializado na saúde e culinária de Angola. 
    REGRAS: Sê extremamente direto, conciso e prático. Responde em poucas palavras sempre que possível, focando em ingredientes locais de Angola. Sem textos longos ou enrolação.`;

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...messages.map((m: any) => ({
        role: m.role,
        parts: [{ text: m.content }]
      }))
    ];

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents
    });
    
    res.json({ text: result.text });
  } catch (error: any) {
    console.error('Erro no Chat IA:', error);
    res.status(500).json({ error: error.message || 'Erro no chat do servidor' });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { base64Image } = req.body;
    if (!base64Image) return res.status(400).json({ error: 'Falta a imagem' });

    const ai = getAI();
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada na Vercel.' });
    }

    const prompt = `Analise esta imagem de uma refeição e forneça os detalhes nutricionais em formato JSON. 
    Seja o mais preciso possível para um guia de saúde em Angola.
    Retorne um objeto com os campos: item_name (texto), calories (número), protein (número em g), carbs (número em g), fat (número em g), fiber (número em g), score (0-100), score_label (ex: Saudável, Moderado, Atenção), recommendation (uma frase curta de conselho).`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
        ]
      }],
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = result.text;
    const cleanedJson = responseText.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(cleanedJson));
  } catch (error: any) {
    console.error('Erro na análise IA:', error);
    res.status(500).json({ error: error.message || 'Erro ao analisar imagem no servidor' });
  }
});

// For development only
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running local on http://localhost:${PORT}`);
  });
}

export default app;
