import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import supabase from '../supabase/supabase';
import { db } from '../lib/db';
import { Button, Card, Input, Textarea, Label, Badge } from '../components/ui/Components';
import SafeIcon from '../common/SafeIcon';
import { cn } from '../lib/utils';

export default function Settings() {
  const { currentBusiness, refreshBusiness } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    nombre: '',
    sector: '',
    ciudad: '',
    que_hace: '', // Corregido camelCase a snake_case para DB
    whatsapp: ''
  });

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
        whatsapp: currentBusiness.whatsapp || ''
      });
      loadReminderSettings();
    }
  }, [currentBusiness]);

  const loadReminderSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('reminder_settings') // Nombre estable
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

  const handleSaveReminders = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('reminder_settings') // Nombre estable
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

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-heading font-bold mb-1">Ajustes</h2>
        <p className="text-gray-500 text-sm">Configura la identidad y notificaciones de <span className="text-primary font-bold">{currentBusiness?.nombre}</span>.</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('general')} 
          className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all", activeTab === 'general' ? "bg-white shadow-sm text-primary" : "text-gray-500 hover:text-gray-700")}
        >
          General
        </button>
        <button 
          onClick={() => setActiveTab('reminders')} 
          className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all", activeTab === 'reminders' ? "bg-white shadow-sm text-primary" : "text-gray-500 hover:text-gray-700")}
        >
          Recordatorios
        </button>
      </div>

      {activeTab === 'general' ? (
        <form onSubmit={handleSaveGeneral} className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Nombre comercial</Label>
              <Input 
                value={formData.nombre} 
                onChange={e => setFormData({ ...formData, nombre: e.target.value })} 
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sector</Label>
                <Input 
                  value={formData.sector} 
                  onChange={e => setFormData({ ...formData, sector: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input 
                  value={formData.ciudad} 
                  onChange={e => setFormData({ ...formData, ciudad: e.target.value })} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>¿Qué hace tu negocio?</Label>
              <Textarea 
                value={formData.que_hace} 
                onChange={e => setFormData({ ...formData, que_hace: e.target.value })} 
                className="min-h-[100px]" 
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp para ventas</Label>
              <Input
                type="tel"
                value={formData.whatsapp}
                onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="Ej. +57 300 123 4567"
              />
              <p className="text-xs text-gray-400">Se insertará automáticamente en el botón de WhatsApp del editor de publicaciones.</p>
            </div>
          </Card>

          <section className="space-y-4">
            <h3 className="font-heading font-bold text-xl">Pilares Actuales</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {currentBusiness?.pilares?.pilares ? currentBusiness.pilares.pilares.map((p, i) => (
                <Card key={i} className="p-4 flex items-center justify-between bg-white border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-medium text-sm">{p.nombre}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{p.tipo}</Badge>
                </Card>
              )) : (
                <p className="text-xs text-gray-400 italic">No hay pilares definidos aún.</p>
              )}
            </div>
          </section>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <Button type="submit" variant={saved ? 'success' : 'primary'} isLoading={loading} className="px-8 shadow-lg shadow-primary/20">
              {saved ? (<><SafeIcon name="Check" className="w-4 h-4 mr-1.5" /> Guardado</>) : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <Card className="p-6 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900">Activar recordatorios</h4>
                <p className="text-sm text-gray-500">Te avisaremos cuando sea momento de publicar.</p>
              </div>
              <button 
                onClick={() => setReminderSettings({ ...reminderSettings, enabled: !reminderSettings.enabled })} 
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative", 
                  reminderSettings.enabled ? "bg-primary" : "bg-gray-300"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all", 
                  reminderSettings.enabled ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className={cn("space-y-6 transition-opacity", !reminderSettings.enabled && "opacity-50 pointer-events-none")}>
              <div className="space-y-3">
                <Label>Hora del recordatorio diario</Label>
                <div className="flex items-center gap-3">
                  <Input 
                    type="time" 
                    className="w-32" 
                    value={reminderSettings.reminder_hour} 
                    onChange={e => setReminderSettings({ ...reminderSettings, reminder_hour: e.target.value })} 
                  />
                  <p className="text-xs text-gray-400">Hora local para recibir alertas en tu móvil/email.</p>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Canales de notificación</Label>
                <div className="grid gap-3">
                  <button 
                    onClick={() => setReminderSettings({ ...reminderSettings, notify_via_app: !reminderSettings.notify_via_app })} 
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <SafeIcon name="Smartphone" className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium">Notificaciones en la App</span>
                    </div>
                    {reminderSettings.notify_via_app && <SafeIcon name="Check" className="text-primary w-5 h-5" />}
                  </button>

                  <button 
                    onClick={() => setReminderSettings({ ...reminderSettings, notify_via_email: !reminderSettings.notify_via_email })} 
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
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

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <Button onClick={handleSaveReminders} variant={saved ? 'success' : 'primary'} isLoading={loading} className="px-8 shadow-lg shadow-primary/20">
              {saved ? (<><SafeIcon name="Check" className="w-4 h-4 mr-1.5" /> Guardado</>) : 'Guardar preferencias'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}