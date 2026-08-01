/**
 * BANCO DE FORMATOS DE CONTENIDO (BACKOFFICE — no se muestra al usuario).
 *
 * Es la "materia prima" que alimenta al generador de parrilla para que cada mes
 * salga variado y con efecto WOW. El usuario NUNCA ve esta lista: solo recibe
 * ideas ya cocinadas, específicas a su negocio y con su voz. Aquí solo viven los
 * ÁNGULOS/FORMATOS (el "qué tipo de post"), que la IA adapta a cada marca.
 *
 * Cada entrada:
 *   a: ángulo/formato en español (la IA lo adapta, NO lo copia literal).
 *   t: tipos de pilar a los que sirve (autoridad | conexion | venta |
 *      prueba_social | educacion). Debe coincidir con los tipos de los pilares.
 *   venta: true si es contenido promocional (cuenta para el 20% de la regla 80/20).
 */
export const BANCO_IDEAS = [
  { a: 'una foto o historia personal detrás de la marca', t: ['conexion'] },
  { a: 'una frase o historia que inspire de verdad (sin clichés)', t: ['conexion'] },
  { a: 'algo divertido y cercano de tu día a día', t: ['conexion'] },
  { a: 'foto de producto acompañada de su promoción', t: ['venta'], venta: true },
  { a: 'el testimonio real de un cliente', t: ['prueba_social'] },
  { a: 'desmontar un error o mito común de tu sector', t: ['autoridad', 'educacion'] },
  { a: 'una encuesta rápida para tu audiencia', t: ['educacion', 'conexion'] },
  { a: 'una historia que conecte y lleve a tu otro canal', t: ['conexion'] },
  { a: 'un dato visual (infografía) útil de tu nicho', t: ['educacion'] },
  { a: 'un sorteo o dinámica para ganar algo', t: ['venta'], venta: true },
  { a: 'un descubrimiento reciente (lugar, herramienta, producto)', t: ['conexion'] },
  { a: 'una novedad o noticia relevante para tu cliente', t: ['educacion', 'autoridad'] },
  { a: 'un recordatorio de un evento o fecha que se acerca', t: ['educacion'] },
  { a: 'el lanzamiento de un producto nuevo mostrado en video', t: ['venta'], venta: true },
  { a: 'tus formas favoritas de desconectar del trabajo', t: ['conexion'] },
  { a: 'un post de preguntas y respuestas', t: ['educacion'] },
  { a: 'datos curiosos sobre ti y tu equipo', t: ['conexion'] },
  { a: 'un recuerdo o "antes y después" de la marca', t: ['conexion'] },
  { a: 'un truco práctico explicado paso a paso', t: ['educacion'] },
  { a: 'un video o artículo que enseñe algo de tu rubro', t: ['educacion'] },
  { a: 'un descuento u oferta especial', t: ['venta'], venta: true },
  { a: 'responder la pregunta que más te hacen', t: ['educacion'] },
  { a: 'un "prepárate conmigo" mostrando tu rutina de trabajo', t: ['conexion'] },
  { a: 'una estadística de tu sector y tu lectura experta de ella', t: ['autoridad', 'educacion'] },
  { a: 'compartir el contenido de alguien y aportar tu comentario', t: ['autoridad', 'conexion'] },
  { a: 'una charla o entrevista con alguien que sabe del tema', t: ['autoridad'] },
  { a: 'un día en tu trabajo, de principio a fin', t: ['conexion'] },
  { a: 'presentar a la mascota del negocio (si aplica)', t: ['conexion'] },
  { a: 'cómo son tus fines de semana o tu descanso', t: ['conexion'] },
  { a: 'un adelanto (teaser) de algo que viene', t: ['venta'], venta: true },
  { a: 'tus pasatiempos fuera del trabajo', t: ['conexion'] },
  { a: 'una experiencia con la que tu cliente se identifique', t: ['conexion'] },
  { a: 'un "cómo se hace" rápido en foto o video', t: ['educacion'] },
  { a: 'un anuncio importante de la marca', t: ['conexion'] },
  { a: 'una idea que haga pensar a tu cliente', t: ['autoridad', 'educacion'] },
  { a: 'una pregunta directa a tu audiencia', t: ['conexion', 'educacion'] },
  { a: 'subirte a una tendencia adaptándola a tu negocio', t: ['conexion'] },
  { a: 'abrir un "pregúntame lo que quieras"', t: ['educacion', 'conexion'] },
  { a: 'un libro o recurso que te está aportando', t: ['autoridad', 'conexion'] },
  { a: 'un tip o truco poco conocido de tu oficio', t: ['educacion', 'autoridad'] },
  { a: 'los bloopers o errores graciosos del día a día', t: ['conexion'] },
  { a: 'un vistazo detrás de cámaras de tu espacio de trabajo', t: ['conexion'] },
  { a: 'un agradecimiento sincero a tus clientes', t: ['prueba_social', 'conexion'] },
  { a: 'celebrar un logro o hito del negocio', t: ['prueba_social'] },
  { a: 'promocionar directamente tu producto o servicio', t: ['venta'], venta: true },
  { a: 'hablar de una persona que te inspira', t: ['conexion'] },
  { a: 'tomar postura sobre un tema serio de tu sector', t: ['autoridad', 'conexion'] },
  { a: 'una foto de un lugar nuevo que visitaste', t: ['conexion'] },
  { a: 'tus libros, películas o series favoritos', t: ['conexion'] },
  { a: 'una foto en familia o del equipo', t: ['conexion'] },
  { a: 'una foto con un cliente feliz', t: ['prueba_social'] },
  { a: 'una asesoría 1-a-1 para quien comparta tu producto', t: ['venta', 'prueba_social'], venta: true },
  { a: 'compartir lo último de tu canal principal', t: ['conexion'] },
  { a: 'una foto de tus inicios (el "día uno")', t: ['conexion'] },
  { a: 'presentar a tu equipo y qué hace cada uno', t: ['conexion', 'prueba_social'] },
  { a: 'lanzar un reto a tu comunidad', t: ['conexion', 'educacion'] },
  { a: 'un juego tipo "¿esto o aquello?"', t: ['conexion'] },
  { a: 'tu rutina de la mañana antes de abrir', t: ['conexion'] },
  { a: 'hacks de productividad que de verdad usas', t: ['educacion'] },
  { a: 'una miniserie de posts o mini-curso', t: ['educacion'] },
  { a: 'pedir recomendaciones a tu audiencia', t: ['conexion'] },
  { a: 'un fracaso del negocio y cómo saliste más fuerte', t: ['autoridad', 'conexion'] },
  { a: 'reaccionar o comentar el post de alguien de tu sector', t: ['conexion', 'autoridad'] },
  { a: 'comentar un hecho de actualidad desde tu experiencia', t: ['autoridad', 'educacion'] },
  { a: 'una opinión propia y bien argumentada', t: ['autoridad', 'conexion'] },
  { a: 'una foto de viaje o de un lugar que te marcó', t: ['conexion'] },
  { a: 'una serie o contenido que te tiene enganchado', t: ['conexion'] },
  { a: 'mostrar lo nuevo que llegó (novedades / haul)', t: ['conexion', 'venta'] },
  { a: 'un post especial por una fecha o festivo', t: ['conexion', 'venta'] },
  { a: 'tus metas o propósitos y a qué te comprometes', t: ['conexion'] },
];

/** Semilla mensual: hace que las sugerencias roten mes a mes (frescura). */
export const semillaMes = (d = new Date()) => d.getFullYear() * 12 + d.getMonth();

/**
 * Devuelve `n` ángulos variados para un tipo de pilar, rotando de forma
 * determinística según la semilla (mismo mes → mismas sugerencias; mes distinto
 * → set distinto). Si `permitirVenta` es false, excluye los formatos de venta
 * (para respetar la regla 80/20: solo el pilar de venta remata con CTA).
 */
export const sugerirAngulos = (tipo, n = 3, seed = 0, permitirVenta = false) => {
  const pool = BANCO_IDEAS.filter((x) => x.t.includes(tipo) && (permitirVenta || !x.venta));
  if (pool.length === 0) return [];
  const step = Math.max(1, Math.floor(pool.length / Math.max(1, n)));
  const out = [];
  for (let i = 0; i < n; i++) out.push(pool[(seed + i * step) % pool.length].a);
  return [...new Set(out)];
};
