import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
import { Button, Input, Label, Card } from '../components/ui/Components';
import { motion } from 'framer-motion';
import { SECTORS, COUNTRIES } from '../constants/data';
import { puedeCrearNegocio } from '../lib/plan';
import SafeIcon from '../common/SafeIcon';
import { cn } from '../lib/utils';

/**
 * Formulario de arranque (después del login). Captura solo los datos OBJETIVOS
 * del negocio (nombre, sector, ciudad/país) sin gastar llamadas de IA. Con eso
 * ya listo, crea el negocio y manda al chat, que arranca directo en la parte que
 * aporta valor (¿qué vendes? → diferencial → cliente ideal → estrategia).
 */
export default function Onboarding() {
  const { user, switchBusiness, profile, allBusinesses } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ nombre: '', sector: '', pais: 'Colombia', ciudad: '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Freemium: el plan gratis permite 1 negocio. Si ya no puede, a Negocios (upsell).
  useEffect(() => {
    if (profile && !puedeCrearNegocio(profile, (allBusinesses || []).length)) {
      navigate('/negocios', { replace: true });
    }
  }, [profile, allBusinesses]);

  const valido = form.nombre.trim().length > 1 && !!form.sector && form.ciudad.trim().length > 1;

  const handleSubmit = async () => {
    if (!valido || loading) return;
    setLoading(true);
    setError('');
    try {
      const biz = await db.createBusiness(user.id, {
        nombre: form.nombre.trim(),
        sector: form.sector,
        ciudad: `${form.ciudad.trim()}, ${form.pais}`,
        // El chat arranca aquí: ya tenemos nombre/sector/ciudad, así que saltamos
        // las preguntas básicas y empezamos por lo sustancial.
        current_fase: 'DATOS_QUEHACE',
      });
      switchBusiness(biz);
      navigate(`/n/${biz.id}/estrategia`, { replace: true });
    } catch (e) {
      console.error(e);
      setError('No pudimos crear tu negocio. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        {(allBusinesses || []).length > 0 && (
          <button onClick={() => navigate('/negocios')} className="mb-4 text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors">
            <SafeIcon name="ArrowLeft" className="w-4 h-4" /> Volver a mis negocios
          </button>
        )}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-primary mb-1">ideastik<span className="text-success">.</span></h1>
          <p className="text-gray-500 text-sm">Cuéntanos lo básico de tu negocio. Toma 30 segundos.</p>
        </div>

        <Card className="p-6 md:p-8 space-y-5">
          <div className="space-y-1.5">
            <Label>¿Cómo se llama tu negocio o marca?</Label>
            <Input placeholder="Ej. Café Delicia" value={form.nombre} onChange={e => set('nombre', e.target.value)} autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label>¿En qué sector estás?</Label>
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {SECTORS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('sector', s)}
                  className={cn(
                    "p-2.5 text-left rounded-xl border text-[12px] font-medium transition-all leading-tight",
                    form.sector === s
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-white/70 bg-white/50 text-gray-600 hover:border-primary/30"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>País</Label>
              <select
                className="w-full h-12 rounded-2xl border border-white/70 bg-white/60 backdrop-blur px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.pais}
                onChange={e => set('pais', e.target.value)}
              >
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Ciudad</Label>
              <Input placeholder="Ej. Cali" value={form.ciudad} onChange={e => set('ciudad', e.target.value)} />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <Button className="w-full shadow-lg shadow-primary/20" disabled={!valido} isLoading={loading} onClick={handleSubmit}>
            <SafeIcon name="Zap" className="w-4 h-4 mr-2" /> Empezar mi estrategia
          </Button>
          <p className="text-[11px] text-center text-gray-400">Después seguimos en una conversación corta para afinar tu estrategia.</p>
        </Card>
      </motion.div>
    </div>
  );
}
