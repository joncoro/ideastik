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
    Eres el Estratega Maestro de Ideastik.
    Diferencial del negocio: ${biz?.diferente || 'calidad'}. Sector: ${biz?.sector || 'general'}.
    REGLAS DE MÉTODO: Nunca uses el precio como diferenciador. Nunca uses "no vendemos X, vendemos Y".
    Enfócate en la percepción de valor (criterio, personalización, conocimiento, cumplimiento).
    REGLA DE FORMATO: Responde SIEMPRE con JSON válido y COMPLETO. Nunca cortes el JSON a la mitad. No agregues texto fuera del JSON.
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

        const widget = config.widget ? { type: config.widget, data: widgetData } : null;
        const msg = { id: Date.now().toString(), role: 'agent', content: config.question, widget };
        setMessages(prev => [...prev, msg]);
        if (biz?.id) await saveMessage('agent', config.question, widget, biz.id);
      }, 600);
    }
  };

  const handleSelection = async (text, value) => {
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
        promptFinal = `Genera exactamente 2 ideas de post para CADA uno de estos pilares. Usa EXACTAMENTE estos nombres como claves del objeto (sin inventar otros): ${nombres.join(', ')}. Cada 'gancho' y 'desc' debe ser corto (máximo 12 palabras). Responde SOLO con JSON válido y completo: {"ideas": {${nombres.map(n => `"${n}": [{"gancho": "string", "desc": "string", "formato": "Reel|Carrusel|Historia"}]`).join(', ')}}}`;
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
    const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

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
    <div className="flex h-screen w-full bg-[#FAFAF8] overflow-hidden">
      {/* PANEL VISUAL — solo escritorio */}
      <div className="hidden lg:block lg:w-[45%] xl:w-1/2 shrink-0">
        <VisualPanel />
      </div>

      {/* COLUMNA DE CONVERSACIÓN */}
      <div className="flex flex-col h-full flex-1 relative max-w-2xl mx-auto w-full">
      <header classN