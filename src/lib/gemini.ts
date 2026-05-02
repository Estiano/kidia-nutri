import { GoogleGenAI } from "@google/genai";

export const getGeminiAI = () => {
  // Try to get all possible keys from environment
  const keys = [
    (import.meta as any).env.VITE_GEMINI_API_KEY,
    (import.meta as any).env.VITE_GEMINI_API_KEY_1,
    (import.meta as any).env.VITE_GEMINI_API_KEY_2,
    (import.meta as any).env.VITE_GEMINI_API_KEY_3,
    (import.meta as any).env.VITE_GEMINI_API_KEY_4,
    (import.meta as any).env.VITE_GEMINI_API_KEY_5,
    (import.meta as any).env.VITE_GEMINI_API_KEY_6,
    (import.meta as any).env.VITE_GEMINI_API_KEY_7,
    (import.meta as any).env.VITE_GEMINI_API_KEY_8,
    (import.meta as any).env.VITE_GEMINI_API_KEY_9,
    process.env.GEMINI_API_KEY, // AI Studio fallback
    (process.env as any).KEY_API
  ].filter(k => k && k.length > 5 && k !== 'AI Studio Free Tier');

  if (keys.length === 0) return null;

  // Pick a random key
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return new GoogleGenAI({ apiKey: randomKey! });
};
