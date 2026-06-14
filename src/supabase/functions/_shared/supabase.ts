// Clientes de Supabase para las Edge Functions.
// - `userClient`: respeta el JWT del usuario (RLS activo). Sirve para saber QUIÉN llama.
// - `adminClient`: usa el Service Role (bypassa RLS). Solo para escrituras del webhook.
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Cliente con el contexto del usuario que invoca la función.
export function userClient(req: Request): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
}

// Cliente administrador (Service Role). NO exponer nunca al navegador.
export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// Devuelve el usuario autenticado o lanza si no hay sesión válida.
export async function requireUser(req: Request) {
  const supabase = userClient(req);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('No autorizado');
  return user;
}
