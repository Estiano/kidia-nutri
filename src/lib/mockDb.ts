/**
 * Mock Database Layer for Kidia Nutri
 * Stores data in localStorage when Supabase is not configured.
 */

const STORAGE_KEYS = {
  PROFILE: 'kidia_profile',
  HISTORY: 'kidia_history',
  SESSION: 'kidia_session'
};

export const mockDb = {
  // --- Auth ---
  signUp: async (email: string, fullName: string) => {
    const id = Math.random().toString(36).substring(7);
    const session = { user: { id, email, user_metadata: { name: fullName } } };
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    
    const profile = { 
      id, 
      email, 
      name: fullName, 
      profile_type: 'self', 
      daily_calorie_target: 2000, 
      current_streak: 1,
      is_onboarded: true 
    };
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    
    return { data: { session, user: session.user }, error: null };
  },

  signIn: async (email: string) => {
    const sessionStr = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      if (session.user.email === email) {
        return { data: { session, user: session.user }, error: null };
      }
    }
    // Simple mock: allow any login if no session exists or different email
    return mockDb.signUp(email, email.split('@')[0]);
  },

  signOut: async () => {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    return { error: null };
  },

  getSession: async () => {
    const sessionStr = localStorage.getItem(STORAGE_KEYS.SESSION);
    return { data: { session: sessionStr ? JSON.parse(sessionStr) : null }, error: null };
  },

  // --- Profile ---
  getProfile: async (userId: string) => {
    const profileStr = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (profileStr) {
      const profile = JSON.parse(profileStr);
      if (profile.id === userId) return { data: profile, error: null };
    }
    return { data: null, error: null };
  },

  // --- History ---
  getScansToday: async (userId: string) => {
    const historyStr = localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]';
    const history = JSON.parse(historyStr);
    const today = new Date().toISOString().split('T')[0];
    const scansToday = history.filter((s: any) => s.user_id === userId && s.date === today);
    return { data: scansToday, error: null };
  },

  saveScan: async (userId: string, scan: any) => {
    const historyStr = localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]';
    const history = JSON.parse(historyStr);
    const newScan = { 
      ...scan, 
      id: Math.random().toString(36).substring(7),
      user_id: userId,
      created_at: new Date().toISOString()
    };
    history.push(newScan);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    return { data: newScan, error: null };
  }
};
