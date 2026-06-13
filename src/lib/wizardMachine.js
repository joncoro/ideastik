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
    question: "Interesante... ¿Qué dirías que es eso que te hace realmente diferente a tu competencia?",
    next: 'DATOS_SECTOR',
    field: 'diferente'
  },
  DATOS_SECTOR: {
    question: "Perfecto. ¿En qué sector clasificarías tu negocio?",
    next: 'DATOS_HORAS',
    field: 'sector',
    widget: 'chips',
    options: ['Gastronomía', 'Belleza', 'Salud', 'Tecnología', 'Moda', 'Servicios', 'Otro']
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
    prompt: "Genera 3 propuestas de valor. Responde SOLO con JSON válido y completo: {\"options\": [{\"tag\": \"Estratégica\", \"text\": \"máximo 12 palabras\"}]}"
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
    prompt: "Escribe una narrativa de marca corta (máximo 50 palabras). Responde SOLO con JSON válido: {\"narrativa\": \"texto\"}"
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
    prompt: "Genera exactamente 5 pilares de contenido. Cada 'desc' debe ser UNA sola frase de máximo 15 palabras. Responde SOLO con JSON válido y completo, sin texto adicional: {\"pilares\": [{\"tipo\": \"autoridad|conexion|venta|educacion\", \"nombre\": \"string corto\", \"desc\": \"una frase corta\"}]}"
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
    prompt: "Define la estrategia. Responde SOLO con JSON válido: {\"estrategia\": {\"canalPrincipal\": \"string\", \"frecuencia\": 3, \"horarios\": \"string\", \"tono\": \"string\"}}"
  },
  ESTRATEGIA_CONFIRMAR: {
    question: "¡Listo! Ya tenemos el mapa estratégico. ¿Damos el último paso?",
    next: 'DIAS_ELEGIR',
    widget: 'chips',
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
    prompt: "Genera 2 ideas por cada pilar seleccionado. Cada 'gancho' y 'desc' debe ser corto (máximo 12 palabras). Responde SOLO con JSON válido y completo: {\"ideas\": {\"NombrePilar\": [{\"gancho\": \"string\", \"desc\": \"string\", \"formato\": \"Reel|Carrusel|Historia\"}]}}"
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
