// Configuración de precios y planes de Mercado Pago.
//
// La FUENTE DE VERDAD de los precios vive acá, en el servidor. El frontend solo
// envía el id del paquete; nunca un monto. Así un usuario no puede manipular el
// precio desde el navegador.
//
// Los valores se pueden sobreescribir por variables de entorno para no tener que
// redeployar al cambiar precios. Ajustá MP_CURRENCY a tu país:
// ARS (Argentina), CLP (Chile), MXN (México), COP (Colombia), BRL (Brasil),
// PEN (Perú), UYU (Uruguay).

function envNum(key: string, fallback: number): number {
  const v = Deno.env.get(key);
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const CURRENCY = Deno.env.get('MP_CURRENCY') ?? 'ARS';

// Plan mensual recurrente (preapproval).
export const PLAN_MENSUAL = {
  reason: 'Ideastik — Plan Mensual',
  amount: envNum('MP_PLAN_PRICE', 9900),
  frequency: 1,
  frequencyType: 'months' as const,
};

// Paquetes de créditos (pago único vía Checkout Pro).
// Clave = id que envía el frontend. `credits` = publicaciones que se acreditan.
export type CreditPack = { id: string; title: string; credits: number; price: number };

export const CREDIT_PACKS: Record<string, CreditPack> = {
  pack_10: {
    id: 'pack_10',
    title: 'Pack 10 publicaciones',
    credits: 10,
    price: envNum('MP_PACK_10_PRICE', 4900),
  },
  pack_30: {
    id: 'pack_30',
    title: 'Pack 30 publicaciones',
    credits: 30,
    price: envNum('MP_PACK_30_PRICE', 11900),
  },
  pack_60: {
    id: 'pack_60',
    title: 'Pack 60 publicaciones',
    credits: 60,
    price: envNum('MP_PACK_60_PRICE', 19900),
  },
};

// URL pública de la app, usada para construir las back_urls de retorno.
// Cae al header Origin de la request si no está seteada.
export function appUrl(req: Request): string {
  return Deno.env.get('APP_URL') ?? req.headers.get('origin') ?? 'https://ideastik.netlify.app';
}
