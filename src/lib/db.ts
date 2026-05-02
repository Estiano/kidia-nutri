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
      return { error: null };
    },
    update: async (userId: string, updates: any) => {
      if (supabase) {
        return supabase.from('profiles').update(updates).eq('id', userId);
      }
      // For mock, we can update the local storage
      const profileStr = localStorage.getItem('kidia_profile');
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        const updated = { ...profile, ...updates };
        localStorage.setItem('kidia_profile', JSON.stringify(updated));
      }
      return { error: null };
    },
    uploadAvatar: async (userId: string, file: File) => {
      if (supabase) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file);

        if (uploadError) return { data: null, error: uploadError };

        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
        return { data: publicUrl, error: null };
      }
      // Mock: Return a local blob URL
      return { data: URL.createObjectURL(file), error: null };
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
