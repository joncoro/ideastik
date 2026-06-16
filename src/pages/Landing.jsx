import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Components';
import SafeIcon from '../common/SafeIcon';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <h1 className="text-2xl font-heading font-bold text-primary tracking-tighter">ideastik<span className="text-success">.</span></h1>
        <Button variant="ghost" onClick={() => navigate('/login')}>Entrar</Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-3xl mx-auto py-20">
        <div className="inline-flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full text-sm font-medium mb-8">
          <SafeIcon name="Sparkles" className="w-4 h-4" />
          IA adaptada para negocios reales
        </div>
        
        <h2 className="text-5xl md:text-6xl font-heading font-bold text-foreground leading-tight mb-6">
          Tu contenido del mes,<br/>sin trabas.
        </h2>
        
        <p className="text-lg text-gray-600 mb-10 max-w-xl">
          Cuéntanos qué hace tu negocio. Nuestro agente IA arma tu estrategia, redacta los posts y organiza tu calendario. Cero estrés, cero bloqueos.
        </p>
        
        <Button size="lg" className="text-lg px-10" onClick={() => navigate('/login')}>
          Crea tu primer mes gratis
        </Button>
        <p className="text-sm text-gray-500 mt-4">1 publicación completa de regalo. Sin tarjeta.</p>

        <div className="mt-20 grid md:grid-cols-3 gap-8 text-left border-t border-gray-200 pt-16">
          <div>
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
              <SafeIcon name="MessageCircle" className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-lg mb-2">1. Responde</h3>
            <p className="text-gray-600 text-sm">Preguntas sencillas sobre tu negocio, tu ciudad y lo que te hace diferente.</p>
          </div>
          <div>
            <div className="w-12 h-12 bg-alert/10 rounded-2xl flex items-center justify-center text-alert mb-4">
              <SafeIcon name="Layout" className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-lg mb-2">2. Revisa</h3>
            <p className="text-gray-600 text-sm">La IA genera tus pilares y llena tu calendario con ideas aterrizadas a tu realidad.</p>
          </div>
          <div>
            <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center text-success mb-4">
              <SafeIcon name="PenTool" className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-lg mb-2">3. Publica</h3>
            <p className="text-gray-600 text-sm">Arma posts con copy, hashtags, llamado a la acción y guion de video con un toque.</p>
          </div>
        </div>
      </main>
    </div>
  );
}