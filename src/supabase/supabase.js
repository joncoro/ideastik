import { createClient } from '@supabase/supabase-js';

// Limpieza agresiva de variables para evitar errores de red
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('CRITICAL: Supabase environment variables are missing or malformed.');
}

export default createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co', 
  SUPABASE_ANON_KEY || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);