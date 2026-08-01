/**
 * BANCO DE TIPS DE REDES (BACKOFFICE — curado, no inventado por la IA).
 *
 * Fase 1 de "tips por sector": una biblioteca de buenas prácticas REALES y
 * accionables de redes sociales (algoritmo, contenido, crecimiento) que tú
 * mantienes. La IA solo las PERSONALIZA al negocio (sin inventar hechos). Así
 * el consejo es confiable: sale de esta lista, no de la imaginación del modelo.
 *
 * Cada tip:
 *   t: el consejo (accionable, concreto).
 *   cat: categoría (algoritmo | contenido | crecimiento | constancia | tendencia).
 *   sectores: a qué rubros aplica ('general' aplica a todos).
 */
export const BANCO_TIPS = [
  // — Generales (aplican a cualquier negocio) —
  { t: 'Los primeros 3 segundos deciden si se quedan. Empieza con el gancho, sin intros largas ni "hola a todos".', cat: 'contenido', sectores: ['general'] },
  { t: 'El video corto (Reel) llega a más gente nueva que las fotos estáticas. Prioriza al menos 1 video a la semana.', cat: 'algoritmo', sectores: ['general'] },
  { t: 'Guardar y compartir pesan más que el like. Crea contenido que la gente quiera guardar: listas, tips, cómo-hacer.', cat: 'algoritmo', sectores: ['general'] },
  { t: 'Responde los comentarios en la primera hora. El algoritmo premia la conversación temprana con más alcance.', cat: 'algoritmo', sectores: ['general'] },
  { t: 'Constancia le gana a intensidad: mejor 3 posts por semana siempre, que 10 una semana y nada la otra.', cat: 'constancia', sectores: ['general'] },
  { t: 'Pon subtítulos o texto en pantalla: la mayoría ve los videos sin sonido y se van si no entienden.', cat: 'contenido', sectores: ['general'] },
  { t: 'Publica cuando tu audiencia está activa. Mira tus horas pico en las estadísticas de la app y ajusta.', cat: 'crecimiento', sectores: ['general'] },
  { t: 'Un solo llamado a la acción por post. Si pides tres cosas, no hacen ninguna.', cat: 'contenido', sectores: ['general'] },
  { t: 'Usa 3 a 5 hashtags específicos de tu nicho, no los masivos genéricos donde tu post se pierde.', cat: 'crecimiento', sectores: ['general'] },
  { t: 'Muestra la cara y la persona detrás del negocio. La gente conecta con personas, no con logos.', cat: 'contenido', sectores: ['general'] },
  { t: 'Súbete pronto a un audio en tendencia adaptándolo a tu rubro: llegar temprano a la tendencia da alcance extra.', cat: 'tendencia', sectores: ['general'] },
  { t: 'Las Historias diarias mantienen tu cuenta "viva" ante tus seguidores aunque no subas al feed ese día.', cat: 'constancia', sectores: ['general'] },
  { t: 'Reutiliza tu mejor contenido: un Reel que funcionó se puede volver a publicar a los 2 o 3 meses.', cat: 'crecimiento', sectores: ['general'] },
  { t: 'Fija (pin) tus 3 mejores publicaciones que expliquen quién eres, qué vendes y por qué elegirte.', cat: 'crecimiento', sectores: ['general'] },
  { t: 'Colabora con otra cuenta de tu zona o rubro (un dueto, un en vivo, una mención): llegas a su audiencia gratis.', cat: 'crecimiento', sectores: ['general'] },
  { t: 'Regla 80/20: 80% aporta valor o entretiene, 20% vende. Nadie sigue una cuenta que solo pone ofertas.', cat: 'contenido', sectores: ['general'] },
  { t: 'Habla de un solo tema por post. Un mensaje claro se comparte; uno confuso se ignora.', cat: 'contenido', sectores: ['general'] },
  { t: 'Aprovecha las funciones nuevas de la plataforma apenas salen: suelen darles más alcance para promoverlas.', cat: 'algoritmo', sectores: ['general'] },
  { t: 'Haz preguntas en tus Historias (encuestas, cajita de preguntas): sube la interacción y te da ideas reales.', cat: 'crecimiento', sectores: ['general'] },

  // — Gastronomía / comida —
  { t: 'Muestra el proceso: el plato armándose, el queso estirándose, el vapor. El "cómo se hace" retiene y da hambre.', cat: 'contenido', sectores: ['gastronomia'] },
  { t: 'Graba primeros planos con buena luz natural. En comida, la imagen apetitosa vende más que cualquier texto.', cat: 'contenido', sectores: ['gastronomia'] },

  // — Moda / retail / tienda —
  { t: 'Muestra la prenda o el producto en movimiento y puesto, no solo en percha: el video en uso convierte más.', cat: 'contenido', sectores: ['moda'] },
  { t: 'Formatos que funcionan: "3 formas de combinar esto", el probador, y el antes/después de un look.', cat: 'contenido', sectores: ['moda'] },

  // — Belleza / estética —
  { t: 'Las transformaciones antes/después y los "prepárate conmigo" son de lo que más se comparte en belleza.', cat: 'contenido', sectores: ['belleza'] },

  // — Servicios / profesional / consultoría —
  { t: 'Comparte un error común que ves en tus clientes y cómo evitarlo: eso construye autoridad y confianza.', cat: 'contenido', sectores: ['servicios'] },
  { t: 'Responde en público la pregunta que más te hacen. Cada duda resuelta es contenido que atrae a más clientes.', cat: 'contenido', sectores: ['servicios'] },

  // — Tecnología / software / B2B —
  { t: 'Muestra casos de uso concretos y comparativas honestas. En B2B, la utilidad y el criterio venden más que la emoción.', cat: 'contenido', sectores: ['tecnologia'] },
  { t: 'El formato educativo (explicar algo bien) rinde mucho en LinkedIn; considera llevar tu mejor contenido ahí también.', cat: 'crecimiento', sectores: ['tecnologia'] },

  // — Salud / bienestar —
  { t: 'El formato "mito vs. realidad" funciona muy bien en salud. Aporta valor sin prometer resultados ni dar diagnósticos.', cat: 'contenido', sectores: ['salud'] },
];

/** Clasifica el sector (texto libre del negocio) en un bucket para elegir tips. */
export const sectorBucket = (sectorTexto = '') => {
  const s = (sectorTexto || '').toLowerCase();
  if (/gastro|comida|restaurante|café|cafe|panader|reposter|food|cocina|bar|heladeria|heladería/.test(s)) return 'gastronomia';
  if (/moda|ropa|boutique|tienda|retail|calzado|accesorio|joyer/.test(s)) return 'moda';
  if (/belleza|estética|estetica|peluquer|barber|spa|uñas|unas|maquill|cosmétic|cosmetic/.test(s)) return 'belleza';
  if (/tecnolog|software|saas|app|plataforma|b2b|ti\b|sistemas|desarrollo/.test(s)) return 'tecnologia';
  if (/salud|bienestar|nutric|médic|medic|psicolog|fitness|gimnasio|terapia|odontolog/.test(s)) return 'salud';
  if (/servici|consultor|profesional|abogad|legal|contab|financ|inmobili|agencia|arquitect|ingenier|educa|coach/.test(s)) return 'servicios';
  return 'general';
};

/** Número de semana estable (para rotar el tip cada semana). */
export const semanaActual = (d = new Date()) => Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000));

/**
 * Elige un tip para el negocio: prioriza los de su sector y cae a generales,
 * rotando con la semana (y con `offset` para "dame otro"). Determinístico.
 */
export const tipParaNegocio = (sectorTexto, seed = 0, offset = 0) => {
  const bucket = sectorBucket(sectorTexto);
  const especificos = BANCO_TIPS.filter(x => x.sectores.includes(bucket) && bucket !== 'general');
  const generales = BANCO_TIPS.filter(x => x.sectores.includes('general'));
  // Mezcla: primero los específicos del sector, luego generales (más variedad).
  const pool = especificos.length ? [...especificos, ...generales] : generales;
  if (pool.length === 0) return null;
  return pool[((seed + offset) % pool.length + pool.length) % pool.length];
};
