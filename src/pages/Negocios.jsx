import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, Badge } from '../components/ui/Components';
import SafeIcon from '../common/SafeIcon';
import { cn } from '../lib/utils';
import UpsellModal from '../components/UpsellModal';
import { puedeCrearNegocio, esMensual } from '../lib/plan';

export default function Negocios() {
  const { allBusinesses, switchBusiness, currentBusiness, profile } = useAuth();
  const navigate = useNavigate();
  const [upsell, setUpsell] = useState(false);
  const intentarCrear = () => {
    if (puedeCrearNegocio(profile, allBusinesses.length)) navigate('/empezar');
    else setUpsell(true);
  };

  const abrir = (biz) => {
    switchBusiness(biz);
    const done = biz.current_fase === 'COMPLETADO' || biz.current_fase === 'FIN';
    navigate(done ? `/n/${biz.id}/calendario` : `/n/${biz.id}/estrategia`);
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-fadeup">
      <div>
        <h2 className="text-2xl md:text-3xl font-heading font-bold mb-1">Mis negocios</h2>
        <p className="text-gray-500 text-sm">Elige un negocio para ver su parrilla, o crea uno nuevo.</p>
        {!esMensual(profile) && (
          <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
            <SafeIcon name="Info" className="w-3 h-3" /> Plan gratis: {allBusinesses.length}/1 negocio.
            <button onClick={() => navigate('/cuenta')} className="text-primary font-medium hover:underline">Mejorar</button>
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {allBusinesses.map((biz) => {
          const done = biz.current_fase === 'COMPLETADO' || biz.current_fase === 'FIN';
          return (
            <Card
              key={biz.id}
              onClick={() => abrir(biz)}
              className={cn(
                "p-5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg",
                currentBusiness?.id === biz.id && "ring-2 ring-primary/30"
              )}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-[#8B5CF6] text-white flex items-center justify-center font-heading font-bold text-lg shrink-0">
                  {biz.nombre?.charAt(0) || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-heading font-bold text-lg truncate">{biz.nombre}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide truncate">{biz.sector || 'Negocio'}</p>
                </div>
                <Badge variant={done ? 'success' : 'primary'}>{done ? 'Listo' : 'En progreso'}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 text-xs flex items-center gap-1.5">
                  <SafeIcon name={done ? 'Calendar' : 'Edit3'} className="w-3.5 h-3.5" />
                  {done ? 'Ver parrilla' : 'Continuar estrategia'}
                </span>
                <SafeIcon name="ArrowRight" className="w-4 h-4 text-primary" />
              </div>
            </Card>
          );
        })}

        <button
          onClick={intentarCrear}
          className="rounded-3xl border-2 border-dashed border-primary/30 bg-white/30 hover:bg-white/50 transition-colors p-5 flex flex-col items-center justify-center gap-2 text-primary min-h-[150px]"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><SafeIcon name="Plus" className="w-6 h-6" /></div>
          <span className="font-bold text-sm">Crear nuevo negocio</span>
        </button>
      </div>

      <UpsellModal
        open={upsell}
        onClose={() => setUpsell(false)}
        titulo="Vas genial con tu primer negocio"
        mensaje="El plan gratis incluye 1 negocio. Mejora a Mensual para crear negocios ilimitados y planear varios meses."
      />
    </div>
  );
}
