import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import supabase from '../supabase/supabase';
import { db } from '../lib/db';
import { Button, Card, Input, Textarea, Label, Badge } from '../components/ui/Components';
import SafeIcon from '../common/SafeIcon';
import { cn } from '../lib/utils';

// ---- Normalizadores (los campos del wizard vienen como jsonb anidado) ----
const normEstrategia = (e) => {
  if (!e) return {};
  return (e.estrategia && typeof e.estrategia === 'object') ? e.estrategia : e;
};
const normNarrativa = (n) => {
  if (!n) return { narrativa: '', tono: '' };
  if (typeof n === 'string') {
    try { const p = JSON.parse(n); return { narrativa: p.narrativa || n, tono: p.tono || '' }; }
    catch (_) { return { narrativa: n, tono: '' }; }
  }
  return { narrativa: n.narrativa || '', tono: n.tono || '' };
};
const getPilaresSel = (biz) => {
  if (Array.isArray(biz?.pilares_seleccionados) && biz.pilares_seleccionados.length) return biz.pilares_seleccionados;
  const p = biz?.pilares;
  if (Array.isArray(p)) return p;
  if (p && Array.isArray(p.pilares)) return p.pilares;
  return [];
};

const TIPOS = ['autoridad', 'conexion', 'venta', 'educacion', 'prueba_social'];

export default function Settings() {
  const { currentBusiness, refreshBusiness } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    nombre: '',
    sector: '',
    ciudad: '',
    que_hace: '',
    whatsapp: '',
    link_catalogo: '',
    link_pago: '',
    link_web: ''
  });

  const [estrategiaForm, setEstrategiaForm] = useState({
    propuesta_valor: '', narrativa: '', tono: '',
    canalPrincipal: '', canalSecundario: '', frecuencia: '', diasHoras: '',
    palabras_propias: '', palabras_prohibidas: ''
  });
  const [pilaresEdit, setPilaresEdit] = useState([]);

  const [reminderSettings, setReminderSettings] = useState({
    enabled: true,
    reminder_hour: '09:00',
    notify_via_email: true,
    notify_via_app: true
  });

  useEffect(() => {
    if (currentBusiness) {
      setFormData({
        nombre: currentBusiness.nombre || '',
        sector: currentBusiness.sector || '',
        ciudad: currentBusiness.ciudad || '',
        que_hace: currentBusiness.que_hace || '',
        whatsapp: currentBusiness.whatsapp || '',
        link_catalogo: currentBusiness.link_catalogo || '',
        link_pago: currentBusiness.link_pago || '',
        link_web: currentBusiness.link_web || ''
      });
      const est = normEstrategia(currentBusiness.estrategia);
      const nar = normNarrativa(currentBusiness.narrativa);
      setEstrategiaForm({
        propuesta_valor: currentBusiness.propuesta_valor || '',
        narrativa: nar.narrativa,
        tono: nar.tono,
        canalPrincipal: est.canalPrincipal || '',
        canalSecundario: est.canalSecundario || '',
        frecuencia: est.frecuencia || '',
        diasHoras: est.diasHoras || '',
        palabras_propias: currentBusiness.palabras_propias || '',
        palabras_prohibidas: currentBusiness.palabras_prohibidas || ''
      });
      setPilaresEdit(getPilaresSel(currentBusiness).map(p => ({
        tipo: p.tipo || 'educacion', nombre: p.nombre || '', desc: p.desc || p.descripcion || ''
      })));
      loadReminderSettings();
    }
  }, [currentBusiness]);

  const loadReminderSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('reminder_settings')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .maybeSingle();
      if (error) throw error;
      if (data) setReminderSettings(data);
    } catch (err) {
      console.error("Error cargando recordatorios:", err);
    }
  };

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await db.updateBusiness(currentBusiness.id, formData);
      await refreshBusiness();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Error al guardar cambios:", err);
      alert('Hubo un error al guardar los cambios. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEstrategia = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const estPrev = normEstrategia(currentBusiness.estrategia);
      const estrategia = {
        ...estPrev,
        canalPrincipal: estrategiaForm.canalPrincipal,
        canalSecundario: estrategiaForm.canalSecundario,
        frecuencia: estrategiaForm.frecuencia,
        diasHoras: estrategiaForm.diasHoras,
        tono: estrategiaForm.tono
      };
      const pilares = pilaresEdit.filter(p => (p.nombre || '').trim());
      await db.updateBusiness(currentBusiness.id, {
        propuesta_valor: estrategiaForm.propuesta_valor,
        narrativa: { narrativa: estrategiaForm.narrativa, tono: estrategiaForm.tono },
        estrategia,
        pilares_seleccionados: pilares,
        palabras_propias: estrategiaForm.palabras_propias,
        palabras_prohibidas: estrategiaForm.palabras_prohibidas
      });
      await refreshBusiness();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Error guardando estrategia:", err);
      alert('No se pudo guardar la estrategia.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReminders = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('reminder_settings')
        .upsert({
          business_id: currentBusiness.id,
          ...reminderSettings,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Error al guardar recordatorios:", err);
      alert('No se pudieron guardar las preferencias de recordatorio.');
    } finally {
      setLoading(false);
    }
  };

  const updatePilar = (i, field, val) => setPilaresEdit(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  const removePilar = (i) => setPilaresEdit(prev => prev.filter((_, idx) => idx !== i));
  const addPilar = () => setPilaresEdit(prev => [...prev, { tipo: 'autoridad', nombre: '', desc: '' }]);

  const tab = (id, label) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn("px-4 py-2 text-sm font-medium rounded-xl transition-all", activeTab === id ? "bg-white shadow-sm text-primary" : "text-gray-500 hover:text-gray-700")}
    >
      {label}
    </button>
  );

  const SaveBtn = ({ onClick, type, label }) => (
    <Button type={type} onClick={onClick} variant={saved ? 'success' : 'primary'} isLoading={loading} className="px-8">
      {saved ? (<><SafeIcon name="Check" className="w-4 h-4 mr-1.5" /> Guardado</>) : label}
    </Button>
  );

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6 animate-fadeup">
      <div>
        <h2 className="text-2xl font-heading font-bold mb-1">Ajustes</h2>
        <p className="text-gray-500 text-sm">Configura la identidad, estrategia y notificaciones de <span className="text-primary font-bold">{currentBusiness?.nombre}</span>.</p>
      </div>

      <div className="flex gap-1 bg-white/50 backdrop-blur border border-white/60 p-1 rounded-2xl w-fit">
        {tab('general', 'General')}
        {tab('estrategia', 'Estrategia')}
        {tab('reminders', 'Recordatorios')}
      </div>

      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Nombre comercial</Label>
              <Input value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sector</Label>
                <Input value={formData.sector} onChange={e => setFormData({ ...formData, sector: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input value={formData.ciudad} onChange={e => setFormData({ ...formData, ciudad: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>¿Qué hace tu negocio?</Label>
              <Textarea value={formData.que_hace} onChange={e => setFormData({ ...formData, que_hace: e.target.value })} className="min-h-[100px]" />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp para ventas</Label>
              <Input type="tel" value={formData.whatsapp} onChange={e => setFormData({ ...formData, whatsapp: e.target.value })} placeholder="Ej. +57 300 123 4567" />
              <p className="text-xs text-gray-400">Se inserta en el botón de WhatsApp del editor de publicaciones.</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Link de catálogo</Label>
                <Input value={formData.link_catalogo} onChange={e => setFormData({ ...formData, link_catalogo: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Link de pago</Label>
                <Input value={formData.link_pago} onChange={e => setFormData({ ...formData, link_pago: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Web o perfil</Label>
                <Input value={formData.link_web} onChange={e => setFormData({ ...formData, link_web: e.target.value })} placeholder="https://..." />
              </div>
            </div>
          </Card>
          <div className="flex justify-end pt-2">
            <SaveBtn type="submit" label="Guardar cambios" />
          </div>
        </form>
      )}

      {activeTab === 'estrategia' && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <SafeIcon name="Compass" className="w-4 h-4 text-primary" />
              <h3 className="font-heading font-bold text-lg">Propuesta de valor y narrativa</h3>
            </div>
            <div className="space-y-2">
              <Label>Propuesta de valor</Label>
              <Textarea value={estrategiaForm.propuesta_valor} onChange={e => setEstrategiaForm({ ...estrategiaForm, propuesta_valor: e.target.value })} className="min-h-[70px]" placeholder="La frase que resume por qué te eligen." />
            </div>
            <div className="space-y-2">
              <Label>Narrativa de marca</Label>
              <Textarea value={estrategiaForm.narrativa} onChange={e => setEstrategiaForm({ ...estrategiaForm, narrativa: e.target.value })} className="min-h-[110px]" placeholder="El relato de tu marca." />
            </div>
            <div className="space-y-2">
              <Label>Tono</Label>
              <Input value={estrategiaForm.tono} onChange={e => setEstrategiaForm({ ...estrategiaForm, tono: e.target.value })} placeholder="Ej. cercano y de tú a tú" />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <SafeIcon name="Send" className="w-4 h-4 text-primary" />
              <h3 className="font-heading font-bold text-lg">Estrategia de publicación</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Canal principal</Label>
                <Input value={estrategiaForm.canalPrincipal} onChange={e => setEstrategiaForm({ ...estrategiaForm, canalPrincipal: e.target.value })} placeholder="Instagram" />
              </div>
              <div className="space-y-2">
                <Label>Canal secundario</Label>
                <Input value={estrategiaForm.canalSecundario} onChange={e => setEstrategiaForm({ ...estrategiaForm, canalSecundario: e.target.value })} placeholder="TikTok" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Input value={estrategiaForm.frecuencia} onChange={e => setEstrategiaForm({ ...estrategiaForm, frecuencia: e.target.value })} placeholder="Ej. 3-4 por semana" />
            </div>
            <div className="space-y-2">
              <Label>Días y horas sugeridos</Label>
              <Textarea value={estrategiaForm.diasHoras} onChange={e => setEstrategiaForm({ ...estrategiaForm, diasHoras: e.target.value })} className="min-h-[70px]" placeholder="Ej. Martes y jueves 7pm, sábado mediodía." />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SafeIcon name="Grid" className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-bold text-lg">Pilares de contenido</h3>
              </div>
              <button onClick={addPilar} className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                <SafeIcon name="Plus" className="w-3.5 h-3.5" /> Añadir
              </button>
            </div>
            {pilaresEdit.length === 0 && <p className="text-xs text-gray-400 italic">No hay pilares aún. Añade uno o créalos en el wizard.</p>}
            <div className="space-y-3">
              {pilaresEdit.map((p, i) => (
                <div key={i} className="rounded-2xl border border-white/70 bg-white/50 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={p.tipo}
                      onChange={e => updatePilar(i, 'tipo', e.target.value)}
                      className="h-9 rounded-xl border border-white/70 bg-white/70 px-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <Input value={p.nombre} onChange={e => updatePilar(i, 'nombre', e.target.value)} placeholder="Nombre del pilar" className="h-9 flex-1" />
                    <button onClick={() => removePilar(i)} className="p-2 text-gray-400 hover:text-red-500 transition-colors shrink-0">
                      <SafeIcon name="Trash2" className="w-4 h-4" />
                    </button>
                  </div>
                  <Input value={p.desc} onChange={e => updatePilar(i, 'desc', e.target.value)} placeholder="Descripción corta del pilar" className="h-9 text-xs" />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <SafeIcon name="Feather" className="w-4 h-4 text-primary" />
              <h3 className="font-heading font-bold text-lg">Voz y estilo (Agente Editor)</h3>
            </div>
            <p className="text-xs text-gray-500 -mt-2">Personaliza cómo suena tu contenido. La IA lo respeta al generar ideas y redactar copy.</p>
            <div className="space-y-1.5">
              <Label>Tu vocabulario</Label>
              <Textarea value={estrategiaForm.palabras_propias} onChange={e => setEstrategiaForm({ ...estrategiaForm, palabras_propias: e.target.value })} className="min-h-[60px]" placeholder="Palabras, muletillas o expresiones que SÍ usas. Ej. 'parce', 'a la fija', 'te cuento'." />
            </div>
            <div className="space-y-1.5">
              <Label>Palabras prohibidas</Label>
              <Textarea value={estrategiaForm.palabras_prohibidas} onChange={e => setEstrategiaForm({ ...estrategiaForm, palabras_prohibidas: e.target.value })} className="min-h-[60px]" placeholder="Palabras que NO quieres ver. Ej. 'increíble', 'revolucionario', 'líder', 'calidad'." />
            </div>
          </Card>

          <div className="flex justify-end pt-2">
            <SaveBtn onClick={handleSaveEstrategia} label="Guardar estrategia" />
          </div>
        </div>
      )}

      {activeTab === 'reminders' && (
        <div className="space-y-6">
          <Card className="p-6 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900">Activar recordatorios</h4>
                <p className="text-sm text-gray-500">Te avisaremos cuando sea momento de publicar.</p>
              </div>
              <button
                onClick={() => setReminderSettings({ ...reminderSettings, enabled: !reminderSettings.enabled })}
                className={cn("w-12 h-6 rounded-full transition-colors relative", reminderSettings.enabled ? "bg-primary" : "bg-gray-300")}
              >
                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", reminderSettings.enabled ? "left-7" : "left-1")} />
              </button>
            </div>

            <div className={cn("space-y-6 transition-opacity", !reminderSettings.enabled && "opacity-50 pointer-events-none")}>
              <div className="space-y-3">
                <Label>Hora del recordatorio diario</Label>
                <div className="flex items-center gap-3">
                  <Input type="time" className="w-32" value={reminderSettings.reminder_hour} onChange={e => setReminderSettings({ ...reminderSettings, reminder_hour: e.target.value })} />
                  <p className="text-xs text-gray-400">Hora local para recibir alertas en tu móvil/email.</p>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Canales de notificación</Label>
                <div className="grid gap-3">
                  <button onClick={() => setReminderSettings({ ...reminderSettings, notify_via_app: !reminderSettings.notify_via_app })} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <SafeIcon name="Smartphone" className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium">Notificaciones en la App</span>
                    </div>
                    {reminderSettings.notify_via_app && <SafeIcon name="Check" className="text-primary w-5 h-5" />}
                  </button>

                  <button onClick={() => setReminderSettings({ ...reminderSettings, notify_via_email: !reminderSettings.notify_via_email })} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <SafeIcon name="Mail" className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium">Correo electrónico</span>
                    </div>
                    {reminderSettings.notify_via_email && <SafeIcon name="Check" className="text-primary w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-alert/5 border-alert/20">
            <div className="flex gap-3">
              <SafeIcon name="Zap" className="w-5 h-5 text-alert shrink-0" />
              <p className="text-xs text-gray-700 leading-relaxed">
                <b>Nota:</b> Los recordatorios automáticos se envían solo para publicaciones en estado <b>"Listo"</b> o <b>"Borrador"</b> que tengan una fecha programada para hoy o mañana.
              </p>
            </div>
          </Card>

          <div className="flex justify-end pt-2">
            <SaveBtn onClick={handleSaveReminders} label="Guardar preferencias" />
          </div>
        </div>
      )}
    </div>
  );
}
