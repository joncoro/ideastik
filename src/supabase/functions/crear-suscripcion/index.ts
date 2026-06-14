// Edge Function: crear-suscripcion
// Crea una suscripción mensual (preapproval) en Mercado Pago para el usuario
// autenticado y devuelve el `init_point` al que redirigir el navegador.
//
// La activación REAL del plan NO ocurre acá: ocurre cuando Mercado Pago confirma
// la autorización vía el webhook `mp-webhook`. Acá solo dejamos el preapproval
// creado y marcamos el plan como 'pending'.
import { corsHeaders, json } from '../_shared/cors.ts';
import { createPreapproval } from '../_shared/mp.ts';
import { PLAN_MENSUAL, CURRENCY, appUrl } from '../_shared/config.ts';
import { requireUser, adminClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const user = await requireUser(req);

    const backUrl = `${appUrl(req)}/cuenta?pago=suscripcion`;

    const preapproval = await createPreapproval({
      reason: PLAN_MENSUAL.reason,
      external_reference: user.id, // nos permite mapear el webhook al usuario
      payer_email: user.email,
      back_url: backUrl,
      auto_recurring: {
        frequency: PLAN_MENSUAL.frequency,
        frequency_type: PLAN_MENSUAL.frequencyType,
        transaction_amount: PLAN_MENSUAL.amount,
        currency_id: CURRENCY,
      },
      status: 'pending',
    });

    // Guardamos el id del preapproval y marcamos el plan como pendiente de pago.
    await adminClient()
      .from('profiles')
      .update({ mp_preapproval_id: preapproval.id, plan_status: 'pending' })
      .eq('id', user.id);

    return json({
      init_point: preapproval.init_point ?? preapproval.sandbox_init_point,
      preapproval_id: preapproval.id,
    });
  } catch (err) {
    console.error('[crear-suscripcion]', err);
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return json({ error: msg }, msg === 'No autorizado' ? 401 : 500);
  }
});
