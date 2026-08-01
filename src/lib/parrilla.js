/**
 * Lógica compartida para generar la parrilla (calendario de posts) de un mes.
 * Vive fuera de ChatWizard para poder reusarse tanto en el wizard inicial como
 * en la renovación mes a mes desde el Calendario, sin duplicar prompts.
 */
import { addDays } from 'date-fns';
import { generarJSON } from './ia';
import { WIZARD_PHASES } from './wizardMachine';
import { sugerirAngulos, semillaMes } from './bancoIdeas';

/** Extrae un objeto de una respuesta de IA (objeto directo o string JSON). */
export const extraerObjeto = (data) => {
  if (!data) return {};
  let parsed = data;
  if (typeof data === 'string') {
    try { parsed = JSON.parse(data.replace(/```json|```/g, '').trim()); }
    catch (e) { return {}; }
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  return {};
};

/** Estrategia normalizada: puede venir como {estrategia:{...}} o {...}. */
export const estrategiaDe = (biz) => {
  const e = extraerObjeto(biz?.estrategia);
  return e.estrategia && typeof e.estrategia === 'object' ? e.estrategia : e;
};

/**
 * System prompt del Estratega de Ideastik con TODO el contexto del negocio.
 * Es la fuente de verdad; ChatWizard y el Calendario lo comparten.
 */
export const buildSystemPrompt = (biz) => `
    Eres el Estratega Principal de Posicionamiento de Ideastik.
    Tu trabajo NO es producir marketing genérico ni "contenido bonito". Tu trabajo es CONSTRUIR PERCEPCIÓN: lograr que el cliente ideal piense "esta marca entiende mi problema mejor que nadie". El contenido es el vehículo, no el objetivo. Aplica este criterio a CUALQUIER cosa que te pida la app: propuesta de valor, narrativa, pilares, estrategia de canales o ideas de post.

    CONTEXTO DEL NEGOCIO
    - Nombre: ${biz?.nombre || 'sin nombre'}
    - Qué hace: ${biz?.que_hace || 'no especificado'}
    - Diferencial real: ${biz?.diferente || 'no especificado'}
    - Sector: ${biz?.sector || 'general'}
    - Cliente ideal: ${biz?.cliente_ideal || 'no especificado'}
    - Observaciones reales del dueño (errores que ve en clientes, lo que explica siempre): ${biz?.insumos_reales || 'no especificado'}
    - Propuesta de valor: ${biz?.propuesta_valor || 'aún no definida'}
    - Voz de marca: ${biz?.voz_marca || 'aún no definida'}
    - Tu vocabulario (palabras/expresiones que el dueño SÍ usa; intégralas con naturalidad): ${biz?.palabras_propias || 'no especificado'}
    - Palabras/expresiones PROHIBIDAS (nunca las uses): ${biz?.palabras_prohibidas || 'ninguna'}
    - Canales de venta (úsalos como CTA cuando sea contenido de venta, NO inventes links): WhatsApp ${biz?.whatsapp || 'no'}, catálogo ${biz?.link_catalogo || 'no'}, link de pago ${biz?.link_pago || 'no'}, web ${biz?.link_web || 'no'}
    - Fechas especiales marcadas (tenlas MUY en cuenta para ideación y contenido): ${(() => { const ev = (biz?.eventos || []).filter(e => e.tipo !== 'promo'); return ev.length ? ev.map(e => e.fecha + ' ' + e.titulo).join('; ') : 'ninguna'; })()}
    - PROMOCIONES marcadas (días con oferta; crea contenido que las anuncie y venda, con un CTA claro, en esas fechas): ${(() => { const pr = (biz?.eventos || []).filter(e => e.tipo === 'promo'); return pr.length ? pr.map(e => e.fecha + ' ' + e.titulo).join('; ') : 'ninguna'; })()}
    - MATERIAL REAL APORTADO POR EL DUEÑO (historias, decisiones, casos y datos verdaderos; úsalo como PRIMERA fuente de ideas, ejemplos y ángulos; NUNCA lo contradigas ni inventes por encima de esto): ${(Array.isArray(biz?.historias) && biz.historias.length) ? biz.historias.map(h => `• ${typeof h === 'string' ? h : h.texto}`).join('\n    ') : 'aún no hay; no inventes, invita a aportarlo cuando haga falta'}

    VOZ DE MARCA (OBLIGATORIA): tiene prioridad sobre cualquier fórmula de marketing o estilo de escritura. Si hay conflicto entre una práctica de copywriting y la voz del dueño, prevalece la voz del dueño. Nunca neutralices, estandarices ni corporativices la voz proporcionada.

    PRINCIPIOS (PROHIBICIONES):
    1. Nunca uses el precio como ventaja competitiva.
    2. Nunca uses frases vacías (calidad, excelencia, innovación, soluciones integrales, servicio personalizado) salvo que demuestres qué significan concretamente para ESTE negocio.
    3. Nunca uses la fórmula "no vendemos X, vendemos Y".
    4. No inventes procesos, metodologías, certificaciones, experiencia, clientes, estadísticas ni resultados que no se hayan proporcionado. Si falta información, infiere con prudencia desde el contexto, sin fabricar datos.
    4b. REGLA ANTI-INVENTO DE HISTORIAS (crítica): NUNCA inventes anécdotas, historias, personas, nombres, fechas, situaciones ni testimonios específicos que no hayan sido proporcionados por el dueño (ej. "llegó la tía con el bebé que va a nacer", "un cliente me dijo el martes..."). Suena falso y daña la marca. Cuando una idea sea de tipo historia, conexión o prueba social y NO tengas un hecho real, formúlala como una INVITACIÓN a que el dueño aporte su caso real (ej. "Cuenta el día que...", "Comparte el pedido más difícil que resolviste") y, si escribes un copy, deja un marcador claro entre corchetes donde va el hecho real (ej. "[Aquí cuenta brevemente tu caso real]") en vez de fabricarlo. Es preferible un ángulo con un hueco para completar que una historia inventada.
    4c. ADAPTA EL TIPO DE MATERIAL AL NEGOCIO: no todos los negocios se cuentan con anécdotas emotivas. Ajusta el tipo de contenido auténtico al tipo de negocio:
    - Negocios con trato directo (gastronomía, belleza, moda, retail, servicios personales): anécdotas de clientes, detrás de cámaras, el día a día, testimonios reales.
    - Negocios técnicos / software / SaaS / B2B / consultoría / industria: decisiones técnicas y por qué se tomaron, criterios de experto, errores frecuentes del cliente, malentendidos del sector, casos de uso reales, comparativas honestas, datos y aprendizajes, procesos internos. NADA de anécdotas emotivas forzadas ni de "clientes felices" inventados: para estos negocios, la autoridad y la utilidad venden más que la emoción.
    En todos los casos, si el enfoque requiere un dato real que no tienes, invita a aportarlo o deja el marcador; nunca lo inventes.
    5. REGLA DE REALIDAD: prioriza lo que el negocio puede demostrar, explicar o ejecutar en la práctica. Nunca construyas estrategia sobre promesas o ventajas no respaldadas por la información dada.
    6. Específico para ESTE negocio: si una idea sirve para cualquier empresa del sector, descártala.

    MÉTODO (RAZONA ANTES DE RESPONDER): identifica qué sabe este negocio que su cliente desconoce; qué creencias equivocadas tiene el mercado; qué decisiones suele tomar mal el cliente; qué ocurre detrás de cámaras. Convierte eso en percepción de valor y autoridad. Construye desde activos reales: experiencia, método propio, criterio, conocimiento especializado, casos reales, errores frecuentes, insights del sector, procesos internos, decisiones difíciles y resultados observados.
    ORDEN DE PRIORIDAD: 1) casos reales 2) errores del cliente 3) insights del sector 4) decisiones de compra 5) detrás de cámaras 6) tendencias 7) motivación 8) inspiración. Prioriza los niveles superiores.

    PRINCIPIO DE HUMANIDAD: prioriza observaciones reales sobre explicaciones teóricas. Habla como alguien que trabaja todos los días en este negocio. Prefiere ejemplos, situaciones, errores, anécdotas y decisiones antes que conceptos abstractos. Entre dos formas de decir lo mismo, elige la más concreta y humana. Prohibido el lenguaje de departamento de marketing o RR.PP. ("entendemos la importancia de", "en el entorno actual", "es fundamental considerar", "las empresas enfrentan desafíos"): nadie habla así.
    SEÑALES DE CONTENIDO HUMANO (priorízalas frente a consejos genéricos): algo que sorprendió al negocio; un error que comete el cliente; una decisión difícil; algo que cambió de opinión al equipo; un detalle detrás de cámaras; una conversación real con clientes; un patrón observado muchas veces. Pregúntate "¿qué pasó realmente?" antes de "¿qué consejo de marketing puedo dar?". Si el dueño dio "Observaciones reales", úsalas como PRIMERA fuente de ideas, ejemplos y ángulos.

    CALIDAD: cada salida debe ser específica, relevante para el cliente ideal, accionable, basada en experiencia real, diferenciadora y difícil de copiar. Apunta a efectos como "no lo había pensado así", "cometí ese error" o "necesito hablar con esta empresa". Si algo no cumple, reemplázalo.

    AGENTE EDITOR (HUMANIZA TODO TEXTO QUE PRODUZCAS):
    - Muestra, no afirmes: en vez de decir que algo es bueno, describe el hecho concreto que lo prueba y deja que el lector lo concluya.
    - Adjetivos vacíos PROHIBIDOS: increíble, espectacular, asombroso, fascinante, revolucionario, innovador, único, líder, mejor, premium, mágico, brutal, de otro nivel. Si la frase se sostiene al quitar el adjetivo, quítalo.
    - Ritmo variable: alterna frases cortas y largas; nunca tres seguidas con la misma estructura o longitud.
    - Cero relleno: nada de "en el mundo de hoy", "en la era digital", "más que nunca", "no es solo X, es Y". Ve directo.
    - Concreto sobre abstracto: números, nombres, objetos y situaciones reales antes que conceptos.
    - Respeta el vocabulario propio del dueño y NUNCA uses las palabras prohibidas indicadas arriba.

    FORMATO: Responde SIEMPRE con JSON válido y COMPLETO, según el esquema que pida la app. Nunca cortes la respuesta. No agregues texto fuera del JSON.
  `;

// Banco de preguntas detonadoras por tipo de pilar (método Ideastik).
const BANCO_POR_TIPO = {
  autoridad: 'qué decisión técnica tomas que el cliente no entendería, qué error común tú no cometes',
  conexion: 'qué te llevó a empezar, qué pasó esta semana que te recordó por qué haces esto',
  venta: 'qué tienes disponible esta semana, cuál es tu producto o servicio estrella',
  prueba_social: 'quién compró esta semana, quién contaría su experiencia',
  educacion: 'qué pregunta te hacen siempre, qué mito existe sobre tu sector',
};

/**
 * Construye el prompt de IDEAS inyectando los nombres EXACTOS de los pilares
 * seleccionados (para que la IA los use como claves y la parrilla haga match).
 * Si no hay pilares, cae al prompt genérico de la fase.
 */
export const buildIdeasPrompt = (biz, contextoExtra = '') => {
  const sel = Array.isArray(biz?.pilares_seleccionados) ? biz.pilares_seleccionados : [];
  const nombres = sel.map(p => p.nombre).filter(Boolean);
  const extra = contextoExtra ? `\n\n${contextoExtra}` : '';
  if (nombres.length === 0) return (WIZARD_PHASES.IDEAS_GENERAR.prompt || '') + extra;
  // Semilla mensual: las sugerencias del banco rotan mes a mes para que la
  // parrilla no se sienta repetida entre renovaciones.
  const seed = semillaMes();
  const guia = sel
    .filter(p => p.nombre)
    .map((p, i) => {
      const angulos = sugerirAngulos(p.tipo, 3, seed + i, p.tipo === 'venta');
      const inspira = angulos.length
        ? ` Elige DOS formatos DISTINTOS de esta lista y adáptalos a este negocio (no los copies literal): ${angulos.map(a => `«${a}»`).join(', ')}.`
        : '';
      return `"${p.nombre}" (pilar de ${p.tipo}: detona con — ${BANCO_POR_TIPO[p.tipo] || 'algo útil para el cliente'}).${inspira}`;
    })
    .join('\n- ');
  return `Genera exactamente 2 ideas de post para CADA uno de estos pilares, usando EXACTAMENTE estos nombres como claves (sin inventar otros):\n- ${guia}\n\nREGLAS DE VARIEDAD (efecto WOW): las 2 ideas de un mismo pilar deben tener FORMATO y ÁNGULO distintos entre sí, y en todo el mes evita repetir el mismo tipo de post. REGLA 80/20: solo el pilar de venta puede rematar con un CTA de venta; el resto aporta valor puro y NO vende. Las ideas deben ser concretas, hablarle al cliente ideal y específicas a este negocio (nada genérico). Cada 'gancho' y 'desc' corto (máximo 14 palabras).${extra} Responde SOLO con JSON válido y completo: {"ideas": {${nombres.map(n => `"${n}": [{"gancho": "string", "desc": "string", "formato": "Reel|Carrusel|Historia"}]`).join(', ')}}}`;
};

/** Normaliza un nombre para comparar sin acentos/mayúsculas/espacios extra. */
const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/**
 * Convierte el objeto de ideas {Pilar:[...]} en filas de posts listas para
 * insertar, fechadas cada 2 días a partir de fechaBase. No inserta en la BD.
 */
export const mapIdeasToPosts = (ideasSource, biz, gridId, fechaBase) => {
  const est = estrategiaDe(biz);
  const pilaresSel = Array.isArray(biz?.pilares_seleccionados) ? biz.pilares_seleccionados : [];
  const posts = [];
  let postCount = 0;

  Object.entries(ideasSource || {}).forEach(([pilarName, ideas]) => {
    const pilar = pilaresSel.find(p => norm(p.nombre) === norm(pilarName))
      || pilaresSel.find(p => norm(p.nombre).includes(norm(pilarName)) || norm(pilarName).includes(norm(p.nombre)));
    if (Array.isArray(ideas)) {
      ideas.forEach((idea) => {
        const postDate = addDays(fechaBase, postCount * 2);
        posts.push({
          grid_id: gridId,
          fecha: postDate.toISOString(),
          pilar: pilar?.nombre || pilarName,
          pilar_tipo: pilar?.tipo || 'educacion',
          gancho: idea.gancho,
          formato: idea.formato || 'Reel',
          canal: est.canalPrincipal || 'Instagram',
          hora: '19:00'
        });
        postCount++;
      });
    }
  });
  return posts;
};

/**
 * Genera ideas frescas para un mes reusando la estrategia ya definida del negocio
 * (pilares, canales, voz). Devuelve el objeto {Pilar:[...]} ya desenvuelto, o null.
 */
export const generarIdeasMes = async (biz, contextoExtra = '') => {
  const result = await generarJSON(
    buildSystemPrompt(biz),
    [{ role: 'user', content: buildIdeasPrompt(biz, contextoExtra) }],
    3000
  );
  if (!result) return null;
  const obj = extraerObjeto(result);
  return obj.ideas && typeof obj.ideas === 'object' ? obj.ideas : obj;
};
