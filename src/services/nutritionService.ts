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
  score: number;
  score_label: string;
  recommendation: string;
}

export const analyzeImage = async (base64Image: string): Promise<NutritionAnalysis> => {
  const isDev = window.location.hostname.includes('googleusercontent.com') || 
                window.location.hostname.includes('run.app') ||
                window.location.hostname === 'localhost' ||
                window.location.hostname.includes('ais-') ||
                window.location.hostname.includes('aisstudio');

  if (isDev) {
    const ai = getGeminiAI();
    if (!ai) throw new Error("GEMINI_API_KEY não configurada.");
    
    const prompt = `Analise esta imagem de uma refeição e forneça os detalhes nutricionais em formato JSON. 
    Seja o mais preciso possível para um guia de saúde em Angola.
    Retorne um objeto com os campos: item_name (texto), calories (número), protein (número em g), carbs (número em g), fat (número em g), fiber (número em g), score (0-100), score_label (ex: Saudável, Moderado, Atenção), recommendation (uma frase curta de conselho).`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
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
  } else {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Falha na análise da IA');
    }

    return response.json();
  }
};

export const uploadAndAnalyze = async (
  file: File, 
  userId: string
): Promise<{ analysis: NutritionAnalysis; imageUrl: string }> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('meals')
    .upload(filePath, file);

  if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}. Certifica-te que o bucket 'meals' existe.`);

  const { data: { publicUrl } } = supabase.storage.from('meals').getPublicUrl(filePath);

  const base64Promise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
  const base64Image = await base64Promise;

  const analysis = await analyzeImage(base64Image);

  return { analysis, imageUrl: publicUrl };
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
