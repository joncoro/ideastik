// Edge Function: mp-webhook
// Recibe las notificaciones de Mercado Pago y es la ÚNICA fuente de verdad para
// activar planes y acreditar créditos. Nunca confiamos en la back_url del navegador.
//
// Flujo:
//   1. Valida la firma (x-signature) con el Webhook Secret. Si no valida -> 401.
//   2. Según el tópico, consulta el recurso real en la API de MP (no confía en el body).
//   3. Actualiza profiles / payments con el Service Role (idempotente).
//   4. Responde 200 rápido para que MP no reintente en loop.
//
// IMPORTANTE: desplegar con --no-verify-jwt (MP no envía JWT de Supabase).
import { corsHeaders, json } from '../_shared/cors.ts';
import { validateSignature, getPayment, getPreapproval } from '../_shared/mp.ts';
import { adminClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = adminClient();
  const url = new URL(req.url);

  // El body trae la notificación; algunos tópicos también vienen por query params.
  let body: any = {};
  try {
    body = await req.json();
  } catch (_) { /* puede venir vacío */ }

  const topic = body?.type ?? body?.topic ?? url.searchParams.get('type') ?? url.searchParams.get('topic') ?? '';
  const dataId = String(body?.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '');

  // 1. Validar firma -----------------------------------------------------------
  const signatureValid = await validateSignature(req, dataId || null);

  // Auditoría cruda (siempre, válida o no).
  await admin.from('webhook_logs').insert({
    topic,
    resource_id: dataId,
    signature_valid: signatureValid,
    payload: body,
  });

  if (!signatureValid) {
    console.warn('[mp-webhook] Firma inválida. Rechazado.', { topic, dataId });
    return json({ error: 'firma inválida' }, 401);
  }

  try {
    // 2 + 3. Procesar según tópico ---------------------------------------------
    if (topic === 'payment') {
      await handlePayment(admin, dataId);
    } else if (topic.includes('preapproval') || topic === 'subscription_preapproval') {
      await handlePreapproval(admin, dataId);
    } else {
      console.log('[mp-webhook] Tópico ignorado:', topic);
    }
  } catch (err) {
    // No devolvemos 500: registramos y respondemos 200 para evitar tormenta de
    // reintentos. El log queda en webhook_logs / consola para reproceso manual.
    console.error('[mp-webhook] Error procesando', topic, dataId, err);
  }

  // 4. Responder rápido.
  return json({ received: true });
});

// --- Pago aprobado (compra de créditos o cuota de suscripción) --------------
async function handlePayment(admin: any, paymentId: string) {
  if (!paymentId) return;
  const payment = await getPayment(paymentId);
  if (payment?.status !== 'approved') {
    console.log('[mp-webhook] Pago no aprobado, se ignora:', payment?.status);
    return;
  }

  const userId: string | null = payment.metadata?.user_id ?? payment.external_reference ?? null;
  const tipo: string = payment.metadata?.tipo ?? 'credits';
  const credits = Number(payment.metadata?.credits ?? 0);

  // Idempotencia: insertamos el pago; si ya existe (mp_payment_id UNIQUE), no
  // volvemos a acreditar créditos.
  const { error: insertErr } = await admin.from('payments').insert({
    user_id: userId,
    mp_payment_id: String(payment.id),
    tipo,
    status: payment.status,
    amount: payment.transaction_amount,
    currency: payment.currency_id,
    credits_added: tipo === 'credits' ? credits : 0,
    raw: payment,
  });

  if (insertErr) {
    // Código 23505 = unique_violation -> ya procesado.
    if (insertErr.code === '23505') {
      console.log('[mp-webhook] Pago ya procesado, idempotente:', payment.id);
      return;
    }
    throw insertErr;
  }

  // Acreditar créditos sumando sobre el valor actual.
  if (tipo === 'credits' && credits > 0 && userId) {
    const { data: prof } = await admin
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .maybeSingle();
    const nuevos = Number(prof?.credits ?? 0) + credits;
    await admin.from('profiles').update({ credits: nuevos }).eq('id', userId);
    console.log(`[mp-webhook] +${credits} créditos a ${userId} (total ${nuevos})`);
  }
}

// --- Cambio de estado de la suscripción -------------------------------------
async function handlePreapproval(admin: any, preapprovalId: string) {
  if (!preapprovalId) return;
  const pre = await getPreapproval(preapprovalId);
  const userId: string | null = pre.external_reference ?? null;
  if (!userId) {
    console.warn('[mp-webhook] preapproval sin external_reference:', preapprovalId);
    return;
  }

  // Estados MP: authorized | paused | cancelled | pending
  const estado: string = pre.status;
  let update: Record<string, unknown>;

  if (estado === 'authorized') {
    update = {
      plan: 'MENSUAL',
      plan_status: 'active',
      mp_preapproval_id: preapprovalId,
      plan_started_at: new Date().toISOString(),
    };
  } else if (estado === 'paused') {
    update = { plan_status: 'paused' };
  } else if (estado === 'cancelled') {
    update = { plan: 'FREE', plan_status: 'cancelled' };
  } else {
    update = { plan_status: estado };
  }

  await admin.from('profiles').update(update).eq('id', userId);
  console.log(`[mp-webhook] Suscripción ${preapprovalId} -> ${estado} (user ${userId})`);
}
