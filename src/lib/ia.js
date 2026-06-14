/**
 * Módulo de IA - Corrección CORS + manejo robusto de JSON
 * - Fetch manual sin header 'apikey' (evita bloqueo de preflight CORS).
 * - generarJSON ahora NUNCA devuelve un string roto: si el JSON no se puede
 *   parsear ni reparar, devuelve null para que la capa superior reintente o
 *   muestre error, en vez de guardar basura en la base de datos.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callAgentFunction(payload) {
  const functionUrl = `${SUPABASE_URL.replace(/\/$/, '').trim()}/functions/v1/agente`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      // Solo Authorization y Content-Type. NO 'apikey' (rompe el preflight CORS).
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(">>> [FETCH ERROR]:", response.status, errorText);
    throw new Error(`Edge Function error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Intenta reparar un JSON truncado cerrando strings, arrays y objetos abiertos.
 * Si el último elemento de un array quedó a medias, lo descarta.
 * Devuelve el objeto parseado o null si no hay nada rescatable.
 */
function repararJSONTruncado(texto) {
  if (!texto || typeof texto !== 'string') return null;

  // Intento 1: parseo directo
  try {
    return JSON.parse(texto);
  } catch (_) { /* sigue */ }

  let s = texto.trim();

  // Cerrar una comilla de string abierta (número impar de comillas sin escapar)
  const comillas = (s.match(/(?<!\\)"/g) || []).length;
  if (comillas % 2 !== 0) s += '"';

  // Recortar coma o fragmento colgante al final (ej. propiedad a medias)
  // Vamos cortando desde el final hasta que un cierre balanceado parsee.
  // Estrategia: cerrar arrays/objetos abiertos y, si falla, ir descartando
  // el último elemento incompleto del array.
  for (let intento = 0; intento < 6; intento++) {
    // Contar aperturas/cierres
    const abreLlave = (s.match(/{/g) || []).length;
    const cierraLlave = (s.match(/}/g) || []).length;
    const abreCor = (s.match(/\[/g) || []).length;
    const cierraCor = (s.match(/\]/g) || []).length;

    let candidato = s;
    // Quitar coma colgante
    candidato = candidato.replace(/,\s*$/, '');
    // Cerrar llaves y corchetes que falten
    candidato += '}'.repeat(Math.max(0, abreLlave - cierraLlave));
    candidato += ']'.repeat(Math.max(0, abreCor - cierraCor));

    try {
      return JSON.parse(candidato);
    } catch (_) {
      // Descartar el último objeto incompleto del array y reintentar
      const ultimaComaObjeto = s.lastIndexOf('},');
      const ultimoInicioObjeto = s.lastIndexOf('{');
      if (ultimoInicioObjeto > ultimaComaObjeto) {
        // Hay un objeto abierto sin cerrar al final: lo recortamos
        s = s.slice(0, ultimoInicioObjeto).replace(/,\s*$/, '');
      } else {
        break;
      }
    }
  }

  return null;
}

/**
 * Genera una respuesta JSON. Devuelve el objeto/array parseado, o NULL si no
 * fue posible parsear ni reparar. NUNCA devuelve un string crudo.
 */
export async function generarJSON(system, messages, maxTokens = 800) {
  const payload = {
    system: String(system),
    messages: messages || [],
    maxTokens: Number(maxTokens),
    stream: false
  };

  const data = await callAgentFunction(payload);

  const rawText = data.content?.[0]?.text || data.text || "";
  const cleanText = rawText.replace(/```json|```/g, '').trim();

  // stop_reason nos dice si Anthropic cortó por límite de tokens
  if (data.stop_reason === 'max_tokens') {
    console.warn(">>> [IA] Respuesta cortada por max_tokens. Intentando reparar JSON.");
  }

  const parsed = repararJSONTruncado(cleanText);
  if (parsed === null) {
    console.error(">>> [IA] JSON irreparable. Devolviendo null para reintento.");
  }
  return parsed; // objeto/array o null — nunca string
}

/**
 * Genera TEXTO plano (no JSON) — para copys de publicaciones y mensajes libres.
 * Devuelve el string del modelo, o '' si no hubo texto.
 */
export async function generarTexto(system, messages, maxTokens = 600) {
  const data = await callAgentFunction({
    system: String(system),
    messages: messages || [],
    maxTokens: Number(maxTokens),
    stream: false
  });
  return (data.content?.[0]?.text || data.text || '').trim();
}

/**
 * Streaming simulado para el agente conversacional (no afecta al wizard).
 */
export async function streamTexto(system, messages, maxTokens = 800, onDelta) {
  const payload = {
    system: String(system),
    messages: messages || [],
    maxTokens: Number(maxTokens),
    stream: false
  };
  const data = await callAgentFunction(payload);
  const text = data.content?.[0]?.text || data.text || "";

  const words = text.split(' ');
  for (const word of words) {
    onDelta(word + ' ');
    await new Promise(r => setTimeout(r, 20));
  }
}
