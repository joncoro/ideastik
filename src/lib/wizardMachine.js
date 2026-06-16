/**
 * Definición de fases. Prompts ajustados para JSON compacto y válido:
 * - Pilares: 5 (no 6) con desc de UNA frase corta, para que el JSON no se trunque.
 * - El resto igual; el manejo de cada formato se hace en ChatWizard.
 */
export const WIZARD_PHASES = {
  DATOS_NOMBRE: {
    question: "¡Hola! Soy tu estratega de Ideastik. Comencemos por lo básico. ¿Cómo se llama tu negocio o marca?",
    next: 'DATOS_CIUDAD',
    field: 'nombre'
  },
  DATOS_CIUDAD: {
    question: "¡Qué buen nombre! ¿En qué ciudad o país está ubicado?",
    next: 'DATOS_QUEHACE',
    field: 'ciudad'
  },
  DATOS_QUEHACE: {
    question: "¿Qué es exactamente lo que vendes o el servicio que prestas?",
    next: 'DATOS_QUE_DIFERENTE',
    field: 'que_hace'
  },
  DATOS_QUE_DIFERENTE: {
    question: "Interesante... ¿Qué te hace realmente diferente a tu competencia? Elige una idea para empezar o escríbela a tu manera.",
    next: 'DATOS_SECTOR',
    field: 'diferente',
    widget: 'suggest',
    options: ['Atención personalizada', 'Calidad y proceso cuidado', 'Conocimiento experto', 'Rapidez y cumplimiento', 'Experiencia única', 'Hecho a mano / artesanal']
  },
  DATOS_SECTOR: {
    question: "Perfecto. ¿En qué sector clasificarías tu negocio?",
    next: 'DATOS_CLIENTE',
    field: 'sector',
    widget: 'chips',
    options: ['Gastronomía', 'Belleza', 'Salud', 'Tecnología', 'Moda', 'Servicios', 'Otro']
  },
  DATOS_CLIENTE: {
    question: "Ahora lo importante: ¿a quién le vendes? Elige un punto de partida y complétalo (edad, qué le importa, qué problema tiene). Mientras mejor lo conozcas, mejor será tu estrategia.",
    next: 'DATOS_HORAS',
    field: 'cliente_ideal',
    widget: 'suggest',
    options: ['Jóvenes que buscan tendencia', 'Familias prácticas', 'Profesionales ocupados', 'Clientes premium y exigentes', 'Otros negocios (B2B)']
  },
  DATOS_HORAS: {
    question: "Entendido. ¿Cuántas horas a la semana podrías dedicarle a crear el contenido que vamos a planear?",
    next: 'PV_GENERAR',
    field: 'horas_semana',
    widget: 'chips',
    options: ['1-3 horas', '4-7 horas', 'Más de 8 horas']
  },
  PV_GENERAR: {
    question: "¡Excelente! Con esta información ya puedo empezar a trabajar. Dame un momento mientras diseño unas propuestas de valor estratégicas para ti...",
    next: 'PV_ELEGIR',
    isAuto: true,
    aiTask: 'pv_opciones',
    prompt: "Genera 3 propuestas de valor, cada una con un ángulo DISTINTO y en máximo 16 palabras. Ángulo 1 (Estratégica): la razón racional por la que eligen a este negocio y no a la alternativa (su criterio o categoría). Ángulo 2 (Emocional): cómo se siente o qué dice de sí mismo el cliente ideal al elegirlo. Ángulo 3 (Diferenciadora): el mecanismo concreto que la competencia no puede copiar fácil. Cada una debe nombrar el diferencial real (proceso, atención, conocimiento, entrega, asesoría o sistema), hablarle al cliente ideal y pasar la prueba: solo este negocio podría decirla. Prohibido: precio, clichés vacíos (calidad, pasión, los mejores) y la fórmula 'no vendemos X sino Y'. Responde SOLO con JSON válido y completo: {\"options\": [{\"tag\": \"Estratégica|Emocional|Diferenciadora\", \"text\": \"máximo 16 palabras\"}]}"
  },
  PV_ELEGIR: {
    question: "He diseñado estas propuestas basadas en tu diferencial. ¿Cuál resuena más contigo?",
    next: 'NARRATIVA_VOZ',
    field: 'propuesta_valor',
    widget: 'pv_options'
  },
  NARRATIVA_VOZ: {
    question: "Antes de escribir tu narrativa: ¿cómo quieres que se SIENTA tu marca cuando alguien la lee? Elige una vibra o descríbela con tus palabras.",
    next: 'NARRATIVA_GENERAR',
    field: 'voz_marca',
    widget: 'suggest',
    options: ['Cercana, como un amigo', 'Experta y confiable', 'Inspiradora y con energía', 'Cálida y sin juicio', 'Fresca y divertida', 'Premium y elegante']
  },
  NARRATIVA_GENERAR: {
    question: "¡Gran elección! Ahora redacto la narrativa de tu marca con la voz que pediste, para que todo suene a ti...",
    next: 'NARRATIVA_CONFIRMAR',
    isAuto: true,
    aiTask: 'narrativa',
    prompt: "Escribe la narrativa de marca en máximo 55 palabras, profundamente personalizada. Ánclala en tres cosas: el diferencial real, la propuesta de valor elegida y SOBRE TODO la 'Voz de marca' del system prompt. Lógica: (1) parte de una creencia o tensión real del cliente ideal; (2) muestra cómo este negocio la resuelve gracias a su diferencial; (3) cierra con lo que eso significa para el cliente. Debe sonar EXACTAMENTE con esa voz, ser tan precisa y propia que el dueño piense 'no lo habría sabido decir así de bien yo solo', sin clichés ni frases de catálogo. El 'tono' describe esa voz en una frase accionable. Responde SOLO con JSON válido: {\"narrativa\": \"texto\", \"tono\": \"una frase que describe el tono\"}"
  },
  NARRATIVA_CONFIRMAR: {
    question: "Aquí tienes el corazón de tu comunicación. ¿Qué te parece este enfoque?",
    next: 'PILARES_GENERAR',
    field: 'narrativa_ok',
    widget: 'chips',
    options: ['¡Me encanta!', 'Ajustemos algo']
  },
  PILARES_GENERAR: {
    question: "Perfecto. Ahora voy a definir los pilares de contenido que usaremos...",
    next: 'PILARES_ELEGIR',
    isAuto: true,
    aiTask: 'pilares',
    // 5 pilares, desc de UNA frase (máx 15 palabras): evita el truncamiento del JSON.
    prompt: "Genera exactamente 5 pilares de contenido: temas recurrentes y con NOMBRE PROPIO (tipo serie de contenido, con personalidad; nunca genérico como 'Tips' o 'Consejos'), cada uno conectado al diferencial del negocio y al cliente ideal. Da variedad usando estos tipos: autoridad (demuestra criterio/experticia), educacion (enseña algo útil), conexion (humaniza la marca o su historia), venta (muestra el producto/servicio sin sonar a anuncio) y prueba_social (clientes, resultados, testimonios). Cada 'desc' es UNA frase de máximo 15 palabras que explica qué tipo de posts viven en ese pilar. Responde SOLO con JSON válido y completo, sin texto adicional: {\"pilares\": [{\"tipo\": \"autoridad|conexion|venta|educacion|prueba_social\", \"nombre\": \"string corto y con personalidad\", \"desc\": \"una frase corta\"}]}"
  },
  PILARES_ELEGIR: {
    question: "Estos son los temas de los que hablaremos. Selecciona entre 3 y 5 pilares para tu estrategia:",
    next: 'ESTRATEGIA_GENERAR',
    field: 'pilares_seleccionados',
    widget: 'pilares_grid'
  },
  ESTRATEGIA_GENERAR: {
    question: "Configurando tu plan de publicación, frecuencias y tonos...",
    next: 'ESTRATEGIA_CONFIRMAR',
    isAuto: true,
    aiTask: 'estrategia',
    prompt: `Define la estrategia de publicación basándote en estas REGLAS DE MARKETING por tipo de negocio (adáptalas al negocio y su cliente ideal, sin atarlas a ninguna ciudad):
- Moda/ropa: reels de outfit y fotos con producto real, carruseles de catálogo; 4-5 por semana; canal principal Instagram, secundario TikTok, WhatsApp para cerrar venta.
- Gastronomía/comida: reels de preparación, fotos del plato, detrás de cámaras; 3-4 por semana; Instagram y TikTok, WhatsApp Business con catálogo.
- Belleza/accesorios/fragancias: reels de uso real, fotos cuidadas, carruseles de combinaciones; 4-5 por semana; Instagram principal, TikTok, web si tiene.
- Servicios personales (barbería, organización, estética, etc.): antes-y-después, testimonios en video, tutoriales cortos; 3 por semana; Instagram, WhatsApp Business, perfil de Google.
- Artesanos/hecho a mano: videos de proceso, fotos del taller, la historia de cada pieza; 3-4 por semana; Instagram y TikTok (alto potencial viral), web propia.
- B2B/servicios profesionales (consultoría, inmobiliaria, etc.): carruseles con datos, casos de cliente, posts de opinión; 2-3 por semana; LinkedIn principal, Instagram secundario, newsletter.
Para días y horas: razona según el COMPORTAMIENTO del cliente ideal y el tipo de negocio (ej. un negocio de consumo visual rinde en tardes/noches y fines de semana; un B2B rinde en días y horas laborales). Da 2 o 3 franjas concretas (día + hora) con su razón breve. NO inventes una ciudad. Elige UN canal principal y UN secundario; no más.
Responde SOLO con JSON válido: {"estrategia": {"canalPrincipal": "string", "canalSecundario": "string", "formatos": ["formato1","formato2"], "frecuencia": "ej. 3-4 por semana", "diasHoras": "días y franjas recomendadas con su razón breve", "tono": "string"}}`
  },
  ESTRATEGIA_CONFIRMAR: {
    question: "¡Listo! Este es tu mapa estratégico, hecho a la medida de tu negocio. ¿Damos el último paso?",
    next: 'DIAS_ELEGIR',
    widget: 'estrategia_card',
    options: ['¡Vamos!', 'Revisar detalles']
  },
  DIAS_ELEGIR: {
    question: "¿Qué día de este mes te gustaría que empezara tu calendario oficial?",
    next: 'IDEAS_GENERAR',
    widget: 'day_picker'
  },
  IDEAS_GENERAR: {
    question: "Generando las ideas creativas para cada uno de tus posts...",
    next: 'IDEAS_CONFIRMAR',
    isAuto: true,
    aiTask: 'ideas',
    prompt: "Genera 2 ideas de post por cada pilar seleccionado, detonadas por preguntas reales del negocio (qué decisión técnica tomas que el cliente no entiende, qué te llevó a empezar, qué tienes disponible, quién compró, qué mito existe en tu sector). Cada 'gancho' y 'desc' corto (máximo 14 palabras), específico al cliente ideal, nada genérico. Responde SOLO con JSON válido y completo: {\"ideas\": {\"NombrePilar\": [{\"gancho\": \"string\", \"desc\": \"string\", \"formato\": \"Reel|Carrusel|Historia\"}]}}"
  },
  IDEAS_CONFIRMAR: {
    question: "He llenado tu calendario con ideas aterrizadas. ¿Quieres ver cómo quedó todo?",
    next: 'PARRILLA_GENERAR',
    widget: 'chips',
    options: ['Ver mi parrilla']
  },
  PARRILLA_GENERAR: {
    question: "Organizando todo en tu calendario visual...",
    next: 'COMPLETADO',
    isAuto: true,
    aiTask: 'parrilla'
  },
  COMPLETADO: {
    question: "¡Felicidades! Tu estrategia y calendario de este mes están listos. ¡A darle con toda!",
    next: 'FIN'
  }
};

export const getNextPhase = (current) => WIZARD_PHASES[current]?.next || 'FIN';
