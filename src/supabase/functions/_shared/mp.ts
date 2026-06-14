// Helpers para hablar con la API REST de Mercado Pago y para validar la firma
// de los webhooks. El Access Token es SECRETO y solo se lee desde el entorno
// del servidor (nunca llega al navegador).

const MP_BASE = 'https://api.mercadopago.com';

export function accessToken(): string {
  const token = Deno.env.get('MP_ACCESS_TOKEN');
  if (!token) throw new Error('Falta MP_ACCESS_TOKEN en el entorno');
  return token;
}

// Wrapper genérico sobre la API de Mercado Pago.
async function mpFetch(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${MP_BASE}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${accessToken()}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (_) {
    body = text;
  }

  if (!res.ok) {
    console.error('[MP API ERROR]', res.status, path, body);
    throw new Error(`Mercado Pago ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

// --- Suscripciones (preapproval) -------------------------------------------

export function createPreapproval(payload: Record<string, unknown>) {
  return mpFetch('/preapproval', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getPreapproval(id: string) {
  return mpFetch(`/preapproval/${id}`);
}

export function cancelPreapproval(id: string) {
  return mpFetch(`/preapproval/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'cancelled' }),
  });
}

// --- Checkout Pro (preferences) y pagos -------------------------------------

export function createPreference(payload: Record<string, unknown>) {
  return mpFetch('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getPayment(id: string) {
  return mpFetch(`/v1/payments/${id}`);
}

// --- Validación de firma del webhook ----------------------------------------
//
// Mercado Pago firma cada notificación. El header `x-signature` trae
// `ts=<timestamp>,v1=<hmac_sha256_hex>`. El manifiesto a firmar es:
//   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
// (omitiendo los segmentos cuyo valor no exista). La clave es el
// "Secreto de la firma" (Webhook Secret) que configurás en el panel de MP.

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function validateSignature(
  req: Request,
  dataId: string | null,
): Promise<boolean> {
  const secret = Deno.env.get('MP_WEBHOOK_SECRET');
  if (!secret) {
    console.warn('[MP] MP_WEBHOOK_SECRET no configurado: no se puede validar la firma.');
    return false;
  }

  const xSignature = req.headers.get('x-signature') ?? '';
  const xRequestId = req.headers.get('x-request-id') ?? '';

  // Parsear ts y v1 del header.
  const parts: Record<string, string> = {};
  for (const piece of xSignature.split(',')) {
    const [k, v] = piece.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  }
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  // Construir el manifiesto. data.id se pasa en minúsculas si es alfanumérico.
  const idPart = dataId ? `id:${dataId.toLowerCase()};` : '';
  const reqPart = xRequestId ? `request-id:${xRequestId};` : '';
  const manifest = `${idPart}${reqPart}ts:${ts};`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const macBuf = await crypto.subtle.sign('HMAC', key, enc.encode(manifest));
  const computed = [...new Uint8Array(macBuf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return constantTimeEqual(computed, v1);
}
