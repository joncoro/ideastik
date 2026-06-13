import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from '../components/ui/Components';
import SafeIcon from '../common/SafeIcon';
import { cn } from '../lib/utils';

export default function Agent() {
  const { currentBusiness } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `¡Hola! Soy tu agente Ideastik. Conozco tu negocio "${currentBusiness?.nombre || ''}" y sus pilares. ¿En qué te ayudo hoy?` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    // Mock AI response delay
    setTimeout(() => {
      let reply = "Entiendo. Recuerda que la clave es mantener la consistencia con tu propuesta de valor y hablarle directo a tu audiencia en un tono cercano.";
      
      // Basic mock logic based on keywords
      const lower = userMsg.toLowerCase();
      if (lower.includes('precio') || lower.includes('barato')) {
        reply = "Ojo ahí: en el Método Ideastik nunca usamos el precio como diferenciador. En vez de decir que es barato, enfócate en el valor que entregas, el tiempo que ahorras o la atención personalizada. ¿Quieres que reformulemos esa idea?";
      } else if (lower.includes('idea') || lower.includes('hoy')) {
        reply = "¡Claro! Una buena idea para hoy, aprovechando uno de tus pilares de 'Prueba Social', sería compartir una captura de pantalla de un cliente feliz (tapando su nombre) y contar brevemente la historia detrás de esa venta. Cero producción, mucha conexión.";
      }

      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen bg-gray-50">
      <header className="px-6 py-4 bg-white border-b border-gray-100 flex items-center gap-3 shrink-0 hidden lg:flex">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <SafeIcon name="Bot" className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-heading font-bold text-lg">Agente Ideastik</h2>
          <p className="text-xs text-success flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success"></span> En línea
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] md:max-w-[70%] rounded-2xl p-4 text-sm leading-relaxed",
              msg.role === 'user' 
                ? "bg-primary text-white rounded-br-sm" 
                : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
            )}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex w-full justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 rounded-bl-sm shadow-sm flex gap-1">
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-200 shrink-0">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-2">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregúntame sobre tu estrategia, pide ideas o que mejore un texto..."
            className="flex-1 rounded-full bg-gray-50 border-gray-200 focus-visible:ring-1"
          />
          <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={!input.trim() || isTyping}>
            <SafeIcon name="Send" className="w-4 h-4 ml-1" />
          </Button>
        </form>
      </div>
    </div>
  );
}