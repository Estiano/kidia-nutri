import { getGeminiAI } from "../lib/gemini";

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export const sendMessageToAI = async (messages: ChatMessage[]): Promise<string> => {
  const isDev = window.location.hostname.includes('googleusercontent.com') || 
                window.location.hostname.includes('run.app') ||
                window.location.hostname === 'localhost' ||
                window.location.hostname.includes('ais-') ||
                window.location.hostname.includes('aisstudio');

  if (isDev) {
    const ai = getGeminiAI();
    if (!ai) throw new Error("GEMINI_API_KEY não configurada.");
    
    // System instruction to guide the AI as a nutrition assistant in Angola
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
      model: "gemini-1.5-flash",
      contents
    });

    return response.text;
  } else {
    // Production (Vercel)
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro na conversa');
    }

    const data = await response.json();
    return data.text;
  }
};
