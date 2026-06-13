export function violaReglas(texto) {
  const t = (texto || "").toLowerCase();
  return /no vendemos .{1,40}vendemos/.test(t)
    || /no vendo .{1,40}vendo/.test(t)
    || /(mas barato|más barato|mejor precio|precios bajos)/.test(t)
    || /vendemos (tranquilidad|felicidad|confianza|paz)/.test(t);
}

export const validarPilares = (p) => p && p.length >= 3 && p.length <= 6;

export const validarCanales = (e) => !!(e && e.canalPrincipal);

export function validarBalance(posts) {
  if (!posts || posts.length === 0) return true;
  const c = {};
  posts.forEach(p => (c[p.pilarTipo] = (c[p.pilarTipo] || 0) + 1));
  const n = posts.length;
  return Object.values(c).every(v => v / n <= 0.4 && v / n >= 0.1);
}