import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
import { aiService } from '../lib/mockAi';
import { Button, Card, Textarea, Badge } from '../components/ui/Components';
import Spinner from '../components/ui/Spinner';
import SafeIcon from '../common/SafeIcon';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import WizardAgent from '../components/WizardAgent';

export default function Composer() {
  const { postId } = useParams();
  const { currentBusiness } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copy, setCopy] = useState('');

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    setLoading(true);
    const p = await db.getPost(postId);
    if (p) {
      setPost(p);
      setCopy(p.copy || '');
    }
    setLoading(false);
  };

  const handleGenerateContent = async () => {
    setGenerating(true);
    try {
      const res = await aiService.armarPublicacion(post, currentBusiness);
      setCopy(res.copy);
      await db.updatePost(postId, { copy: res.copy, status: 'READY' });
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleApplySuggestion = async (newCopy) => {
    setCopy(newCopy);
    await db.updatePost(postId, { copy: newCopy, status: 'READY' });
  };

  // Inserta un llamado a la acción al final del copy. Usa el WhatsApp del negocio
  // si está configurado; si no, deja una plantilla para que el usuario lo complete.
  const handleInsertCTA = (tipo) => {
    const wpp = currentBusiness?.whatsapp || currentBusiness?.telefono;
    let cta = '';
    if (tipo === 'whatsapp') {
      cta = wpp
        ? `\n\n📲 Escríbeme por WhatsApp al ${wpp} y te ayudo a elegir lo ideal para ti.`
        : `\n\n📲 Escríbeme por WhatsApp [tu número aquí] y te ayudo a elegir lo ideal para ti.`;
    } else if (tipo === 'pedido') {
      cta = `\n\n🛒 Haz tu pedido hoy: [link o número]. Cupos/unidades limitadas.`;
    } else if (tipo === 'perfil') {
      cta = `\n\n👀 Mira más en mi perfil y guarda este post si te sirvió.`;
    }
    const nuevo = (copy || '').trimEnd() + cta;
    setCopy(nuevo);
    db.updatePost(postId, { copy: nuevo, status: 'READY' });
  };

  if (loading || !post) return <div className="p-20 text-center"><Spinner /></div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <SafeIcon name="ArrowLeft" className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h2 className="font-bold text-sm capitalize">{format(new Date(post.fecha), "EEEE d 'de' MMMM", { locale: es })}</h2>
            <Badge variant="primary" className="text-[10px] uppercase">{post.pilar}</Badge>
          </div>
        </div>
        <Button size="sm" onClick={() => navigate(-1)}>Guardar y Salir</Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="font-bold text-lg text-gray-900 leading-snug">{post.gancho}</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full bg-primary/5 text-primary hover:bg-primary/10" 
                onClick={handleGenerateContent} 
                isLoading={generating}
              >
                <SafeIcon name="Sparkles" className="w-4 h-4 mr-2" />
                {copy ? 'Regenerar con IA' : 'Generar Copy Estratégico'}
              </Button>
            </Card>

            <Card className="p-0 overflow-hidden border-primary/10 shadow-sm">
              <Textarea 
                value={copy} 
                onChange={e => setCopy(e.target.value)} 
                className="border-0 focus-visible:ring-0 min-h-[400px] p-6 text-base leading-relaxed" 
                placeholder="Tu copy aparecerá