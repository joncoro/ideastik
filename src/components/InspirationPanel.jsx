import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generarJSON } from '../lib/ia';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Badge, Skeleton } from './ui/Components';
import SafeIcon from '../common/SafeIcon';
import { cn, getPilarColor, getPilarText } from '../lib/utils';

export default function InspirationPanel({ isOpen, onClose, onIdeaSelected }) {
  const { currentBusiness } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Saca el array de pilares: usa los seleccionados; si no, los del objeto {pilares:[...]}.
  const getPilares = (biz) => {
    if (Array.isArray(biz?.pilares_seleccionados) && biz.pilares_seleccionados.length) return biz.pilares_seleccionados;
    const p = biz?.pilares;
    if (Array.isArray(p)) return p;
    if (p && Array.isArray(p.pilares)) return p.pilares;
    return [];
  };

  const loadSuggestions = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      const pilares = getPilares(currentBusiness);
      if (pilares.length === 0) { setSuggestions([]); setLoading(false); return; }
      const b = currentBusiness;
      const system = `Eres un estratega de contenido senior de Ideastik para el negocio "${b.nombre || ''}". Vende ${b.que_hace || 'su producto o servicio'}; su diferencial real es ${b.diferente || 'su forma de trabajar'}; sector ${b.sector || 'general'}; cliente ideal ${b.cliente_ideal || 'su audiencia'}.${b.propuesta_valor ? ` Propuesta de valor: ${b.propuesta_valor}.` : ''} Reglas: nunca el precio como diferenciador; nunca "no vendemos X, vendemos Y"; el diferencial vive en la percepción (criterio, asesoría, personalización, conocimiento). Cada idea debe ser específica a ESTE negocio y a su cliente ideal, nada genérico. Responde SOLO con JSON válido.`;
      const banco = {
        autoridad: 'qué decisión técnica tomas que el cliente no entendería, qué error común no cometes',
        conexion: 'qué te llevó a empezar, qué pasó esta semana que te recordó por qué lo haces',
        venta: 'qué tienes disponible esta semana, cuál es tu producto o servicio estrella',
        prueba_social: 'quién compró esta semana, quién contaría su experiencia',
        educacion: 'qué pregunta te hacen siempre, qué mito existe en tu sector',
      };
      const guia = pilares.map(p => `"${p.nombre}" (${p.tipo}: detona con — ${banco[p.tipo] || 'algo útil para el cliente'})`).join('; ');
      const evs = Array.isArray(b.eventos) ? b.eventos : [];
      const fechasTxt = evs.length ? ` Hay fechas especiales marcadas: ${evs.map(e => e.fecha + ' ' + e.titulo).join('; ')}. Si alguna está cerca, propón al menos una idea que la aproveche con naturalidad.` : '';
      const user = `Genera 1 idea de post FRESCA y concreta para CADA uno de estos pilares: ${guia}. Cada 'gancho' y 'desc' corto (máximo 14 palabras), específico al cliente ideal. Varía los formatos.${fechasTxt} Responde SOLO con JSON válido y completo: {"ideas": [{"pilarName": "nombre exacto del pilar", "tipo": "tipo del pilar", "gancho": "string", "desc": "string", "formato": "Reel|Carrusel|Historia"}]}`;
      const res = await generarJSON(system, [{ role: 'user', content: user }], 1400);
      const arr = Array.isArray(res) ? res : (res && Array.isArray(res.ideas) ? res.ideas : []);
      const allIdeas = arr.map(idea => {
        const nombre = idea.pilarName || idea.pilar || idea.nombre || '';
        const match = pilares.find(p => p.nombre === nombre);
        return {
          gancho: idea.gancho,
          desc: idea.desc,
          formato: idea.formato || 'Reel',
          pilarName: nombre,
          pilarTipo: idea.tipo || idea.pilarTipo || match?.tipo || 'educacion',
          id: Math.random().toString(36).substr(2, 9)
        };
      }).filter(i => i.gancho);
      setSuggestions(allIdeas.sort(() => Math.random() - 0.5).slice(0, 5));
    } catch (e) {
      console.error(e);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadSuggestions();
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-primary/5">
              <div>
                <h3 className="font-heading font-bold text-xl flex items-center gap-2">
                  <SafeIcon name="Sparkles" className="text-primary w-5 h-5" />
                  Inspiración AI
                </h3>
                <p className="text-xs text-gray-500">Ideas frescas basadas en tus pilares</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <SafeIcon name="X" className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <Card key={i} className="p-4 space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </Card>
                ))
              ) : (
                suggestions.map((idea) => (
                  <motion.div
                    key={idea.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    className="group"
                  >
                    <Card className="p-4 cursor-pointer hover:border-primary/50 transition-all border-l-4 border-l-transparent hover:shadow-md"
                          onClick={() => onIdeaSelected(idea)}>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className={cn("text-[10px] uppercase", getPilarText(idea.pilarTipo))}>
                          {idea.pilarName}
                        </Badge>
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                          <SafeIcon name="Video" className="w-3 h-3" />
                          {idea.formato}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 group-hover:text-primary transition-colors leading-tight mb-2">
                        {idea.gancho}
                      </h4>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {idea.desc}
                      </p>
                      <div className="mt-4 flex items-center justify-end">
                        <span className="text-[10px] font-bold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          Usar esta idea <SafeIcon name="ArrowRight" className="w-3 h-3" />
                        </span>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <Button 
                variant="outline" 
                className="w-full bg-white" 
                onClick={loadSuggestions}
                disabled={loading}
              >
                <SafeIcon name="RefreshCw" className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                Generar más ideas
              </Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}