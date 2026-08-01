import React, { useState } from 'react';
import { Button } from './ui/Components';
import SafeIcon from '../common/SafeIcon';
import { generarTexto } from '../lib/ia';
import { tipParaNegocio, semanaActual } from '../lib/bancoTips';

// Emoji juguetón por categoría (para que se sienta divertido, no corporativo).
const EMOJI = {
  algoritmo: '🤖', contenido: '🎬', crecimiento: '🚀', constancia: '🔥', tendencia: '✨',
};

/**
 * "Chispa del día": tip REAL curado (rota por semana/sector), compacto y con
 * tono divertido. Ocupa poco espacio; se expande solo si el usuario pide que la
 * IA lo aterrice a su negocio.
 */
export default function TipNegocio({ business }) {
  const [offset, setOffset] = useState(0);
  const [personalizado, setPersonalizado] = useState('');
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const seed = semanaActual();
  const tip = tipParaNegocio(business?.sector, seed, offset);
  if (!tip) return null;
  const emoji = EMOJI[tip.cat] || '💡';

  const otroTip = () => { setOffset(o => o + 1); setPersonalizado(''); setAbierto(false); };

  const aplicar = async () => {
    if (cargando) return;
    setCargando(true);
    setAbierto(true);
    try {
      const b = business || {};
      const system = `Eres el asesor de redes de Ideastik para "${b.nombre || 'este negocio'}" (sector ${b.sector || 'general'}${b.que_hace ? `, ${b.que_hace}` : ''}). Recibes un consejo GENERAL de redes y lo aterrizas a ESTE negocio en 2 frases concretas y con buena onda. No inventes datos que no te den; nada de relleno; habla claro y con chispa, como a alguien con poco tiempo.`;
      const userMsg = `Consejo: "${tip.t}". Dime en 2 frases cómo aplicarlo en mi negocio, con un ejemplo concreto para esta semana.`;
      const texto = await generarTexto(system, [{ role: 'user', content: userMsg }], 220);
      if (texto) setPersonalizado(texto);
    } catch (e) {
      console.error('No se pudo personalizar el tip:', e);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="mb-5 rounded-2xl bg-gradient-to-r from-primary/5 to-alert/5 border border-primary/10 px-3.5 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="text-lg shrink-0" aria-hidden>{emoji}</span>
        <p className="text-[13px] text-gray-700 leading-snug flex-1 min-w-0">
          <span className="font-bold text-primary">Chispa del día · </span>{tip.t}
        </p>
        <button onClick={otroTip} title="Otra chispa" className="text-gray-400 hover:text-primary shrink-0">
          <SafeIcon name="RefreshCw" className="w-3.5 h-3.5" />
        </button>
        <button onClick={aplicar} disabled={cargando} className="text-[11px] font-semibold text-primary hover:underline shrink-0 disabled:opacity-50">
          {cargando ? '…' : 'Aplícalo'}
        </button>
      </div>
      {abierto && personalizado && (
        <div className="mt-2 rounded-xl bg-white/70 border border-primary/10 p-2.5 text-[12px] text-gray-700 leading-relaxed whitespace-pre-line">
          {personalizado}
        </div>
      )}
    </div>
  );
}
