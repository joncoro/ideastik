/**
 * Cliente de pagos (Mercado Pago) — invoca las Edge Functions de Supabase.
 *
 * El navegador NUNCA ve el Access Token: solo llama a las funciones, que corren
 * en el servidor con el secreto. El usuario va autenticado automáticamente
 * porque supabase.functions.invoke adjunta el JWT de la sesión.
 */
import supabase from '../supabase/supabase';

// Paquetes de créditos para mostrar en la UI. El precio REAL lo valida el
// servidor (config.ts); acá solo es para presentación. Mantener los ids en sync.
export const CREDIT_PACKS = [
  { id: 'pack_10', credits: 10, label: '10 publicaciones', price: 9900 },
  { id: 'pack_30', credits: 30, label: '30 publicaciones', price: 39900, destacado: true },
  { id: 'pack_60', credits: 60, label: '60 publicaciones', price: 79900 },
];

export const PLAN_MENSUAL_PRECIO = 19900;
export const MONEDA = 'COP';

/** Inicia la suscripción mensual y redirige a Mercado Pago. */
export async function iniciarSuscripcion() {
  const { data, error } = await supabase.functions.invoke('crear-suscripcion');
  if (error) throw new Error(error.message || 'No se pudo iniciar la suscripción');
  if (!data?.init_point) throw new Error('Mercado Pago no devolvió un punto de pago');
  window.location.href = data.init_point;
}

/** Inicia la compra de un paquete de créditos y redirige a Mercado Pago. */
export async function comprarCreditos(packId) {
  const { data, error } = await supabase.functions.invoke('crear-preferencia', {
    body: { pack: packId },
  });
  if (error) throw new Error(error.message || 'No se pudo iniciar el pago');
  if (!data?.init_point) throw new Error('Mercado Pago no devolvió un punto de pago');
  window.location.href = data.init_point;
}

/** Cancela la suscripción activa del usuario. */
export async function cancelarSuscripcion() {
  const { data, error } = await supabase.functions.invoke('cancelar-suscripcion');
  if (error) throw new Error(error.message || 'No se pudo cancelar la suscripción');
  return data;
}

/** Formatea un monto con la moneda configurada. */
export function formatearPrecio(valor) {
  try {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: MONEDA, maximumFractionDigits: 0 }).format(valor);
  } catch (_) {
    return `$${valor}`;
  }
}
