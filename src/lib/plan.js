// Tope de negocios del plan Mensual. Se limita (en vez de ilimitado) para evitar
// que una sola cuenta pagada se comparta entre varios emprendedores y se diluya
// la monetización. Los MESES de parrilla sí son ilimitados en Mensual (ese es el
// valor del plan). Cambiar este número es lo único necesario para ajustar el tope.
export const LIMITE_NEGOCIOS_MENSUAL = 3;

// Límites por plan. FREE: 1 negocio y 1 mes (parrilla). MENSUAL: hasta N negocios, meses ilimitados.
export const PLAN_LIMITS = {
  FREE: { negocios: 1, meses: 1 },
  MENSUAL: { negocios: LIMITE_NEGOCIOS_MENSUAL, meses: Infinity },
};

export const limitesDe = (profile) => PLAN_LIMITS[profile?.plan] || PLAN_LIMITS.FREE;
export const esMensual = (profile) => (profile?.plan || 'FREE') === 'MENSUAL';
export const puedeCrearNegocio = (profile, cantidadActual = 0) => cantidadActual < limitesDe(profile).negocios;
export const puedeCrearMes = (profile, gridsActuales = 0) => gridsActuales < limitesDe(profile).meses;
