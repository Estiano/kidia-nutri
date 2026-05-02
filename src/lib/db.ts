import { supabase } from './supabase';
import { mockDb } from './mockDb';

export const db = {
  auth: {
    signUp: async (email: string, password: string, fullName: string, profileType: string) => {
      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: fullName, profile_type: profileType } }
        });
        return { data, error };
      }
      return mockDb.signUp(email, fullName);
    },
    signIn: async (email: string, password?: string) => {
      if (supabase) {
        return supabase.auth.signInWithPassword({ email, password: password || '' });
      }
      return mockDb.signIn(email);
    },
    signOut: async () => {
      if (supabase) return supabase.auth.signOut();
      return mockDb.signOut();
    },
    getSession: async () => {
      if (supabase) return supabase.auth.getSession();
      return mockDb.getSession();
    },
    onAuthStateChange: (callback: any) => {
      if (supabase) return supabase.auth.onAuthStateChange(callback);
      // For mock, we don't need a real listener but we can trigger it once
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  },
  
  profiles: {
    get: async (userId: string) => {
      if (supabase) {
        return supabase.from('profiles').select('*').eq('id', userId).single();
      }
      return mockDb.getProfile(userId);
    },
    insert: async (profile: any) => {
      if (supabase) {
        return supabase.from('profiles').insert([profile]);
      }
      // mockDb handles profile creation in signUp
      return { error: null };
    }
  },

  scans: {
    getToday: async (userId: string) => {
      const today = new Date().toISOString().split('T')[0];
      if (supabase) {
        return supabase.from('scan_history').select('*').eq('user_id', userId).eq('date', today);
      }
      return mockDb.getScansToday(userId);
    },
    save: async (userId: string, scan: any) => {
      if (supabase) {
        return supabase.from('scan_history').insert([{ ...scan, user_id: userId }]);
      }
      return mockDb.saveScan(userId, scan);
    }
  }
};
