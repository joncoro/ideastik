import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
import { generarTexto } from '../lib/ia';
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
    if (!post) return;
    setGenerating(true);
    try {
      const b = currentBusiness || {};
      const system = `Eres el redactor de contenido de Ideastik para el negocio "${b.nombre || 'este negocio'}". Escribes copy en español, listo para publicar en redes sociales.
Contexto del negocio: vende ${b.que_hace || 'su producto o servicio'}; su diferencial real es ${b.diferente || 'su forma de trabajar'}; sector ${b.sector || 'general'}; cliente ideal ${b.cliente_ideal || 'su audiencia'}.${b.propuesta_valor ? ` Propuesta de valor: ${b.propuesta_valor}.` : ''}
Reglas innegociables: nunca uses el precio como diferenciador; nunca la fórmula "no vendemos X, vendemos Y"; el diferencial vive en la percepción (criterio, asesoría, personalización, conocimiento, sistema, cumplimiento). Háblale directo al cliente ideal y sé específico a ESTE negocio, nada genérico.`;
      const userMsg = `Escribe el copy para esta publicación:
- Pilar: ${post.pilar || 'general'}${post.pilar_tipo ? ` (tipo ${post.pilar_tipo})` : ''}
- Formato: ${post.formato || 'Reel'}
- Canal: ${post.canal || 'Instagram'}
- Gancho base: "${post.gancho || ''}"
Devuelve SOLO el texto del post listo para publicar (sin comillas envolventes, sin encabezados, sin explicaciones). Empieza con un gancho potente, desarrolla en 2 a 4 frases breves con saltos de línea, y cierra con una invitación a la acción suave. Agrega máximo 3 hashtags relevantes al final.`;
      const texto = await generarTexto(system, [{ role: 'user', content: userMsg }], 600);
      if (texto) {
        setCopy(texto);
        await db.updatePost(postId, { copy: texto, status: 'READY' });
      }
    } catch (e) {
      console.error('Error generando copy:', e);
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
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="h-16 bg-white/50 backdrop-blur-xl border-b border-white/40 px-6 flex items-center justify-between shrink-0">
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
                placeholder="Tu copy aparecerá aquí..." 
              />
            </Card>

            <Card className="p-4">
              <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                <SafeIcon name="Megaphone" className="w-3.5 h-3.5 text-primary" /> Cierra la venta: añade un llamado a la acción
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleInsertCTA('whatsapp')} className="text-xs px-3 py-2 rounded-full bg-success/10 text-success font-medium hover:bg-success/20 transition-colors flex items-center gap-1.5">
                  <SafeIcon name="MessageCircle" className="w-3.5 h-3.5" /> WhatsApp
                </button>
                <button onClick={() => handleInsertCTA('pedido')} className="text-xs px-3 py-2 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors flex items-center gap-1.5">
                  <SafeIcon name="ShoppingBag" className="w-3.5 h-3.5" /> Hacer pedido
                </button>
                <button onClick={() => handleInsertCTA('perfil')} className="text-xs px-3 py-2 rounded-full bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors flex items-center gap-1.5">
                  <SafeIcon name="Eye" className="w-3.5 h-3.5" /> Ver perfil
                </button>
              </div>
              {!(currentBusiness?.whatsapp || currentBusiness?.telefono) && (
                <p className="text-[10px] text-gray-400 mt-2">Tip: guarda tu WhatsApp en Ajustes para que se inserte automáticamente.</p>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="aspect-[4/5] bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-200 relative group overflow-hidden">
              {post.image_url ? (
                <img src={post.image_url} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-8">
                  <SafeIcon name="Image" className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-400 font-medium tracking-tight">Previsualización del Post</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <WizardAgent 
        context="editor" 
        data={post} 
        onApplySuggestion={handleApplySuggestion} 
      />
    </div>
  );
}
