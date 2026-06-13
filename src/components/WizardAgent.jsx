import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Card, Badge } from './ui/Components';
import SafeIcon from '../common/SafeIcon';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { streamTexto } from '../lib/ia';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';

export default function WizardAgent({ context, data, onApplySuggestion }) {
  const { currentBusiness } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamedReply, setStreamedReply] = useState('');
  const messagesEndRef = useRef(null);

  const getSystemPrompt = () => `
    Eres el Agente Ideastik, un experto en marketing digital y estrategia de contenidos.
    Tu misión es asistir al usuario en el contexto: ${context === 'calendar' ? 'Calendario General' : 'Editor de Post'}.

    REGLAS:
    - Sé directo, creativo y profesional.
    - Conoces el negocio: ${currentBusiness?.nombre} (${currentBusiness?.sector}).
    - Su diferencial es: ${currentBusiness?.diferente}.
    - Si el usuario está en el Editor (Composer), ayúdale a mejorar el copy, ganchos o CTAs.
    - IMPORTANTE: Si sugieres un copy final, enciérralo entre [COPY] y [/COPY].
  `;

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcome = context === 'calendar'
        ? `¡Hola! Analizando tu calendario de ${currentBusiness?.nombre}. Veo que tienes buen ritmo, ¿quieres ideas para rellenar huecos o mejorar algún pilar?`
        : `Veo que estás trabajando en el post: "${data?.gancho}". ¿Quieres que te ayude a optimizar el copy para que sea más vendedor?`;
      setMessages([{ role: 'agent', text: welcome }]);
    }
  }, [isOpen, context, data, currentBusiness]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { if (isOpen) scrollToBottom(); }, [messages, isTyping, streamedReply]);

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
        (delta) => {
          setIsTyping(false);
          fullText += delta;
          setStreamedReply(fullText);
        }
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

  const cleanText = (text) => text.replace(/\[COPY\]|\[\/COPY\]/g, '').trim();

  return (
    <div className={cn("fixed right-4 md:right-6 z-40 transition-all duration-300 bottom-20 lg:bottom-6", isOpen ? "w-80 md:w-96" : "w-14 h-14")}>
      <AnimatePresence>
        {isOpen ? (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
            <Card className="flex flex-col h-[70vh] max-h-[520px] shadow-2xl border-primary/20 bg-white overflow-hidden">
              <div className="p-4 bg-primary text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <SafeIcon name="Bot" className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-heading font-bold text-sm block leading-none">Agente Ideastik</span>
                    <span className="text-[10px] opacity-80 uppercase tracking-tighter">{context === 'calendar' ? 'Calendario' : 'Editor'}</span>
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
                      <Button
                        size="sm"
                        variant="success"
                        className="text-[10px] h-7 px-3 rounded-full mb-4 shadow-sm"
                        onClick={() => onApplySuggestion(msg.suggestion)}
                      >
                        <SafeIcon name="Check" className="w-3 h-3 mr-1" /> Aplicar sugerencia
                      </Button>
                    )}
                  </div>
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
                <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Escribe aquí..." className="h-10 text-xs rounded-full bg-gray-50" />
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
