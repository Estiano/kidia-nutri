import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getSupabaseCredentials = () => {
  const url = (import.meta as any).env.VITE_SUPABASE_URL;
  const key = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
  return { url, key };
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;

  const { url, key } = getSupabaseCredentials();

  if (!url || !key) {
    // Retornamos um mock ou lançamos um erro controlado apenas quando usado
    return null;
  }

  supabaseInstance = createClient(url, key);
  return supabaseInstance;
};

// Exportamos uma instância para manter compatibilidade, mas protegida contra null
export const supabase = getSupabase() as SupabaseClient;
