import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
import { Button, Input, Textarea, Label } from '../components/ui/Components';
import { motion, AnimatePresence } from 'framer-motion';
import { SECTORS, COUNTRIES } from '../constants/data';
import { cn } from '../lib/utils';

export default function Onboarding() {
  const { user, setCurrentBusiness } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    pais: 'Colombia',
    ciudad: '',
    sector: '',
    que_hace: '',
    diferente: ''
  });

  const updateForm = (key, value) => setFormData(p => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const biz = await db.createBusiness(user.id, formData);
      setCurrentBusiness(biz);
      navigate(`/n/${biz.id}/wizard/1`);
    } catch (e) {
      alert("Error al crear negocio");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'Tu Marca',
      subtitle: 'Comencemos con lo básico.',
      content: (
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Nombre del Negocio</Label>
            <Input placeholder="Ej. Café Delicia" value={formData.nombre} onChange={e => updateForm('nombre', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>País</Label>
              <select 
                className="w-full h-12 rounded-xl border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                value={formData.pais}
                onChange={e => updateForm('pais', e.target.value)}
              >
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Ciudad</Label>
              <Input placeholder="Ej. Cali" value={formData.ciudad} onChange={e => updateForm('ciudad', e.target.value)} />
            </div>
          </div>
        </div>
      ),
      isValid: formData.nombre && formData.ciudad
    },
    {
      title: 'Tu Industria',
      subtitle: '¿En qué sector compites?',
      content: (
        <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto pr-2">
          {SECTORS.map(s => (
            <button
              key={s}
              onClick={() => updateForm('sector', s)}
              className={cn(
                "p-4 text-left rounded-xl border-2 transition-all text-sm font-medium",
                formData.sector === s ? "border-primary bg-primary/5 text-primary" : "border-gray-100 hover:border-gray-200"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      ),
      isValid: !!formData.sector
    },
    {
      title: 'Tu Diferencial',
      subtitle: '¿Por qué te elegirían a ti?',
      content: (
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>¿Qué haces exactamente?</Label>
            <Textarea 
              placeholder="Ej. Tostamos café de origen único y lo entregamos a domicilio..." 
              value={formData.que_hace} 
              onChange={e => updateForm('que_hace', e.target.value)} 
            />
          </div>
          <div className="space-y-1">
            <Label>Tu factor "Wow" o diferencial</Label>
            <Textarea 
              placeholder="Ej. Tostado el mismo día de la entrega para máxima frescura..." 
              value={formData.diferente} 
              onChange={e => updateForm('diferente', e.target.value)} 
            />
          </div>
        </div>
      ),
      isValid: formData.que_hace.length > 5 && formData.diferente.length > 5
    }
  ];

  const current = steps[step - 1];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-heading font-bold text-primary mb-2">ideastik.</h1>
          <div className="flex justify-center gap-1 mb-6">
            {steps.map((_, i) => (
              <div key={i} className={cn("h-1 w-8 rounded-full", i + 1 <= step ? "bg-primary" : "bg-gray-200")} />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className="text-2xl font-heading font-bold mb-2">{current.title}</h2>
            <p className="text-gray-500 mb-6 text-sm">{current.subtitle}</p>
            {current.content}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3 pt-6">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)}>Atrás</Button>
          )}
          <Button 
            className="flex-1 shadow-lg shadow-primary/20" 
            disabled={!current.isValid} 
            isLoading={loading}
            onClick={() => step === steps.length ? handleSubmit() : setStep(s => s + 1)}
          >
            {step === steps.length ? 'Crear Estrategia' : 'Siguiente'}
          </Button>
        </div>
      </div>
    </div>
  );
}