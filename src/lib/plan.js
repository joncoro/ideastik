// Límites por plan. FREE: 1 negocio y 1 mes (parrilla). MENSUAL: ilimitado.
export const PLAN_LIMITS = {
  FREE: { negocios: 1, meses: 1 },
  MENSUAL: { negocios: Infinity, meses: Infinity },
};

export const limitesDe = (profile) => PLAN_LIMITS[profile?.plan] || PLAN_LIMITS.FREE;
export const esMensual = (profile) => (profile?.plan || 'FREE') === 'MENSUAL';
export const puedeCrearNegocio = (profile, cantidadActual = 0) => cantidadActual < limitesDe(profile).negocios;
export const puedeCrearMes = (profile, gridsActuales = 0) => gridsActuales < limitesDe(profile).meses;
