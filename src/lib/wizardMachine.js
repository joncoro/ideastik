/**
 * Definición de fases.
 * - DATOS_NOMBRE: única pregunta fija (necesaria para crear el negocio).
 * - ENTREVISTA: descubrimiento DINÁMICO conducido por la IA (una pregunta a la
 *   vez, repregunta cuando la respuesta es floja). El contrato JSON está en
 *   `interviewSystemPrompt`.
 * - El resto genera la estrategia con prompts del método Ideastik.
 */

/**
 * System prompt del entrevistador (fase ENTREVISTA). La IA conduce el
 * descubrimiento y responde SIEMPRE con uno de estos dos JSON:
 *  - Seguir:   {"accion":"preguntar","pregunta":"...","sugerencias":["chip"...]}
 *  - Terminar: {"accion":"finalizar","perfil":{...},"cierre":"..."}
 */
export const interviewSystemPrompt = (biz) => `Eres un estratega de marketing de contenidos senior entrevistando a un emprendedor para construir su estrategia. El negocio se llama "${biz?.nombre || 'su marca'}".

TU MISIÓN: entender el negocio EN PROFUNDIDAD. Haz UNA sola pregunta por turno, con tono cálido, cercano y experto (tuteo latino, frases cortas). Reconoce en una frase breve lo que te acaban de decir antes de preguntar lo siguiente.

DEBES DESCUBRIR (no lo preguntes como checklist, hazlo conversacional):
- qué vende o hace exactamente
- su diferencial REAL en la percepción del cliente (criterio, personalización, conocimiento, asesoría, sistema, cumplimiento) — NUNCA el precio
- sector
- ciudad o país
- cliente ideal CON DETALLE (quién es, edad/segmento, qué le importa, qué problema tiene, cuándo compra)
- objetivo de negocio (vender más, posicionarse, fidelizar, lanzar algo...)
- tono de marca deseado (cercano, premium, divertido, experto, etc.)
- cuántas horas por semana puede dedicarle al contenido

REGLA CLAVE — REPREGUNTA: si una respuesta es vaga o genérica ("ropa para niños", "calidad", "buen servicio", "todos"), NO la aceptes: repregunta UNA vez para profundizar (¿qué edades/segmento?, ¿qué problema concreto resuelves?, ¿qué haces distinto que el cliente sí nota?). No repreguntes el mismo punto más de una vez. Máximo ~8 preguntas en total. Cuando ya tengas material específico y suficiente, FINALIZA.

FORMATO (OBLIGATORIO): responde SOLO con JSON válido y completo, una de estas dos formas:
1) Para seguir entrevistando:
{"accion":"preguntar","pregunta":"texto cálido de UNA pregunta","sugerencias":["opción corta","..."]}
("sugerencias" es opcional: 0 a 4 chips cortos cuando ayuden a responder; si no aplican, usa [])
2) Para terminar:
{"accion":"finalizar","perfil":{"que_hace":"...","diferente":"...","sector":"...","ciudad":"...","cliente_ideal":"...","objetivo":"...","tono_marca":"...","horas_semana":"..."},"cierre":"frase de cierre entusiasta y breve"}
No agregues texto fuera del JSON.`;

export const WIZARD_PHASES = {
  DATOS_NOMBRE: {
    question: "¡Hola! Soy tu estratega de Ideastik. Voy a hacerte unas preguntas para entender bien tu negocio y construir una estrategia que de verdad te represente. Para arrancar: ¿cómo se llama tu negocio o marca?",
    next: 'ENTREVISTA',
    field: 'nombre'
  },
  ENTREVISTA: {
    // Fase de descubrimiento dinámico. La maneja runInterview() en ChatWizard.
    isInterview: true,
    next: 'PV_GENERAR'
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
    next: 'NARRATIVA_GENERAR',
    field: 'propuesta_valor',
    widget: 'pv_options'
  },
  NARRATIVA_GENERAR: {
    question: "¡Gran elección! Ahora estoy redactando la narrativa de tu marca para que tus mensajes sean coherentes...",
    next: 'NARRATIVA_CONFIRMAR',
    isAuto: true,
    aiTask: 'narrativa',
    prompt: "Escribe la narrativa de marca en máximo 55 palabras con esta lógica: (1) parte de una creencia o tensión real del cliente ideal; (2) muestra cómo este negocio la resuelve gracias a su diferencial; (3) cierra con lo que eso significa para el cliente. Que suene humana, específica y coherente con la propuesta de valor elegida; nada de frases de catálogo ni clichés. Define además el REGISTRO DE TONO según el negocio y cliente (cercano y de tú a tú para moda/belleza/consumo; empático y sin juicio para servicios personales y del hogar; profesional pero humano y con datos para B2B y servicios profesionales). Responde SOLO con JSON válido: {\"narrativa\": \"texto\", \"tono\": \"una frase que describe el tono recomendado\"}"
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
