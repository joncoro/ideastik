import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { aiService } from '../lib/mockAi';
import { db } from '../lib/db';
import { Button, Card, Badge } from '../components/ui/Components';
import Spinner from '../components/ui/Spinner';
import SafeIcon from '../common/SafeIcon';
import WizardAgent from '../components/WizardAgent';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, getPilarBorder } from '../lib/utils';
import { PILARES_INFO } from '../constants/data';

export default function Wizard() {
  const { bizId, fase } = useParams();
  const { currentBusiness, refreshBusiness } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stepData, setStepData] = useState(null);
  
  const step = parseInt(fase) || 1;

  useEffect(() => {
    if (currentBusiness) loadStep();
  }, [step, currentBusiness?.id]);

  const loadStep = async () => {
    setLoading(true);
    try {
      if (step === 1) {
        const res = await aiService.generarPropuestaValor(currentBusiness);
        setStepData(res);
      } else if (step === 2) {
        const res = await aiService.sugerirPilares(currentBusiness);
        setStepData(res);
      } else if (step === 3) {
        const res = await aiService.generarEstrategia(currentBusiness);
        setStepData(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      let updates = { wizard_step: Math.max(currentBusiness.wizard_step, step) };
      if (step === 1) updates = { ...updates, pv_opciones: stepData, narrativa: stepData };
      if (step === 2) updates = { ...updates, pilares: stepData };
      if (step === 3) updates = { ...updates, estrategia: stepData };

      await db.updateBusiness(bizId, updates);
      await refreshBusiness();

      if (step < 3) navigate(`/n/${bizId}/wizard/${step + 1}`);
      else {
        if (currentBusiness.wizard_step < 4) {
          await finalizeWizard();
        }
        navigate(`/n/${bizId}/calendario`);
      }
    } catch (e) {
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const finalizeWizard = async () => {
    const grid = await db.createGrid(bizId, new Date().getMonth() + 1, new Date().getFullYear());
    const posts = currentBusiness.pilares.map((p, i) => ({
      grid_id: grid.id,
      fecha: new Date(Date.now() + i * 86400000 * 2).toISOString(),
      pilar: p.nombre,
      pilar_tipo: p.tipo,
      gancho: `Post Estratégico: ${p.nombre}`,
      canal: currentBusiness.estrategia?.canalPrincipal || 'Instagram',
      hora: '19:00'
    }));
    await db.createPosts(posts);
    await db.updateBusiness(bizId, { wizard_step: 5 });
  };

  const renderContent = () => {
    if (loading) return (
      <div className="py-20 text-center">
        <Spinner />
        <p className="text-gray-400 mt-4 font-medium animate-pulse">Nuestro agente está diseñando tu narrativa...</p>
      </div>
    );

    switch (step) {
      case 1:
        return (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <Badge variant="primary" className="mb-4">ESTRATEGIA MAESTRA</Badge>
              <h2 className="text-4xl font-heading font-bold text-gray-900">Tu ADN de Marca</h2>
            </div>
            
            <Card className="p-8 border-primary/20 bg-primary/5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <SafeIcon name="Quote" className="w-20 h-20" />
              </div>
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Propuesta de Valor</p>
              <p className="text-2xl font-medium leading-relaxed italic text-gray-800">"{stepData?.vp}"</p>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 bg-white border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-success/10 rounded-lg text-success"><SafeIcon name="BookOpen" className="w-4 h-4" /></div>
                  <h4 className="font-bold text-sm uppercase text-gray-400">Narrativa</h4>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{stepData?.narrativa}</p>
              </Card>
              <Card className="p-6 bg-white border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-alert/10 rounded-lg text-alert"><SafeIcon name="Users" className="w-4 h-4" /></div>
                  <h4 className="font-bold text-sm uppercase text-gray-400">Storytelling de Audiencia</h4>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{stepData?.storytelling}</p>
              </Card>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-heading font-bold mb-8">Tus Pilares de Contenido</h2>
            <div className="grid md:grid-cols-2 gap-4 text-left">
              {stepData?.map((p, i) => (
                <Card key={i} className={cn("p-6 border-l-4 hover:shadow-lg transition-all", getPilarBorder(p.tipo))}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{p.nombre}</h3>
                    <Badge variant="outline" className="text-[10px] uppercase">{p.tipo}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">{p.descripcion}</p>
                </Card>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 max-w-2xl mx-auto">
            <h2 className="text-3xl font-heading font-bold text-center mb-8">Canales y Planificación</h2>
            <Card className="p-0 overflow-hidden shadow-xl">
              <div className="bg-primary p-6 text-white">
                <p className="text-xs uppercase font-bold opacity-80 mb-1">Tu Canal Maestro</p>
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <SafeIcon name="Instagram" className="w-6 h-6" /> {stepData?.canalPrincipal}
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500 flex items-center gap-2"><SafeIcon name="Calendar" className="w-4 h-4" /> Frecuencia</span>
                  <span className="font-bold">{stepData?.frecuencia} posts / semana</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500 flex items-center gap-2"><SafeIcon name="Clock" className="w-4 h-4" /> Horario Óptimo</span>
                  <span className="font-bold">{stepData?.horarios}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-gray-500 flex items-center gap-2"><SafeIcon name="MessageSquare" className="w-4 h-4" /> Tono Recomendado</span>
                  <span className="italic font-medium">{stepData?.tono}</span>
                </div>
              </div>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-heading font-bold text-primary">ideastik.</h1>
            <div className="h-4 w-px bg-gray-200" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estrategia</span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn("h-1.5 w-12 rounded-full transition-all", i <= step ? "bg-primary" : "bg-gray-200")} />
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={loadStep} className="hidden md:flex">
            <SafeIcon name="RefreshCw" className="w-4 h-4 mr-2" /> Reiniciar IA
          </Button>
        </div>
      </header>

      <main className="p-6 md:p-12 pb-32">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {renderContent()}
          </motion.div>
        </AnimatePresence>

        {!loading && (
          <div className="mt-12 flex justify-center">
            <Button size="lg" className="px-12 h-14 shadow-2xl shadow-primary/20" onClick={handleNext}>
              {step === 3 ? 'Activar Calendario' : 'Confirmar y Seguir'}
              <SafeIcon name="ArrowRight" className="ml-2 w-5 h-5" />
            </Button>
          </div>
        )}
      </main>

      <WizardAgent 
        step={step} 
        businessName={currentBusiness?.nombre} 
        context={step === 1 ? "ADN de Marca" : step === 2 ? "Pilares" : "Planificación"} 
      />
    </div>
  );
}