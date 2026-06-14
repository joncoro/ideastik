// Edge Function: crear-preferencia
// Crea una preferencia de Checkout Pro (pago único) para comprar un paquete de
// créditos. El frontend solo envía el id del pack; el precio lo decide el
// servidor (config.ts). Devuelve el `init_point` para redirigir.
//
// Los créditos se acreditan SOLO cuando el webhook confirma el pago aprobado.
import { corsHeaders, json } from '../_shared/cors.ts';
import { createPreference } from '../_shared/mp.ts';
import { CREDIT_PACKS, CURRENCY, appUrl } from '../_shared/config.ts';
import { requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const user = await requireUser(req);

    const { pack: packId } = await req.json().catch(() => ({ pack: null }));
    const pack = packId ? CREDIT_PACKS[packId] : null;
    if (!pack) return json({ error: 'Paquete inválido' }, 400);

    const base = appUrl(req);

    const preference = await createPreference({
      items: [
        {
          id: pack.id,
          title: `Ideastik — ${pack.title}`,
          quantity: 1,
          unit_price: pack.price,
          currency_id: CURRENCY,
        },
      ],
      // NO enviamos payer.email: si no coincide con el comprador logueado en
      // Mercado Pago, el checkout deshabilita el botón Pagar. Dejamos que MP use
      // la cuenta con la que el usuario inicia sesión.
      external_reference: user.id,
      // metadata viaja de vuelta en el pago: así el webhook sabe cuántos créditos acreditar.
      metadata: { user_id: user.id, tipo: 'credits', credits: pack.credits, pack: pack.id },
      back_urls: {
        success: `${base}/cuenta?pago=success`,
        failure: `${base}/cuenta?pago=failure`,
        pending: `${base}/cuenta?pago=pending`,
      },
      auto_return: 'approved',
      statement_descriptor: 'IDEASTIK',
    });

    return json({
      init_point: preference.init_point ?? preference.sandbox_init_point,
      preference_id: preference.id,
    });
  } catch (err) {
    console.error('[crear-preferencia]', err);
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return json({ error: msg }, msg === 'No autorizado' ? 401 : 500);
  }
});
