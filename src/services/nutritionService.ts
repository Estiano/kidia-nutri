import { getGeminiAI } from "../lib/gemini";
import { supabase } from "../lib/supabase";
import { db } from "../lib/db";

export interface NutritionAnalysis {
  item_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  iron: number;
  vit_c: number;
  vit_a: number;
  calcium: number;
  score: number;
  score_label: string;
  recommendation: string;
  benefits: string[];
  cautions: string[];
  description: string;
}

export const analyzeImage = async (base64Image: string): Promise<NutritionAnalysis> => {
  const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname.includes('127.0.0.1') ||
                window.location.hostname.includes('googleusercontent.com') || 
                window.location.hostname.includes('run.app') ||
                window.location.hostname.includes('ais-') ||
                window.location.hostname.includes('aisstudio');

  const callLocalAI = async () => {
    const ai = getGeminiAI();
    if (!ai) throw new Error("GEMINI_API_KEY não configurada no cliente.");
    
    const prompt = `Analise esta imagem de uma refeição e forneça os detalhes nutricionais detalhados em formato JSON. 
    Seja o mais preciso possível para um guia de saúde em Angola, focando especialmente em ferro para combate à anemia.
    Retorne um objeto JSON com os seguintes campos exatos:
    - item_name (texto)
    - description (breve descrição do prato, 2 frases)
    - calories (número)
    - protein (número em g)
    - carbs (número em g)
    - fat (número em g)
    - fiber (número em g)
    - iron (número em mg)
    - vit_c (número em mg)
    - vit_a (número em mcg)
    - calcium (número em mg)
    - score (0-100)
    - score_label (ex: Saudável, Moderado, Atenção)
    - recommendation (uma frase curta de conselho)
    - benefits (lista de strings com 2-3 benefícios principais)
    - cautions (lista de strings com alertas se houver excesso de sal, gordura ou açúcar, ou se for contra-indicado para certas condições)`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: base64Image } }
        ]
      }],
      config: {
        responseMimeType: "application/json"
      }
    });

    const resultText = response.text;
    const cleanedJson = resultText.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanedJson);
  };

  if (isDev) {
    try {
      return await callLocalAI();
    } catch (err) {
      console.warn("Falha na análise local, tentando backend...", err);
    }
  }

  // Produção (Vercel): Tenta o backend primeiro
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image })
    });

    if (!response.ok) {
      console.warn("Backend falhou, tentando fallback local...");
      return await callLocalAI();
    }

    return response.json();
  } catch (error) {
    console.error('Erro na análise, tentando fallback local...', error);
    return await callLocalAI();
  }
};

export const uploadAndAnalyze = async (
  file: File, 
  userId: string
): Promise<{ analysis: NutritionAnalysis; imageUrl: string }> => {
  let imageUrl = '';
  
  // 1. Se o Supabase estiver configurado, faz o upload real
  if (supabase && (import.meta as any).env.VITE_SUPABASE_URL) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('meals')
      .upload(filePath, file);

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('meals').getPublicUrl(filePath);
      imageUrl = publicUrl;
    } else {
      console.warn("Falha no upload Supabase, usando URL local:", uploadError.message);
    }
  }

  // 2. Se falhou o upload ou não tem Supabase, gera uma URL local temporária (DataURL)
  // Isso permite que o app funcione mesmo sem bucket configurado
  const base64Promise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (!imageUrl) imageUrl = result; // Usa o base64 como imagem se não tiver URL pública
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
  
  const base64Image = await base64Promise;

  // 3. Analisa com Gemini
  const analysis = await analyzeImage(base64Image);

  return { analysis, imageUrl };
};

export const saveMealToHistory = async (userId: string, analysis: NutritionAnalysis, imageUrl: string) => {
  const { error: dbError } = await db.scans.save(userId, {
    date: new Date().toISOString().split('T')[0],
    item_name: analysis.item_name,
    calories: analysis.calories,
    protein: analysis.protein,
    carbs: analysis.carbs,
    fat: analysis.fat,
    fiber: analysis.fiber,
    score: analysis.score,
    score_label: analysis.score_label,
    recommendation: analysis.recommendation,
    image_url: imageUrl
  });

  if (dbError) throw new Error(`Erro ao salvar no banco: ${dbError.message}`);
};
