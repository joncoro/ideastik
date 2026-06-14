// Edge Function: cancelar-suscripcion
// Cancela en Mercado Pago la suscripción del usuario y baja su plan a FREE.
import { corsHeaders, json } from '../_shared/cors.ts';
import { cancelPreapproval } from '../_shared/mp.ts';
import { requireUser, adminClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const user = await requireUser(req);
    const admin = adminClient();

    const { data: profile } = await admin
      .from('profiles')
      .select('mp_preapproval_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.mp_preapproval_id) {
      return json({ error: 'No hay una suscripción activa' }, 400);
    }

    await cancelPreapproval(profile.mp_preapproval_id);

    await admin
      .from('profiles')
      .update({ plan: 'FREE', plan_status: 'cancelled' })
      .eq('id', user.id);

    return json({ ok: true });
  } catch (err) {
    console.error('[cancelar-suscripcion]', err);
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return json({ error: msg }, msg === 'No autorizado' ? 401 : 500);
  }
});
