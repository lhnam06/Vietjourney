import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const supabaseUrl =
  (import.meta as any)?.env?.VITE_SUPABASE_URL ||
  `https://${projectId}.supabase.co`;

const supabaseAnonKey =
  (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || publicAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

