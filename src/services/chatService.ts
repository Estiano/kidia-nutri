import { getGeminiAI } from "../lib/gemini";

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export const sendMessageToAI = async (messages: ChatMessage[]): Promise<string> => {
  const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname.includes('127.0.0.1') ||
                window.location.hostname.includes('googleusercontent.com') || 
                window.location.hostname.includes('run.app') ||
                window.location.hostname.includes('ais-') ||
                window.location.hostname.includes('aisstudio');

  // Helper para chamada local
  const callLocalAI = async () => {
    const ai = getGeminiAI();
    if (!ai) throw new Error("GEMINI_API_KEY não configurada no cliente.");
    
    const systemPrompt = `Tu és o Kidia Nutri AI, um assistente virtual de nutrição especializado na saúde e culinária de Angola. 
    O teu objetivo é ajudar os angolanos a comerem de forma mais saudável.
    REGRAS DE RESPOSTA:
    1. Sê EXTREMAMENTE conciso e direto.
    2. Evita introduções longas ou saudações repetitivas.
    3. Dá conselhos práticos com ingredientes locais (Funge, Quizaca, etc.).
    4. Se for uma pergunta simples, responde com apenas uma ou duas frases.
    5. Nunca gastes espaço desnecessário com texto decorativo.`;

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...messages.map(m => ({
        role: m.role as any,
        parts: [{ text: m.content }]
      }))
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents
    });

    return response.text;
  };

  if (isDev) {
    try {
      return await callLocalAI();
    } catch (err) {
      console.warn("Falha na IA local, tentando backend...", err);
    }
  }

  // Produção (Vercel): Tenta o backend primeiro
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });

    if (!response.ok) {
      // Se o backend falhar (ex: chave não configurada no Vercel), tenta local como fallback
      console.warn("Backend falhou, tentando fallback local...");
      return await callLocalAI();
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Erro na conversa, tentando fallback local...', error);
    return await callLocalAI();
  }
};
