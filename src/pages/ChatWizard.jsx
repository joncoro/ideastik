import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
import supabase from '../supabase/supabase';
import { generarJSON } from '../lib/ia';
import { violaReglas } from '../lib/validadores';
import { Button, Input, Card, Badge } from '../components/ui/Components';
import Spinner from '../components/ui/Spinner';
import SafeIcon from '../common/SafeIcon';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { WIZARD_PHASES, getNextPhase } from '../lib/wizardMachine';

/**
 * Extrae un ARRAY de una respuesta de IA, sin importar el envoltorio.
 * Maneja: array directo, {options:[...]}, {pilares:[...]}, string JSON, etc.
 * Devuelve [] si no hay array rescatable.
 */
const extraerArray = (data) => {
  if (!data) return [];
  let parsed = data;
  if (typeof data === 'string') {
    try { parsed = JSON.parse(data.replace(/```json|```/g, '').trim()); }
    catch (e) { return []; }
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    // Buscar la primera propiedad que sea un array
    for (const key of Object.keys(parsed)) {
      if (Array.isArray(parsed[key])) return parsed[key];
    }
  }
  return [];
};

/**
 * Extrae un OBJETO de una respuesta de IA (para narrativa, estrategia, ideas-mapa).
 * Maneja: objeto directo, {estrategia:{...}}, {narrativa:"texto"}, string JSON.
 * Devuelve {} si no hay nada.
 */
const extraerObjeto = (data) => {
  if (!data) return {};
  let parsed = data;
  if (typeof data === 'string') {
    try { parsed = JSON.parse(data.replace(/```json|```/g, '').trim()); }
    catch (e) { return {}; }
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  return {};
};

/**
 * Saca el texto de narrativa venga como {narrativa:"..."} o como string.
 */
const extraerNarrativa = (data) => {
  const obj = extraerObjeto(data);
  if (obj.narrativa) return obj.narrativa;
  if (typeof data === 'string') {
    try { const p = JSON.parse(data); return p.narrativa || data; }
    catch (e) { return data; }
  }
  return '';
};

export default function ChatWizard() {
  const { bizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const scrollRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentFase, setCurrentFase] = useState('DATOS_NOMBRE');
  const [businessData, setBusinessData] = useState(null);
  // Cuando el usuario pide "ajustar", guardamos qué fase de generación rehacer
  // y su próximo mensaje se usa como instrucción extra para regenerar.
  const [ajustePendiente, setAjustePendiente] = useState(null);

  const getSystemPrompt = (biz) => `
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
    - Canales de venta (úsalos como CTA cuando sea contenido de venta, NO inventes links): WhatsApp ${biz?.whatsapp || 'no'}, catálogo ${biz?.link_catalogo || 'no'}, link de pago ${biz?.link_pago || 'no'}, web ${biz?.link_web || 'no'}
    - Fechas especiales marcadas (tenlas MUY en cuenta para ideación y contenido): ${(biz?.eventos && biz.eventos.length) ? biz.eventos.map(ev => ev.fecha + ' ' + ev.titulo).join('; ') : 'ninguna'}

    VOZ DE MARCA (OBLIGATORIA): tiene prioridad sobre cualquier fórmula de marketing o estilo de escritura. Si hay conflicto entre una práctica de copywriting y la voz del dueño, prevalece la voz del dueño. Nunca neutralices, estandarices ni corporativices la voz proporcionada.

    PRINCIPIOS (PROHIBICIONES):
    1. Nunca uses el precio como ventaja competitiva.
    2. Nunca uses frases vacías (calidad, excelencia, innovación, soluciones integrales, servicio personalizado) salvo que demuestres qué significan concretamente para ESTE negocio.
    3. Nunca uses la fórmula "no vendemos X, vendemos Y".
    4. No inventes procesos, metodologías, certificaciones, experiencia, clientes, estadísticas ni resultados que no se hayan proporcionado. Si falta información, infiere con prudencia desde el contexto, sin fabricar datos.
    5. REGLA DE REALIDAD: prioriza lo que el negocio puede demostrar, explicar o ejecutar en la práctica. Nunca construyas estrategia sobre promesas o ventajas no respaldadas por la información dada.
    6. Específico para ESTE negocio: si una idea sirve para cualquier empresa del sector, descártala.

    MÉTODO (RAZONA ANTES DE RESPONDER): identifica qué sabe este negocio que su cliente desconoce; qué creencias equivocadas tiene el mercado; qué decisiones suele tomar mal el cliente; qué ocurre detrás de cámaras. Convierte eso en percepción de valor y autoridad. Construye desde activos reales: experiencia, método propio, criterio, conocimiento especializado, casos reales, errores frecuentes, insights del sector, procesos internos, decisiones difíciles y resultados observados.
    ORDEN DE PRIORIDAD: 1) casos reales 2) errores del cliente 3) insights del sector 4) decisiones de compra 5) detrás de cámaras 6) tendencias 7) motivación 8) inspiración. Prioriza los niveles superiores.

    PRINCIPIO DE HUMANIDAD: prioriza observaciones reales sobre explicaciones teóricas. Habla como alguien que trabaja todos los días en este negocio. Prefiere ejemplos, situaciones, errores, anécdotas y decisiones antes que conceptos abstractos. Entre dos formas de decir lo mismo, elige la más concreta y humana. Prohibido el lenguaje de departamento de marketing o RR.PP. ("entendemos la importancia de", "en el entorno actual", "es fundamental considerar", "las empresas enfrentan desafíos"): nadie habla así.
    SEÑALES DE CONTENIDO HUMANO (priorízalas frente a consejos genéricos): algo que sorprendió al negocio; un error que comete el cliente; una decisión difícil; algo que cambió de opinión al equipo; un detalle detrás de cámaras; una conversación real con clientes; un patrón observado muchas veces. Pregúntate "¿qué pasó realmente?" antes de "¿qué consejo de marketing puedo dar?". Si el dueño dio "Observaciones reales", úsalas como PRIMERA fuente de ideas, ejemplos y ángulos.

    CALIDAD: cada salida debe ser específica, relevante para el cliente ideal, accionable, basada en experiencia real, diferenciadora y difícil de copiar. Apunta a efectos como "no lo había pensado así", "cometí ese error" o "necesito hablar con esta empresa". Si algo no cumple, reemplázalo.

    FORMATO: Responde SIEMPRE con JSON válido y COMPLETO, según el esquema que pida la app. Nunca cortes la respuesta. No agregues texto fuera del JSON.
  `;

  useEffect(() => {
    const init = async () => {
      try {
        if (bizId) {
          const biz = await db.getBusiness(bizId);
          if (!biz) throw new Error("Negocio no encontrado");
          setBusinessData(biz);
          setCurrentFase(biz.current_fase || 'DATOS_NOMBRE');
          const { data: history } = await supabase.from('wizard_messages').select('*').eq('business_id', bizId).order('created_at', { ascending: true });
          if (history?.length > 0) {
            setMessages(history.map(m => ({ id: m.id, role: m.role, content: m.content, widget: m.widget })));
            // Reanudar la fase actual si aún no se presentó: evita que el wizard se
            // trabe tras navegar/recargar (la siguiente pregunta no se mostraba).
            const fase = biz.current_fase || 'DATOS_NOMBRE';
            const cfg = WIZARD_PHASES[fase];
            const lastAgent = [...history].reverse().find(m => m.role === 'agent');
            const yaPresentada = cfg && lastAgent && lastAgent.content === cfg.question;
            const faltaAuto = cfg && cfg.isAuto && !biz[cfg.aiTask];
            const faltaPregunta = cfg && !cfg.isAuto && !yaPresentada;
            if (cfg && fase !== 'COMPLETADO' && fase !== 'FIN' && (faltaAuto || faltaPregunta)) {
              startPhase(fase, biz);
            }
          } else {
            startPhase(biz.current_fase || 'DATOS_NOMBRE', biz);
          }
        } else {
          startPhase('DATOS_NOMBRE');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [bizId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const saveMessage = async (role, content, widget = null, targetBizId = null) => {
    const bId = targetBizId || businessData?.id;
    if (!bId) return;
    await supabase.from('wizard_messages').insert([{ business_id: bId, role, content, widget }]);
  };

  const startPhase = async (fase, biz = businessData, ajuste = null) => {
    const config = WIZARD_PHASES[fase];
    if (!config) return;

    if (config.isAuto) {
      setIsTyping(true);
      if (!messages.some(m => m.content === config.question)) {
        setMessages(prev => [...prev, { id: 'ai-' + Date.now(), role: 'agent', content: config.question }]);
      }
      try {
        await handleAIGeneration(fase, biz, false, ajuste);
      } catch (e) {
        console.error("Fallo crítico en generación:", e);
        setIsTyping(false);
        setMessages(prev => [...prev, { id: 'retry-' + Date.now(), role: 'agent', content: "¡Ups! Mi conexión se interrumpió un momento. ¿Podemos intentar generar esto de nuevo?", widget: { type: 'chips', data: ['Reintentar generación'] } }]);
      }
    } else {
      setIsTyping(true);
      setTimeout(async () => {
        setIsTyping(false);
        let widgetData = config.options;

        // Cada widget de selección recibe el ARRAY ya extraído
        if (fase === 'PV_ELEGIR') widgetData = extraerArray(biz?.pv_opciones);
        if (fase === 'PILARES_ELEGIR') widgetData = extraerArray(biz?.pilares);
        if (fase === 'ESTRATEGIA_CONFIRMAR') {
          const estObj = extraerObjeto(biz?.estrategia);
          const est = estObj.estrategia && typeof estObj.estrategia === 'object' ? estObj.estrategia : estObj;
          widgetData = { estrategia: est, opciones: config.options };
        }

        const widget = config.widget ? { type: config.widget, data: widgetData } : null;
        let added = false;
        setMessages(prev => {
          if (prev.some(m => m.content === config.question)) return prev;
          added = true;
          return [...prev, { id: Date.now().toString(), role: 'agent', content: config.question, widget }];
        });
        if (added && biz?.id) await saveMessage('agent', config.question, widget, biz.id);
      }, 600);
    }
  };

  const handleSelection = async (text, value) => {
    if (text === 'Saltar por ahora') {
      const cfgSkip = WIZARD_PHASES[currentFase];
      const nextSkip = cfgSkip?.next;
      setMessages(prev => [...prev, { id: 'u-' + Date.now(), role: 'user', content: 'Saltar por ahora' }]);
      if (businessData && nextSkip) {
        await db.updateBusiness(businessData.id, { current_fase: nextSkip });
        await saveMessage('user', 'Saltar por ahora', null, businessData.id);
        const ab = { ...businessData, current_fase: nextSkip };
        setBusinessData(ab);
        setCurrentFase(nextSkip);
        startPhase(nextSkip, ab);
      }
      return;
    }
    if (text === 'Reintentar generación') {
      setMessages(prev => [...prev, { id: 'u-' + Date.now(), role: 'user', content: text }]);
      startPhase(currentFase);
      return;
    }

    // El usuario pidió ajustar la propuesta de valor, narrativa o estrategia.
    // No avanzamos: le pedimos que diga qué cambiar.
    const botonesAjuste = {
      'Ajustemos algo': 'NARRATIVA_GENERAR',
      'Revisar detalles': 'ESTRATEGIA_GENERAR',
      'Quiero ajustar estas propuestas': 'PV_GENERAR',
    };
    if (botonesAjuste[text]) {
      setMessages(prev => [...prev,
        { id: 'u-' + Date.now(), role: 'user', content: text },
        { id: 'ai-' + Date.now(), role: 'agent', content: 'Claro. Cuéntame qué te gustaría ajustar y lo regenero tomando eso en cuenta.' }
      ]);
      setAjustePendiente(botonesAjuste[text]);
      return;
    }

    // Si hay un ajuste pendiente, este texto es la instrucción para regenerar.
    if (ajustePendiente) {
      const faseRegen = ajustePendiente;
      setAjustePendiente(null);
      setMessages(prev => [...prev, { id: 'u-' + Date.now(), role: 'user', content: text }]);
      setCurrentFase(faseRegen);
      // Pasamos la instrucción del usuario como ajuste para el prompt
      startPhase(faseRegen, businessData, text);
      return;
    }

    const config = WIZARD_PHASES[currentFase];
    const nextFase = config.next;

    const valToSave = value !== undefined ? value : text;
    const dataUpdate = config.field ? { [config.field]: valToSave } : {};
    if (currentFase === 'DIAS_ELEGIR') dataUpdate.fecha_inicio = value;

    setMessages(prev => [...prev, { id: 'u-' + Date.now(), role: 'user', content: text }]);

    let activeBiz = businessData;
    if (!activeBiz) {
      activeBiz = await db.createBusiness(user.id, { nombre: text, current_fase: nextFase });
      setBusinessData(activeBiz);
      await saveMessage('agent', WIZARD_PHASES.DATOS_NOMBRE.question, null, activeBiz.id);
      await saveMessage('user', text, null, activeBiz.id);
      navigate(`/n/${activeBiz.id}/estrategia`, { replace: true });
    } else {
      await db.updateBusiness(activeBiz.id, { ...dataUpdate, current_fase: nextFase });
      await saveMessage('user', text, null, activeBiz.id);
      activeBiz = { ...activeBiz, ...dataUpdate, current_fase: nextFase };
      setBusinessData(activeBiz);
    }

    if (text === 'Ver mi parrilla') {
      setIsTyping(true);
      try {
        await finalizeParrilla(activeBiz);
      } catch (e) {
        console.error('Fallo al generar la parrilla:', e);
      }
      navigate(`/n/${activeBiz.id}/calendario`);
      return;
    }
    setCurrentFase(nextFase);
    startPhase(nextFase, activeBiz);
  };

  const handleContactoSave = async (fields) => {
    const next = WIZARD_PHASES[currentFase]?.next;
    const clean = {};
    ['whatsapp', 'link_catalogo', 'link_pago', 'link_web'].forEach(k => { if ((fields[k] || '').trim()) clean[k] = fields[k].trim(); });
    setMessages(prev => [...prev, { id: 'u-' + Date.now(), role: 'user', content: Object.keys(clean).length ? 'Listo, guardé mis datos de contacto.' : 'Sin datos por ahora.' }]);
    if (businessData && next) {
      await db.updateBusiness(businessData.id, { ...clean, current_fase: next });
      await saveMessage('user', Object.keys(clean).length ? 'Datos de contacto guardados' : 'Sin datos de contacto', null, businessData.id);
      const ab = { ...businessData, ...clean, current_fase: next };
      setBusinessData(ab);
      setCurrentFase(next);
      startPhase(next, ab);
    }
  };

  const handleAIGeneration = async (fase, biz, retry = false, ajuste = null) => {
    const config = WIZARD_PHASES[fase];
    if (config.aiTask === 'parrilla') { await finalizeParrilla(biz); return; }

    let tokens = 600;
    if (fase === 'PILARES_GENERAR') tokens = 2000;
    if (fase === 'ESTRATEGIA_GENERAR') tokens = 1000;
    if (fase === 'IDEAS_GENERAR') tokens = 3000;

    // Construcción del prompt. Para IDEAS, inyectamos los nombres EXACTOS de los
    // pilares seleccionados para que Claude los use como claves (si no, inventa
    // nombres distintos y la parrilla no encuentra match).
    let promptFinal = config.prompt;
    if (fase === 'IDEAS_GENERAR') {
      const sel = Array.isArray(biz.pilares_seleccionados) ? biz.pilares_seleccionados : [];
      const nombres = sel.map(p => p.nombre).filter(Boolean);
      if (nombres.length > 0) {
        // Banco de preguntas detonadoras por tipo de pilar (del método Ideastik)
        const banco = {
          autoridad: 'qué decisión técnica tomas que el cliente no entendería, qué error común tú no cometes',
          conexion: 'qué te llevó a empezar, qué pasó esta semana que te recordó por qué haces esto',
          venta: 'qué tienes disponible esta semana, cuál es tu producto o servicio estrella',
          prueba_social: 'quién compró esta semana, quién contaría su experiencia',
          educacion: 'qué pregunta te hacen siempre, qué mito existe sobre tu sector',
        };
        const guia = sel.map(p => `"${p.nombre}" (pilar de ${p.tipo}: detona con — ${banco[p.tipo] || 'algo útil para el cliente'})`).join('; ');
        promptFinal = `Genera exactamente 2 ideas de post para CADA uno de estos pilares, usando EXACTAMENTE estos nombres como claves (sin inventar otros). Para cada pilar, inspírate en sus preguntas detonadoras: ${guia}. Las ideas deben ser concretas, hablarle al cliente ideal y específicas a este negocio (nada genérico). Cada 'gancho' y 'desc' corto (máximo 14 palabras). Responde SOLO con JSON válido y completo: {"ideas": {${nombres.map(n => `"${n}": [{"gancho": "string", "desc": "string", "formato": "Reel|Carrusel|Historia"}]`).join(', ')}}}`;
      }
    }

    // Si el usuario pidió un ajuste, lo añadimos como instrucción al prompt.
    if (ajuste) {
      promptFinal += `\n\nIMPORTANTE: El usuario pidió este ajuste sobre la versión anterior: "${ajuste}". Aplícalo y vuelve a generar respetando el mismo formato JSON.`;
    }

    // generarJSON ahora devuelve objeto/array YA PARSEADO, o null si falló.
    const result = await generarJSON(getSystemPrompt(biz), [{ role: 'user', content: promptFinal }], tokens);

    // Si no hubo respuesta parseable, reintentamos una vez; si vuelve a fallar, error controlado.
    if (result === null || result === undefined) {
      if (!retry) return handleAIGeneration(fase, biz, true, ajuste);
      throw new Error("La IA no devolvió un JSON válido tras reintentar.");
    }

    const nextFase = getNextPhase(fase);

    // Guardamos el resultado COMPLETO tal cual (objeto/array). Nunca string.
    const updates = {
      [config.aiTask]: result,
      current_fase: nextFase
    };

    await db.updateBusiness(biz.id, updates);
    const updatedBiz = { ...biz, ...updates };
    setBusinessData(updatedBiz);

    setIsTyping(false);
    setCurrentFase(nextFase);
    startPhase(nextFase, updatedBiz);
  };

  const finalizeParrilla = async (biz) => {
    const grid = await db.createGrid(biz.id, new Date().getMonth() + 1, new Date().getFullYear());
    const startDate = new Date(biz.fecha_inicio || Date.now());
    const posts = [];
    let postCount = 0;

    // ideas viene como {ideas:{Pilar:[...]}} o {Pilar:[...]}; estrategia como {estrategia:{...}} o {...}
    const ideasObj = extraerObjeto(biz.ideas);
    const ideasSource = ideasObj.ideas && typeof ideasObj.ideas === 'object' ? ideasObj.ideas : ideasObj;
    const estObj = extraerObjeto(biz.estrategia);
    const est = estObj.estrategia && typeof estObj.estrategia === 'object' ? estObj.estrategia : estObj;

    const pilaresSel = Array.isArray(biz.pilares_seleccionados) ? biz.pilares_seleccionados : [];

    // Normaliza un nombre para comparar sin acentos/mayúsculas/espacios extra.
    const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

    Object.entries(ideasSource).forEach(([pilarName, ideas]) => {
      // Match flexible: exacto, o por nombre normalizado, o por inclusión parcial.
      const pilar = pilaresSel.find(p => norm(p.nombre) === norm(pilarName))
        || pilaresSel.find(p => norm(p.nombre).includes(norm(pilarName)) || norm(pilarName).includes(norm(p.nombre)));
      if (Array.isArray(ideas)) {
        ideas.forEach((idea) => {
          const postDate = addDays(startDate, postCount * 2);
          posts.push({
            grid_id: grid.id,
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

    await db.createPosts(posts);
    await db.updateBusiness(biz.id, { current_fase: 'COMPLETADO' });
    setIsTyping(false);
    setCurrentFase('COMPLETADO');
    startPhase('COMPLETADO', { ...biz, current_fase: 'COMPLETADO' });
  };

  // ---------- WIDGETS ----------
  const ChipsWidget = ({ data, onSelect, disabled }) => (
    <div className="flex flex-wrap gap-2 mt-3">
      {Array.isArray(data) && data.map(opt => (
        <button key={opt} disabled={disabled} onClick={() => onSelect(opt)} className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all border shadow-sm", disabled ? "bg-gray-100 text-gray-400" : "bg-white border-primary/20 text-primary hover:bg-primary hover:text-white")}>
          {opt}
        </button>
      ))}
    </div>
  );

  const SuggestWidget = ({ data, onPick, disabled }) => (
    <div className="mt-3">
      <p className="text-[11px] text-gray-400 mb-2">Toca una opción para usarla (puedes editarla) o escribe la tuya:</p>
      <div className="flex flex-wrap gap-2">
        {Array.isArray(data) && data.map(opt => (
          <button key={opt} disabled={disabled} onClick={() => onPick(opt)} className={cn("px-3 py-1.5 rounded-full text-[13px] font-medium transition-all border", disabled ? "bg-gray-100 text-gray-400 border-gray-100" : "bg-white/70 border-primary/20 text-gray-700 hover:border-primary hover:text-primary")}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  const MultiWidget = ({ data, onConfirm, disabled }) => {
    const [sel, setSel] = useState([]);
    const toggle = (opt) => setSel(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]);
    return (
      <div className="mt-3">
        <p className="text-[11px] text-gray-400 mb-2">Elige una o varias, o escribe la tuya.</p>
        <div className="flex flex-wrap gap-2">
          {Array.isArray(data) && data.map(opt => (
            <button key={opt} disabled={disabled} onClick={() => toggle(opt)} className={cn("px-3 py-1.5 rounded-full text-[13px] font-medium transition-all border flex items-center gap-1", disabled ? "bg-gray-100 text-gray-400 border-gray-100" : sel.includes(opt) ? "bg-primary text-white border-primary" : "bg-white/70 border-primary/20 text-gray-700 hover:border-primary hover:text-primary")}>
              {sel.includes(opt) && <SafeIcon name="Check" className="w-3 h-3" />}{opt}
            </button>
          ))}
        </div>
        {!disabled && sel.length > 0 && (
          <button onClick={() => onConfirm(sel.join(', '))} className="mt-2 text-[12px] font-bold text-primary hover:underline flex items-center gap-1">
            Usar selección ({sel.length}) <SafeIcon name="ArrowRight" className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  const ContactoForm = ({ onSave, onSkip, disabled }) => {
    const [f, setF] = useState({ whatsapp: '', link_catalogo: '', link_pago: '', link_web: '' });
    const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));
    const cls = "w-full h-10 rounded-xl border border-white/70 bg-white/70 px-3 text-[13px] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40";
    return (
      <div className="mt-3 space-y-2 max-w-md">
        <input disabled={disabled} value={f.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="WhatsApp (ej. +57 300 123 4567)" className={cls} />
        <input disabled={disabled} value={f.link_catalogo} onChange={e => set('link_catalogo', e.target.value)} placeholder="Link de catálogo o brochure" className={cls} />
        <input disabled={disabled} value={f.link_pago} onChange={e => set('link_pago', e.target.value)} placeholder="Link de pago (Mercado Pago, Wompi, Bold...)" className={cls} />
        <input disabled={disabled} value={f.link_web} onChange={e => set('link_web', e.target.value)} placeholder="Web o perfil (Instagram, sitio...)" className={cls} />
        {!disabled && (
          <div className="flex gap-2 pt-1">
            <button onClick={() => onSave(f)} className="px-4 py-2 rounded-xl text-[13px] font-bold bg-gradient-to-br from-primary to-[#8B5CF6] text-white shadow-md">Guardar y seguir</button>
            <button onClick={onSkip} className="px-4 py-2 rounded-xl text-[13px] font-medium text-gray-400 hover:text-gray-600">Saltar</button>
          </div>
        )}
      </div>
    );
  };

  const SuggestSkipWidget = ({ data, onPick, onSkip, disabled }) => (
    <div className="mt-3">
      <p className="text-[11px] text-gray-400 mb-2">Toca un ejemplo para usarlo (puedes editarlo) o escribe el tuyo. Responderla humaniza mucho tu contenido; si tienes prisa, sáltala.</p>
      <div className="flex flex-wrap gap-2 items-center">
        {Array.isArray(data) && data.map(opt => (
          <button key={opt} disabled={disabled} onClick={() => onPick(opt)} className={cn("px-3 py-1.5 rounded-full text-[13px] font-medium transition-all border", disabled ? "bg-gray-100 text-gray-400 border-gray-100" : "bg-white/70 border-primary/20 text-gray-700 hover:border-primary hover:text-primary")}>
            {opt}
          </button>
        ))}
        {!disabled && (
          <button onClick={onSkip} className="px-3 py-1.5 rounded-full text-[13px] font-medium text-gray-400 hover:text-gray-600 transition-colors">
            Saltar por ahora →
          </button>
        )}
      </div>
    </div>
  );

  const PVOptionsWidget = ({ data, onSelect, disabled }) => {
    const list = extraerArray(data);
    return (
      <div className="grid gap-3 mt-4 w-full">
        {list.length > 0 ? list.map((opt, i) => (
          <Card key={i} className={cn("p-4 border-l-4 transition-all", disabled ? "opacity-60" : "cursor-pointer hover:border-primary border-l-primary bg-white shadow-sm")} onClick={() => !disabled && onSelect(`Elegí: "${opt.text}"`, opt.text)}>
            <Badge variant="primary" className="mb-2 text-[10px] uppercase">{opt.tag}</Badge>
            <p className="text-sm italic text-gray-700 leading-relaxed">"{opt.text}"</p>
          </Card>
        )) : (
          <div className="p-4 text-center text-xs text-gray-400 italic">No se pudieron cargar las opciones. Reintenta.</div>
        )}
        {!disabled && list.length > 0 && (
          <button onClick={() => onSelect('Quiero ajustar estas propuestas')} className="text-xs text-primary font-medium hover:underline self-start mt-1 flex items-center gap-1">
            <SafeIcon name="RefreshCw" className="w-3 h-3" /> Ninguna me convence, ajustar
          </button>
        )}
      </div>
    );
  };

  const PilaresGridWidget = ({ data, onSelect, disabled }) => {
    const [selected, setSelected] = useState([]);
    const [showWhy, setShowWhy] = useState(false);
    const pilares = extraerArray(data);

    const toggle = (i) => !disabled && setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

    return (
      <div className="mt-4 space-y-4 w-full">
        {!disabled && (
          <div className="rounded-xl bg-primary/5 border border-primary/10 overflow-hidden">
            <button onClick={() => setShowWhy(v => !v)} className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-primary">
              <span className="flex items-center gap-1.5"><SafeIcon name="HelpCircle" className="w-3.5 h-3.5" /> ¿Por qué necesitas pilares?</span>
              <SafeIcon name={showWhy ? "ChevronUp" : "ChevronDown"} className="w-3.5 h-3.5" />
            </button>
            {showWhy && (
              <div className="px-3 pb-3 text-[11px] text-gray-600 leading-relaxed space-y-1">
                <p>• <b>Evitan el bloqueo creativo:</b> siempre tienes de qué hablar.</p>
                <p>• <b>Construyen autoridad por repetición:</b> te vuelves referente en tus temas.</p>
                <p>• <b>Educan a tu cliente</b> y hacen tu marca reconocible.</p>
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {pilares.length > 0 ? pilares.map((p, i) => (
            <div key={i} onClick={() => toggle(i)} className={cn("p-3 rounded-xl border-2 transition-all cursor-pointer h-full flex flex-col", selected.includes(i) ? "border-primary bg-primary/5 shadow-inner" : "border-gray-100 bg-white shadow-sm")}>
              <div className="flex justify-between items-start mb-1">
                <span className="text-[11px] font-bold leading-tight text-gray-800">{p.nombre}</span>
                {selected.includes(i) && <SafeIcon name="CheckCircle" className="w-4 h-4 text-primary shrink-0" />}
              </div>
              <p className="text-[9px] text-gray-500 leading-tight mt-1 line-clamp-3">{p.desc || p.descripcion}</p>
            </div>
          )) : (
            <div className="col-span-2 p-4 text-center text-xs text-gray-400 italic">No se pudieron cargar los pilares. Reintenta.</div>
          )}
        </div>
        {!disabled && pilares.length > 0 && (
          <Button size="sm" className="w-full h-10 rounded-xl font-bold" disabled={selected.length < 3} onClick={() => onSelect(`Pilares: ${selected.map(i => pilares[i].nombre).join(', ')}`, selected.map(i => pilares[i]))}>
            Confirmar {selected.length} pilares
          </Button>
        )}
      </div>
    );
  };

  const DayPickerWidget = ({ onSelect, disabled }) => {
    const days = eachDayOfInterval({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) });
    return (
      <div className={cn("mt-4 bg-white rounded-2xl border p-4 shadow-sm", disabled && "opacity-60")}>
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => (
            <button key={day.toString()} disabled={disabled} onClick={() => onSelect(`Empezar el ${format(day, "d 'de' MMMM", { locale: es })}`, day.toISOString())} className="h-8 w-8 rounded-lg text-xs flex items-center justify-center hover:bg-primary/10">
              {format(day, 'd')}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ---------- TARJETA DE ESTRATEGIA (mapa visual) ----------
  const EstrategiaWidget = ({ data, onSelect, disabled }) => {
    const est = (data && data.estrategia) || {};
    const opciones = (data && data.opciones) || ['¡Vamos!', 'Revisar detalles'];
    const formatos = Array.isArray(est.formatos) ? est.formatos : [];
    const tieneData = est.canalPrincipal || formatos.length > 0 || est.frecuencia || est.diasHoras;
    return (
      <div className="mt-4 w-full space-y-4">
        <Card className="p-0 overflow-hidden border-primary/15 shadow-sm">
          <div className="bg-gradient-to-r from-primary to-[#8B5CF6] px-5 py-3">
            <p className="text-white text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
              <SafeIcon name="Map" className="w-3.5 h-3.5" /> Tu mapa estratégico
            </p>
          </div>
          {tieneData ? (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-primary/5 p-3">
                  <p className="text-[10px] font-bold text-primary uppercase mb-1 flex items-center gap-1"><SafeIcon name="Send" className="w-3 h-3" /> Canal principal</p>
                  <p className="text-sm font-bold text-gray-900">{est.canalPrincipal || '\u2014'}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><SafeIcon name="Share2" className="w-3 h-3" /> Secundario</p>
                  <p className="text-sm font-bold text-gray-700">{est.canalSecundario || '\u2014'}</p>
                </div>
              </div>
              {formatos.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1"><SafeIcon name="Grid" className="w-3 h-3" /> Formatos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {formatos.map((f, i) => (
                      <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-success/10 text-success font-medium">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-start gap-2">
                  <SafeIcon name="Repeat" className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-700"><span className="font-bold text-gray-500 uppercase text-[10px] mr-1">Frecuencia:</span>{est.frecuencia || '\u2014'}</p>
                </div>
                <div className="flex items-start gap-2">
                  <SafeIcon name="Calendar" className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-700 leading-relaxed"><span className="font-bold text-gray-500 uppercase text-[10px] mr-1">Días y horas:</span>{est.diasHoras || '\u2014'}</p>
                </div>
                {est.tono && (
                  <div className="flex items-start gap-2">
                    <SafeIcon name="MessageSquare" className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-700"><span className="font-bold text-gray-500 uppercase text-[10px] mr-1">Tono:</span>{est.tono}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 text-center text-xs text-gray-400 italic">No se pudo cargar la estrategia. Puedes revisarla o continuar.</div>
          )}
        </Card>
        <div className="flex flex-wrap gap-2">
          {opciones.map(opt => (
            <button key={opt} disabled={disabled} onClick={() => onSelect(opt)} className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all border shadow-sm", disabled ? "bg-gray-100 text-gray-400" : opt.charAt(0) === '\u00a1' ? "bg-primary text-white border-primary hover:bg-primary/90" : "bg-white border-primary/20 text-primary hover:bg-primary hover:text-white")}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ---------- PANEL VISUAL DINÁMICO (lado derecho, estilo Webflow) ----------
  // Define el contenido del panel según la fase actual: título, subtítulo y arte.
  const panelByPhase = (fase) => {
    if (fase?.startsWith('DATOS')) return {
      eyebrow: 'Paso 1 · Tu negocio',
      title: 'Aquí empieza todo',
      sub: 'Sin una base clara, lo que sigue no funciona. Cuéntame de tu negocio para construir una estrategia que de verdad te represente.',
      accent: '#6C3DF4', accent2: '#EC4899'
    };
    if (fase?.startsWith('PV')) return {
      eyebrow: 'Propuesta de valor',
      title: '¿Por qué te eligen a ti?',
      sub: 'No depende de tener un producto único, sino de cómo lo entregas y qué pueden esperar de ti que no encuentran en otros.',
      accent: '#6C3DF4', accent2: '#2BA664'
    };
    if (fase?.startsWith('NARRATIVA')) return {
      eyebrow: 'Narrativa de marca',
      title: 'Coherencia y consistencia',
      sub: 'Que todo lo que dices apunte a lo mismo, y que lo digas siempre. Las dos juntas construyen marca.',
      accent: '#EC4899', accent2: '#6C3DF4'
    };
    if (fase?.startsWith('PILARES')) return {
      eyebrow: 'Pilares de contenido',
      title: 'Adiós a la página en blanco',
      sub: 'Temas recurrentes conectados a tu propuesta. Construyen autoridad por repetición y te dan siempre de qué hablar.',
      accent: '#F59E0B', accent2: '#6C3DF4'
    };
    if (fase?.startsWith('ESTRATEGIA') || fase?.startsWith('DIAS')) return {
      eyebrow: 'Estrategia',
      title: 'Dónde y cuándo importa',
      sub: 'Elige un canal y domínalo. Formatos, frecuencia y horarios pensados para tu tipo de negocio.',
      accent: '#10B981', accent2: '#3B82F6'
    };
    if (fase?.startsWith('IDEAS') || fase?.startsWith('PARRILLA')) return {
      eyebrow: 'Tu parrilla',
      title: 'La estrategia, aterrizada',
      sub: 'Aquí se cruza la estrategia con el lunes a las 8 de la mañana. Ideas concretas, listas para publicar.',
      accent: '#3B82F6', accent2: '#EC4899'
    };
    if (fase === 'COMPLETADO') return {
      eyebrow: '¡Listo!',
      title: 'Tu mes está planeado',
      sub: 'Tienes una estrategia coherente y un calendario lleno. Ahora solo queda publicar con consistencia.',
      accent: '#2BA664', accent2: '#6C3DF4'
    };
    return { eyebrow: 'Ideastik', title: 'Tu estrategia de contenido', sub: 'Construyamos juntos tu mes.', accent: '#6C3DF4', accent2: '#EC4899' };
  };

  const VisualPanel = () => {
    const p = panelByPhase(currentFase);
    return (
      <div className="relative h-full w-full overflow-hidden" style={{ background: `linear-gradient(140deg, ${p.accent} 0%, ${p.accent2} 100%)` }}>
        {/* Formas decorativas estilo Webflow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] left-[-15%] w-80 h-80 rounded-[40%] opacity-10 blur-2xl" style={{ background: '#fff' }} />
        <div className="absolute top-1/3 left-12 w-24 h-24 rounded-3xl border border-white/20 rotate-12 backdrop-blur-sm" />
        <div className="absolute top-1/2 right-16 w-16 h-16 rounded-full border border-white/20" />
        {/* Glass card flotante */}
        <div className="absolute top-20 right-10 hidden xl:flex flex-col gap-2 p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 w-52 rotate-3">
          <div className="w-8 h-8 rounded-lg bg-white/25 flex items-center justify-center"><SafeIcon name="Sparkles" className="w-4 h-4 text-white" /></div>
          <div className="h-2 w-3/4 rounded-full bg-white/30" />
          <div className="h-2 w-1/2 rounded-full bg-white/20" />
        </div>
        {/* Contenido */}
        <div className="relative z-10 h-full flex flex-col justify-center px-12 xl:px-16 max-w-xl">
          <span className="text-white/70 text-sm font-medium tracking-wide uppercase mb-4">{p.eyebrow}</span>
          <h2 className="text-white font-heading font-bold text-4xl xl:text-5xl leading-[1.05] mb-6">{p.title}</h2>
          <p className="text-white/85 text-base xl:text-lg leading-relaxed">{p.sub}</p>
          <div className="mt-10 flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"><SafeIcon name="Zap" className="w-5 h-5 text-white" /></div>
            <span className="text-white font-heading font-bold text-lg">ideastik<span className="text-white/60">.</span></span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* PANEL VISUAL — solo escritorio */}
      <div className="hidden lg:block lg:w-[45%] xl:w-1/2 shrink-0">
        <VisualPanel />
      </div>

      {/* COLUMNA DE CONVERSACIÓN */}
      <div className="flex flex-col h-full flex-1 relative max-w-2xl mx-auto w-full">
      <header className="bg-white/70 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center gap-3 shrink-0 z-10">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary"><SafeIcon name="Zap" className="w-5 h-5" /></div>
        <div>
          <h2 className="font-heading font-bold text-gray-900 leading-none">Estratega Ideastik</h2>
          <span className="text-[11px] text-success font-medium">● En línea</span>
        </div>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 md:px-8 py-6 space-y-6 pb-28">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const isWidgetFrozen = idx !== messages.length - 1;
            return (
              <motion.div key={msg.id || idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                <div className={cn("max-w-[85%] p-4 rounded-2xl text-[14px] leading-relaxed shadow-sm", msg.role === 'user' ? "bg-primary text-white rounded-br-md" : "bg-white/70 backdrop-blur border border-white/60 text-gray-800 font-medium rounded-tl-md")}>{msg.content}</div>
                {msg.widget?.type === 'chips' && <ChipsWidget data={msg.widget.data} onSelect={handleSelection} disabled={isWidgetFrozen} />}
                {msg.widget?.type === 'suggest' && <SuggestWidget data={msg.widget.data} onPick={(v) => setInputValue(v)} disabled={isWidgetFrozen} />}
                {msg.widget?.type === 'multi' && <MultiWidget data={msg.widget.data} onConfirm={(v) => setInputValue(v)} disabled={isWidgetFrozen} />}
                {msg.widget?.type === 'contacto_form' && <ContactoForm onSave={handleContactoSave} onSkip={() => handleSelection('Saltar por ahora')} disabled={isWidgetFrozen} />}
                {msg.widget?.type === 'suggest_skip' && <SuggestSkipWidget data={msg.widget.data} onPick={(v) => setInputValue(v)} onSkip={() => handleSelection('Saltar por ahora')} disabled={isWidgetFrozen} />}
                {msg.widget?.type === 'pv_options' && <PVOptionsWidget data={msg.widget.data} onSelect={handleSelection} disabled={isWidgetFrozen} />}
                {msg.widget?.type === 'pilares_grid' && <PilaresGridWidget data={msg.widget.data} onSelect={handleSelection} disabled={isWidgetFrozen} />}
                {msg.widget?.type === 'day_picker' && <DayPickerWidget onSelect={handleSelection} disabled={isWidgetFrozen} />}
                {msg.widget?.type === 'estrategia_card' && <EstrategiaWidget data={msg.widget.data} onSelect={handleSelection} disabled={isWidgetFrozen} />}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {isTyping && <div className="flex gap-1 p-3 bg-white rounded-2xl w-fit shadow-sm border border-gray-100"><span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" /><span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} /><span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} /></div>}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white/80 via-white/40 to-transparent backdrop-blur-sm">
        <form onSubmit={(e) => { e.preventDefault(); if (inputValue.trim()) { handleSelection(inputValue); setInputValue(''); } }} className="flex gap-2 items-center max-w-2xl mx-auto">
          <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Escribe aquí..." className="rounded-full bg-white border-gray-200 h-12 shadow-sm" disabled={isTyping} />
          <Button type="submit" size="icon" className="rounded-full w-12 h-12 shadow-md shadow-primary/20" disabled={!inputValue.trim() || isTyping}><SafeIcon name="ArrowUp" className="w-5 h-5" /></Button>
        </form>
      </div>
      </div>
    </div>
  );
}
