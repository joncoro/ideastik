import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Card, Badge } from './ui/Components';
import SafeIcon from '../common/SafeIcon';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { streamTexto, generarJSON } from '../lib/ia';
import { buildSystemPrompt } from '../lib/parrilla';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Agente Ideastik flotante y transversal.
 * - En el CALENDARIO: además de conversar, propone ideas concretas atadas a los
 *   pilares del negocio y deja AÑADIRLAS a un día concreto (antes quedaban sueltas).
 * - En el EDITOR: ayuda con copy/ganchos y aplica sugerencias al post.
 * Lee el contexto real del negocio (pilares, propuesta, cliente) y, en el
 * calendario, los días que aún están sin contenido.
 */
export default function WizardAgent({ context, data, onApplySuggestion, diasLibres = [], onAddIdea }) {
  const { currentBusiness } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamedReply, setStreamedReply] = useState('');
  const [ideas, setIdeas] = useState([]);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [dayByIdx, setDayByIdx] = useState({});
  const [addedIdx, setAddedIdx] = useState({});
  const messagesEndRef = useRef(null);

  const getSystemPrompt = () => {
    const b = currentBusiness || {};
    const pilares = Array.isArray(b.pilares_seleccionados)
      ? b.pilares_seleccionados.map(p => `${p.nombre} (${p.tipo})`).join(', ') : '';
    return `Eres el Agente Ideastik, estratega de contenido del negocio "${b.nombre || 'este negocio'}" (${b.sector || 'general'}).
Contexto real: vende ${b.que_hace || 'no especificado'}; su diferencial es ${b.diferente || 'no especificado'}; su cliente ideal es ${b.cliente_ideal || 'no especificado'}; propuesta de valor: ${b.propuesta_valor || 'no definida'}. Pilares de contenido: ${pilares || 'aún sin definir'}.
${context === 'calendar'
  ? `El usuario está en su calendario${diasLibres.length ? `, con ${diasLibres.length} día(s) aún sin contenido este mes` : ''}. Ayúdale a idear contenido concreto y accionable para su cliente ideal, apegado a sus pilares. Si te pide ideas, dáselas breves y específicas.`
  : `El usuario está editando un post. Ayúdale a mejorar copy, ganchos o CTA. Si propones un copy final, enciérralo entre [COPY] y [/COPY].`}
Habla claro y sencillo: el usuario suele ser un microempresario sin tiempo y sin experiencia en redes. Nada de precio como ventaja, ni "no vendemos X sino Y". Sé específico a ESTE negocio y apunta al efecto "no se me había ocurrido esto".`;
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcome = context === 'calendar'
        ? `¡Hola! Soy tu estratega. ${diasLibres.length ? `Veo ${diasLibres.length} día(s) sin contenido este mes.` : ''} Puedo proponerte ideas listas para tu marca y las agregas al día que quieras. ¿Empezamos?`
        : `Veo que trabajas en: "${data?.gancho}". ¿Quieres que te ayude a pulir el copy o el gancho?`;
      setMessages([{ role: 'agent', text: welcome }]);
    }
  }, [isOpen, context, data, currentBusiness]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { if (isOpen) scrollToBottom(); }, [messages, isTyping, streamedReply, ideas]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);
    setStreamedReply('');
    let fullText = '';
    try {
      await streamTexto(
        getSystemPrompt(),
        [...messages.map(m => ({ role: m.role === 'agent' ? 'assistant' : 'user', content: m.text })), { role: 'user', content: userMsg }],
        1000,
        (delta) => { setIsTyping(false); fullText += delta; setStreamedReply(fullText); }
      );
      const copyMatch = fullText.match(/\[COPY\]([\s\S]*?)\[\/COPY\]/);
      const suggestion = copyMatch ? copyMatch[1].trim() : null;
      setMessages(prev => [...prev, { role: 'agent', text: fullText, suggestion }]);
      setStreamedReply('');
    } catch (err) {
      console.error(err);
      setIsTyping(false);
    }
  };

  // Genera ideas estructuradas atadas a los pilares, para AÑADIR al calendario.
  const handleGenerarIdeas = async () => {
    if (generatingIdeas) return;
    setGeneratingIdeas(true);
    try {
      const b = currentBusiness || {};
      const pilares = Array.isArray(b.pilares_seleccionados) ? b.pilares_seleccionados : [];
      const nombres = pilares.map(p => `${p.nombre} (${p.tipo})`).join('; ');
      const userMsg = `Propon 4 ideas de post concretas y variadas para este negocio, cada una atada a uno de sus pilares${nombres ? ` (${nombres})` : ''} y a su cliente ideal. Deben provocar el efecto "no se me había ocurrido". Cada 'gancho' y 'desc' en máximo 14 palabras. Responde SOLO con JSON válido: {"ideas":[{"gancho":"string","desc":"string","pilar":"nombre del pilar","pilar_tipo":"autoridad|conexion|venta|educacion|prueba_social","formato":"Reel|Carrusel|Historia"}]}`;
      const r = await generarJSON(buildSystemPrompt(b), [{ role: 'user', content: userMsg }], 1400);
      const arr = Array.isArray(r?.ideas) ? r.ideas : (Array.isArray(r) ? r : []);
      setIdeas(arr.filter(x => x && x.gancho));
      setAddedIdx({});
      setDayByIdx({});
    } catch (e) {
      console.error('Error generando ideas:', e);
    } finally {
      setGeneratingIdeas(false);
    }
  };

  const handleAgregar = async (idea, i) => {
    if (!onAddIdea) return;
    const iso = dayByIdx[i] || diasLibres[0]?.toISOString();
    const ok = await onAddIdea(idea, iso);
    if (ok) setAddedIdx(prev => ({ ...prev, [i]: true }));
  };

  const cleanText = (text) => text.replace(/\[COPY\]|\[\/COPY\]/g, '').trim();

  return (
    <div className={cn("fixed right-4 md:right-6 z-40 transition-all duration-300 bottom-20 lg:bottom-6", isOpen ? "w-80 md:w-96" : "w-14 h-14")}>
      <AnimatePresence>
        {isOpen ? (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
            <Card className="flex flex-col h-[70vh] max-h-[560px] shadow-2xl border-primary/20 bg-white overflow-hidden">
              <div className="p-4 bg-primary text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <SafeIcon name="Zap" className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-heading font-bold text-sm block leading-none">Agente Ideastik</span>
                    <span className="text-[10px] opacity-80 uppercase tracking-tighter">{context === 'calendar' ? 'Ideas para tu calendario' : 'Editor'}</span>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                  <SafeIcon name="X" className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                    <div className={cn("max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm mb-2",
                      msg.role === 'user' ? "bg-primary text-white rounded-br-none" : "bg-white border border-gray-100 text-gray-800 rounded-tl-none font-medium")}>
                      {cleanText(msg.text)}
                    </div>
                    {msg.suggestion && context === 'editor' && (
                      <Button size="sm" variant="success" className="text-[10px] h-7 px-3 rounded-full mb-4 shadow-sm" onClick={() => onApplySuggestion(msg.suggestion)}>
                        <SafeIcon name="Check" className="w-3 h-3 mr-1" /> Aplicar sugerencia
                      </Button>
                    )}
                  </div>
                ))}

                {/* Acción principal en el calendario: proponer ideas para añadir. */}
                {context === 'calendar' && (
                  <Button size="sm" variant="secondary" className="w-full text-xs" onClick={handleGenerarIdeas} isLoading={generatingIdeas}>
                    <SafeIcon name="Zap" className="w-3.5 h-3.5 mr-1.5" /> {ideas.length ? 'Dame otras ideas' : 'Proponme ideas para mi mes'}
                  </Button>
                )}

                {context === 'calendar' && ideas.map((idea, i) => (
                  <Card key={i} className="p-3 border-primary/10 bg-white space-y-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {idea.pilar && <Badge variant="primary" className="text-[9px] uppercase">{idea.pilar}</Badge>}
                      {idea.formato && <span className="text-[9px] text-gray-400">· {idea.formato}</span>}
                    </div>
                    <p className="text-xs font-bold text-gray-800 leading-snug">{idea.gancho}</p>
                    {idea.desc && <p className="text-[11px] text-gray-500 leading-snug">{idea.desc}</p>}
                    {addedIdx[i] ? (
                      <p className="text-[11px] text-success font-bold flex items-center gap-1"><SafeIcon name="Check" className="w-3 h-3" /> Añadida al calendario</p>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {diasLibres.length > 0 && (
                          <select
                            value={dayByIdx[i] || diasLibres[0]?.toISOString()}
                            onChange={e => setDayByIdx(prev => ({ ...prev, [i]: e.target.value }))}
                            className="h-8 flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-2 text-[11px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                          >
                            {diasLibres.map(d => (
                              <option key={d.toISOString()} value={d.toISOString()}>{format(d, "EEE d 'de' MMM", { locale: es })}</option>
                            ))}
                          </select>
                        )}
                        <Button size="sm" className="h-8 text-[11px] px-3 shrink-0" onClick={() => handleAgregar(idea, i)}>
                          <SafeIcon name="Plus" className="w-3 h-3 mr-1" /> Añadir
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}

                {streamedReply && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] p-3 rounded-2xl text-xs bg-white border border-gray-100 text-gray-800 rounded-tl-none shadow-sm">
                      {cleanText(streamedReply)}
                    </div>
                  </div>
                )}
                {isTyping && <div className="text-[10px] text-gray-400 animate-pulse px-2">Pensando...</div>}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Pídeme ideas o pregúntame..." className="h-10 text-xs rounded-full bg-gray-50" />
                <Button type="submit" size="icon" className="rounded-full w-10 h-10 shrink-0" disabled={!input.trim() || isTyping}>
                  <SafeIcon name="Send" className="w-4 h-4" />
                </Button>
              </form>
            </Card>
          </motion.div>
        ) : (
          <button onClick={() => setIsOpen(true)} className="w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all group relative">
            <SafeIcon name="MessageSquare" className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-success text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">1</span>
          </button>
        )}
      </AnimatePresence>
    </div>
  );
}
