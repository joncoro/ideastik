import React, { useState } from 'react';
import { Card, Button } from './ui/Components';
import SafeIcon from '../common/SafeIcon';
import { generarTexto } from '../lib/ia';
import { tipParaNegocio, semanaActual } from '../lib/bancoTips';

// Etiqueta e ícono por categoría de tip.
const CAT = {
  algoritmo: { icon: 'TrendingUp', label: 'Algoritmo' },
  contenido: { icon: 'Edit3', label: 'Contenido' },
  crecimiento: { icon: 'Users', label: 'Crecer' },
  constancia: { icon: 'Repeat', label: 'Constancia' },
  tendencia: { icon: 'Zap', label: 'Tendencia' },
};

/**
 * Tarjeta "Tip para tu negocio" (Fase 1). Muestra un consejo REAL curado,
 * rotado por semana según el sector, y opcionalmente lo personaliza con IA.
 */
export default function TipNegocio({ business }) {
  const [offset, setOffset] = useState(0);
  const [personalizado, setPersonalizado] = useState('');
  const [cargando, setCargando] = useState(false);

  const seed = semanaActual();
  const tip = tipParaNegocio(business?.sector, seed, offset);
  if (!tip) return null;
  const cat = CAT[tip.cat] || { icon: 'Star', label: 'Tip' };

  const otroTip = () => { setOffset(o => o + 1); setPersonalizado(''); };

  const aplicar = async () => {
    if (cargando) return;
    setCargando(true);
    try {
      const b = business || {};
      const system = `Eres el asesor de redes de Ideastik para "${b.nombre || 'este negocio'}" (sector ${b.sector || 'general'}${b.que_hace ? `, ${b.que_hace}` : ''}). Recibes un consejo GENERAL de redes y lo aterrizas a ESTE negocio en 2 o 3 frases concretas y accionables. No inventes datos del negocio que no te den; no uses relleno ni adjetivos vacíos; habla claro y directo, como a alguien con poco tiempo.`;
      const userMsg = `Consejo general: "${tip.t}". Explícame en 2-3 frases cómo aplicarlo específicamente en mi negocio, con un ejemplo concreto de post o acción que pueda hacer esta semana.`;
      const texto = await generarTexto(system, [{ role: 'user', content: userMsg }], 260);
      if (texto) setPersonalizado(texto);
    } catch (e) {
      console.error('No se pudo personalizar el tip:', e);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Card className="p-4 md:p-5 mb-6 bg-gradient-to-r from-primary/5 to-success/5 border-primary/10">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <SafeIcon name="Award" className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-bold text-primary uppercase tracking-wide">Tip para tu negocio</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-gray-500 border border-gray-200 flex items-center gap-1">
              <SafeIcon name={cat.icon} className="w-2.5 h-2.5" /> {cat.label}
            </span>
          </div>
          <p className="text-sm text-gray-800 font-medium leading-snug">{tip.t}</p>

          {personalizado && (
            <div className="mt-2 rounded-xl bg-white/70 border border-primary/10 p-3 text-[13px] text-gray-700 leading-relaxed whitespace-pre-line">
              <span className="font-bold text-primary">Para tu negocio: </span>{personalizado}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <Button size="sm" variant="outline" onClick={aplicar} isLoading={cargando}>
              <SafeIcon name="Zap" className="w-3.5 h-3.5 mr-1.5" /> {personalizado ? 'Aplícalo de nuevo' : 'Aplícalo a mi negocio'}
            </Button>
            <button onClick={otroTip} className="text-[11px] text-gray-400 hover:text-primary flex items-center gap-1">
              <SafeIcon name="RefreshCw" className="w-3 h-3" /> Otro tip
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
