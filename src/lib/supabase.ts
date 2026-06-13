import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Use localStorage on web (typeof check is reliable at runtime),
// expo-secure-store on native (dynamic import to avoid web bundling errors)
const isWeb = typeof localStorage !== 'undefined';

const storage = isWeb
  ? {
      getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
      removeItem: (key: string) => Promise.resolve(localStorage.removeItem(key)),
    }
  : {
      getItem: async (key: string) => {
        const { getItemAsync } = await import('expo-secure-store');
        return getItemAsync(key);
      },
      setItem: async (key: string, value: string) => {
        const { setItemAsync } = await import('expo-secure-store');
        await setItemAsync(key, value);
      },
      removeItem: async (key: string) => {
        const { deleteItemAsync } = await import('expo-secure-store');
        await deleteItemAsync(key);
      },
    };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
