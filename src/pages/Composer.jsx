import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
import { generarTexto, generarJSON, generarJSONConImagen } from '../lib/ia';
import { buildSystemPrompt } from '../lib/parrilla';
import { Button, Card, Textarea, Badge } from '../components/ui/Components';
import Spinner from '../components/ui/Spinner';
import SafeIcon from '../common/SafeIcon';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import WizardAgent from '../components/WizardAgent';

export default function Composer() {
  const { postId } = useParams();
  const { currentBusiness } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copy, setCopy] = useState('');
  // Ideas estructuradas: guion de producción + variantes de copy para elegir.
  const [ideas, setIdeas] = useState(null);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  // Historia real del dueño → la IA la pule sin inventar.
  const [historia, setHistoria] = useState('');
  const [mejorando, setMejorando] = useState(false);
  // Banco de material real del negocio (memoria); se inyecta a la IA.
  const [historiasBank, setHistoriasBank] = useState([]);
  const [historiaGuardada, setHistoriaGuardada] = useState(false);
  const [marcando, setMarcando] = useState(false);
  // Foto → contenido (visión de la IA).
  const [imagenPreview, setImagenPreview] = useState(null);
  const [descripcionImagen, setDescripcionImagen] = useState('');
  const [analizandoImagen, setAnalizandoImagen] = useState(false);
  const [errorImagen, setErrorImagen] = useState('');
  const fileInputRef = useRef(null);

  const publicado = post?.status === 'PUBLISHED';
  const handleTogglePublicado = async () => {
    if (!post || marcando) return;
    setMarcando(true);
    try {
      await db.marcarPublicado(post.id, !publicado);
      setPost(p => ({ ...p, status: publicado ? 'READY' : 'PUBLISHED' }));
    } catch (e) {
      console.error('No se pudo actualizar el estado de publicación:', e);
    } finally {
      setMarcando(false);
    }
  };

  useEffect(() => {
    loadPost();
  }, [postId]);

  useEffect(() => {
    if (currentBusiness?.id) {
      db.getHistorias(currentBusiness.id).then(setHistoriasBank).catch(() => {});
    }
  }, [currentBusiness?.id]);

  // Negocio enriquecido con su banco de historias, para que la IA lo use.
  const bizConMemoria = () => ({ ...(currentBusiness || {}), historias: historiasBank });

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
Contexto del negocio: vende ${b.que_hace || 'su producto o servicio'}; su diferencial real es ${b.diferente || 'su forma de trabajar'}; sector ${b.sector || 'general'}; cliente ideal ${b.cliente_ideal || 'su audiencia'}.${b.propuesta_valor ? ` Propuesta de valor: ${b.propuesta_valor}.` : ''}${(() => { const n = b.narrativa; const t = typeof n === 'string' ? n : (n?.narrativa || ''); return t ? ` Narrativa de marca (mantén su espíritu): ${t}.` : ''; })()}
Reglas innegociables: nunca uses el precio como diferenciador; nunca la fórmula "no vendemos X, vendemos Y"; el diferencial vive en la percepción (criterio, asesoría, personalización, conocimiento, sistema, cumplimiento). Háblale directo al cliente ideal y sé específico a ESTE negocio, nada genérico.
NO inventes anécdotas, historias, personas, nombres ni hechos específicos que no se hayan dado. Si el post necesita una historia real y no la tienes, deja un marcador entre corchetes para que el dueño lo complete (ej. "[cuenta aquí tu caso real]") en vez de fabricarla.
Canales de venta para el CTA (usa el que aplique, NO inventes links): WhatsApp ${b.whatsapp || 'no disponible'}, catálogo ${b.link_catalogo || 'no disponible'}, link de pago ${b.link_pago || 'no disponible'}, web ${b.link_web || 'no disponible'}.
Voz del dueño: integra su vocabulario propio (${b.palabras_propias || 'sin indicaciones'}) y NUNCA uses estas palabras prohibidas: ${b.palabras_prohibidas || 'ninguna'}.
Edición (humaniza): muestra en vez de afirmar; prohibidos los adjetivos vacíos (increíble, espectacular, único, innovador, revolucionario, líder, premium, brutal); ritmo variable (alterna frases cortas y largas); cero relleno ("en la era digital", "más que nunca", "no es solo X, es Y"); concreto sobre abstracto.
${historiasBank.length ? `Material real aportado por el dueño (úsalo como PRIMERA fuente, no inventes por encima): ${historiasBank.map(h => `• ${h.texto}`).join(' ')}` : ''}`;
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

  // Genera un GUION de producción + varias VARIANTES de copy para escoger.
  // Reusa el system prompt del estratega, así respeta voz, narrativa y CTAs.
  const handleGenerateIdeas = async () => {
    if (!post) return;
    setGeneratingIdeas(true);
    try {
      const formato = post.formato || 'Reel';
      const system = buildSystemPrompt(bizConMemoria());
      const userMsg = `Publicación del pilar "${post.pilar || 'general'}"${post.pilar_tipo ? ` (tipo ${post.pilar_tipo})` : ''}, formato ${formato}, canal ${post.canal || 'Instagram'}, gancho base "${post.gancho || ''}".
1) GUION de producción concreto para grabar/armar esta pieza: si es Reel o Historia, 3 a 5 pasos de "qué grabar" con el texto en pantalla sugerido; si es Carrusel, el título de 4 a 6 láminas; si es post de imagen, 3 ideas visuales. Cada paso en una frase corta y accionable.
2) Tres VARIANTES de copy con enfoques DISTINTOS (por ejemplo: historia real, dato útil, venta directa). Cada variante lista para publicar: gancho + 2 a 4 frases con saltos de línea + un CTA suave + máximo 3 hashtags.
Responde SOLO con JSON válido y completo: {"guion":{"tipo":"${formato}","titulo":"string corto","pasos":["string","string"]},"variantes":[{"enfoque":"string corto","copy":"string"}]}`;
      const r = await generarJSON(system, [{ role: 'user', content: userMsg }], 1800);
      const guion = r?.guion && typeof r.guion === 'object' ? r.guion : null;
      const variantes = Array.isArray(r?.variantes) ? r.variantes.filter(v => v && v.copy) : [];
      if (guion || variantes.length) setIdeas({ guion, variantes });
    } catch (e) {
      console.error('Error generando ideas:', e);
    } finally {
      setGeneratingIdeas(false);
    }
  };

  const handleUsarVariante = async (texto) => {
    setCopy(texto);
    await db.updatePost(postId, { copy: texto, status: 'READY' });
  };

  // Detecta negocios técnicos / B2B / software, donde el material real no son
  // anécdotas emotivas sino decisiones, criterios, datos y casos de uso.
  const esTecnicoOB2B = (() => {
    const b = currentBusiness || {};
    const txt = `${b.sector || ''} ${b.que_hace || ''} ${b.cliente_ideal || ''}`.toLowerCase();
    return /tecnolog|software|saas|app|plataforma|b2b|consultor|profesional|industri|inmobili|ingenier|legal|contab|financ|agencia|logístic|logistic/.test(txt);
  })();

  const historiaPlaceholder = esTecnicoOB2B
    ? 'Ej. Una decisión técnica que tomamos para resolver X, un error común que cometen los clientes, o un caso real que resolvimos...'
    : 'Ej. Hoy una clienta volvió por su tercer par y me contó que...';

  // Toma el material REAL que escribe el dueño (anécdota, decisión, caso o dato)
  // y lo mejora para publicar, sin inventar ni agregar hechos.
  const handleMejorarHistoria = async () => {
    if (!historia.trim() || mejorando) return;
    setMejorando(true);
    try {
      const b = currentBusiness || {};
      const tipoMaterial = esTecnicoOB2B
        ? 'un hecho real de su negocio (una decisión técnica, un criterio de experto, un error frecuente del cliente, un caso de uso, un aprendizaje o un dato)'
        : 'una historia o anécdota real de su negocio';
      const system = `Eres el redactor de Ideastik para "${b.nombre || 'este negocio'}" (sector ${b.sector || 'general'}). Recibes ${tipoMaterial} contado por el dueño y lo conviertes en una publicación lista para ${post.canal || 'Instagram'}.
REGLA CRÍTICA: NO inventes ni agregues hechos, nombres, fechas, cifras ni detalles que el dueño no haya dicho. No exageres ni adornes con datos falsos. Solo puedes reordenar, dar ritmo, mejorar la redacción y hacerla más clara y útil, respetando fielmente lo que dijo. Si algo no queda claro, déjalo general en vez de inventarlo.
${esTecnicoOB2B ? 'Tono: profesional, claro y con autoridad; prioriza la utilidad y el criterio sobre la emoción. Nada de anécdotas emotivas forzadas.' : 'Tono: cercano y humano.'}
Voz del dueño: integra su vocabulario (${b.palabras_propias || 'sin indicaciones'}) y nunca uses estas palabras prohibidas: ${b.palabras_prohibidas || 'ninguna'}. Prohibidos los adjetivos vacíos y el relleno.`;
      const userMsg = `Material real del dueño (respétalo, no inventes nada):
"""${historia.trim()}"""
Conviértelo en un post: empieza con un gancho fiel al material, desarróllalo en 2 a 4 frases con saltos de línea y cierra con una invitación a la acción suave. Máximo 3 hashtags. Devuelve SOLO el texto del post.`;
      const texto = await generarTexto(system, [{ role: 'user', content: userMsg }], 700);
      if (texto) {
        setCopy(texto);
        await db.updatePost(postId, { copy: texto, status: 'READY' });
        // Guardar el material real en el banco de memoria de la marca.
        try {
          const nueva = await db.createHistoria(currentBusiness.id, historia.trim(), 'editor', esTecnicoOB2B ? 'insight' : 'anecdota');
          setHistoriasBank(prev => [nueva, ...prev]);
          setHistoria('');
          setHistoriaGuardada(true);
          setTimeout(() => setHistoriaGuardada(false), 4000);
        } catch (e) { console.error('No se pudo guardar en el banco:', e); }
      }
    } catch (e) {
      console.error('Error mejorando historia:', e);
    } finally {
      setMejorando(false);
    }
  };

  // Redimensiona la foto en el navegador antes de enviarla (más rápido y barato:
  // menos tokens de visión). Devuelve { dataUrl, base64, mediaType }.
  const fileToResizedBase64 = (file, maxDim = 1024) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
        else if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ dataUrl, base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  // Sube una foto → la IA la "lee" y propone descripción + guion + copys, atados
  // al negocio y su voz. Reusa el estado `ideas` para mostrarlo con la UI actual.
  const handleImagenSeleccionada = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErrorImagen('Sube una imagen (foto de tu producto, lugar o servicio).'); return; }
    setAnalizandoImagen(true);
    setErrorImagen('');
    setDescripcionImagen('');
    try {
      const img = await fileToResizedBase64(file);
      setImagenPreview(img.dataUrl);
      const formato = post.formato || 'Reel';
      const system = buildSystemPrompt(bizConMemoria());
      const userText = `El dueño subió esta foto real de su negocio para convertirla en contenido (pilar "${post.pilar || 'general'}"${post.pilar_tipo ? `, tipo ${post.pilar_tipo}` : ''}, formato ${formato}, canal ${post.canal || 'Instagram'}).
1) DESCRIBE con precisión SOLO lo que se ve en la foto (producto/escena, colores, materiales, detalles vendibles). No inventes nada que no esté en la imagen ni datos del negocio que no te hayan dado.
2) GUION de producción para esta pieza basado en lo que muestra la foto.
3) Tres VARIANTES de copy con enfoques DISTINTOS (ej. describir el producto, contar la historia detrás, venta directa), fieles a la foto y a la voz de la marca; cada una con gancho + 2 a 4 frases + CTA suave + máximo 3 hashtags. Si hace falta un dato real que no está en la foto, deja un marcador entre corchetes en vez de inventarlo.
Responde SOLO con JSON válido y completo: {"descripcion":"string","guion":{"tipo":"${formato}","titulo":"string corto","pasos":["string","string"]},"variantes":[{"enfoque":"string corto","copy":"string"}]}`;
      const r = await generarJSONConImagen(system, userText, { base64: img.base64, mediaType: img.mediaType }, 1900);
      if (!r) { setErrorImagen('No pude leer bien la foto. Prueba con otra o inténtalo de nuevo.'); return; }
      const guion = r?.guion && typeof r.guion === 'object' ? r.guion : null;
      const variantes = Array.isArray(r?.variantes) ? r.variantes.filter(v => v && v.copy) : [];
      if (r?.descripcion) setDescripcionImagen(r.descripcion);
      if (guion || variantes.length) setIdeas({ guion, variantes });
    } catch (err) {
      console.error('Error analizando la imagen:', err);
      setErrorImagen('No pude procesar la foto. Inténtalo de nuevo.');
    } finally {
      setAnalizandoImagen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplySuggestion = async (newCopy) => {
    setCopy(newCopy);
    await db.updatePost(postId, { copy: newCopy, status: 'READY' });
  };

  // Inserta un llamado a la acción al final del copy. Usa el WhatsApp del negocio
  // si está configurado; si no, deja una plantilla para que el usuario lo complete.
  const handleInsertCTA = (tipo) => {
    const b = currentBusiness || {};
    const wpp = b.whatsapp || b.telefono;
    let cta = '';
    if (tipo === 'whatsapp') {
      cta = wpp
        ? `\n\n📲 Escríbeme por WhatsApp al ${wpp} y te ayudo a elegir lo ideal para ti.`
        : `\n\n📲 Escríbeme por WhatsApp [tu número aquí] y te ayudo a elegir lo ideal para ti.`;
    } else if (tipo === 'catalogo') {
      cta = b.link_catalogo
        ? `\n\n📖 Mira todo el catálogo aquí: ${b.link_catalogo}`
        : `\n\n📖 Pídeme el catálogo completo por mensaje directo.`;
    } else if (tipo === 'pedido') {
      cta = b.link_pago
        ? `\n\n🛒 Haz tu pedido aquí: ${b.link_pago}`
        : `\n\n🛒 Haz tu pedido hoy por mensaje directo. Cupos/unidades limitadas.`;
    } else if (tipo === 'perfil') {
      cta = b.link_web
        ? `\n\n👀 Mira más aquí: ${b.link_web}`
        : `\n\n👀 Mira más en mi perfil y guarda este post si te sirvió.`;
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
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={publicado ? 'success' : 'outline'}
            onClick={handleTogglePublicado}
            isLoading={marcando}
            title={publicado ? 'Marcado como publicado. Toca para deshacer.' : 'Márcalo cuando ya lo hayas subido a tus redes.'}
          >
            <SafeIcon name={publicado ? 'CheckCircle' : 'Circle'} className="w-4 h-4 mr-1.5" />
            {publicado ? 'Publicado' : 'Ya lo publiqué'}
          </Button>
          <Button size="sm" onClick={() => navigate(-1)}>Guardar y Salir</Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="p-6 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <SafeIcon name="Film" className="w-3 h-3" /> {post.formato || 'Publicación'} · {post.canal || 'Instagram'}
                </p>
                <h3 className="font-bold text-lg text-gray-900 leading-snug">{post.gancho}</h3>
              </div>
              {/* Explicación en lenguaje simple: esta pantalla no exige saber redes. */}
              <div className="rounded-2xl bg-primary/5 border border-primary/10 p-3.5 text-[12px] text-gray-600 leading-relaxed">
                Aquí convertimos esta idea en algo listo para publicar. Te doy un <b>guion</b> de qué grabar o mostrar y <b>tres versiones</b> del texto; elige la que más te suene y la ajustas a tu gusto. Sin complicarte.
              </div>
              <Button
                className="w-full"
                onClick={handleGenerateIdeas}
                isLoading={generatingIdeas}
              >
                <SafeIcon name="Zap" className="w-4 h-4 mr-2" />
                {ideas ? 'Dame otras ideas' : 'Dame ideas para este post'}
              </Button>
            </Card>

            {/* Foto → contenido: la IA lee la imagen real y propone contenido. */}
            <Card className="p-5 space-y-3 border-primary/15 bg-primary/[0.02]">
              <div>
                <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <SafeIcon name="Camera" className="w-3.5 h-3.5 text-primary" /> ¿Tienes una foto? Conviértela en contenido
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Sube una foto real de tu producto, tu local o tu servicio. La leo y te propongo cómo describirla, un guion y varias versiones del texto.
                </p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagenSeleccionada} />
              <Button size="sm" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} isLoading={analizandoImagen}>
                <SafeIcon name="Upload" className="w-3.5 h-3.5 mr-1.5" /> {analizandoImagen ? 'Leyendo tu foto…' : (imagenPreview ? 'Subir otra foto' : 'Subir una foto')}
              </Button>
              {errorImagen && <p className="text-[11px] text-red-500">{errorImagen}</p>}
              {descripcionImagen && (
                <div className="rounded-xl bg-white/70 border border-primary/10 p-3 text-[12px] text-gray-600 leading-relaxed">
                  <span className="font-bold text-gray-700">Lo que veo en tu foto: </span>{descripcionImagen}
                </div>
              )}
            </Card>

            {/* Guion de producción: qué grabar / qué láminas / ideas visuales. */}
            {ideas?.guion && Array.isArray(ideas.guion.pasos) && ideas.guion.pasos.length > 0 && (
              <Card className="p-5 space-y-3 border-primary/10">
                <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <SafeIcon name="Clipboard" className="w-3.5 h-3.5 text-primary" />
                  {ideas.guion.titulo || `Cómo armar tu ${post.formato || 'post'}`}
                </p>
                <ol className="space-y-2">
                  {ideas.guion.pasos.map((paso, i) => (
                    <li key={i} className="flex gap-2.5 text-[13px] text-gray-700 leading-snug">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <span>{typeof paso === 'string' ? paso : (paso?.texto || paso?.paso || '')}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            {/* Variantes de copy: elige una y se carga en el editor. */}
            {Array.isArray(ideas?.variantes) && ideas.variantes.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5 px-1">
                  <SafeIcon name="Layers" className="w-3.5 h-3.5 text-primary" /> Elige una versión (puedes editarla después)
                </p>
                {ideas.variantes.map((v, i) => {
                  const activa = copy && copy.trim() === (v.copy || '').trim();
                  return (
                    <Card key={i} className={cn("p-4 transition-all cursor-pointer hover:border-primary/40", activa ? "border-primary ring-1 ring-primary/30" : "border-white/60")} onClick={() => handleUsarVariante(v.copy)}>
                      <div className="flex items-center justify-between mb-2">
                        {v.enfoque && <Badge variant="primary" className="text-[10px] uppercase">{v.enfoque}</Badge>}
                        <span className={cn("text-[11px] font-bold flex items-center gap-1", activa ? "text-primary" : "text-gray-400")}>
                          {activa ? <><SafeIcon name="Check" className="w-3 h-3" /> En uso</> : 'Usar esta'}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-line line-clamp-6">{v.copy}</p>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Historia real → la IA la pule sin inventar. Combate los posts falsos. */}
            <Card className="p-4 space-y-2.5 border-success/20 bg-success/[0.03]">
              <div>
                <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <SafeIcon name={esTecnicoOB2B ? 'Award' : 'Heart'} className="w-3.5 h-3.5 text-success" />
                  {esTecnicoOB2B ? '¿Tienes algo real que contar? Cuéntamelo y lo pulo' : '¿Tienes una historia real? Cuéntala y la pulo'}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {esTecnicoOB2B
                    ? 'Una decisión, un criterio, un caso o un dato de tu negocio. Lo mejoro sin inventar: lo que no me cuentes, no lo agrego.'
                    : 'Escríbela como salga, con tus palabras. La mejoro sin inventar nada: lo que no me cuentes, no lo agrego.'}
                </p>
              </div>
              <Textarea
                value={historia}
                onChange={e => setHistoria(e.target.value)}
                className="min-h-[90px] text-sm bg-white"
                placeholder={historiaPlaceholder}
              />
              <Button size="sm" variant="success" className="w-full" onClick={handleMejorarHistoria} isLoading={mejorando} disabled={!historia.trim()}>
                <SafeIcon name="Feather" className="w-3.5 h-3.5 mr-1.5" /> Convertir en post
              </Button>
              {historiaGuardada && (
                <p className="text-[11px] text-success font-medium flex items-center gap-1">
                  <SafeIcon name="Check" className="w-3 h-3" /> Guardado en la memoria de tu marca. La IA lo usará en próximas ideas.
                </p>
              )}
              {historiasBank.length > 0 && !historiaGuardada && (
                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                  <SafeIcon name="Archive" className="w-3 h-3" /> Tu marca ya tiene {historiasBank.length} recuerdo(s) que la IA usa al generar.
                </p>
              )}
            </Card>

            <Card className="p-0 overflow-hidden border-primary/10 shadow-sm">
              <div className="px-4 pt-3 flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5"><SafeIcon name="Edit3" className="w-3 h-3" /> Tu texto final</span>
                <button onClick={handleGenerateContent} disabled={generating} className="text-[11px] text-primary hover:underline flex items-center gap-1 disabled:opacity-50">
                  <SafeIcon name="RefreshCw" className={cn("w-3 h-3", generating && "animate-spin")} /> Escribir otra versión
                </button>
              </div>
              <Textarea
                value={copy}
                onChange={e => setCopy(e.target.value)}
                className="border-0 focus-visible:ring-0 min-h-[280px] p-6 text-base leading-relaxed"
                placeholder="Elige una versión de arriba o escribe la tuya aquí..."
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
                <button onClick={() => handleInsertCTA('catalogo')} className="text-xs px-3 py-2 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors flex items-center gap-1.5">
                  <SafeIcon name="BookOpen" className="w-3.5 h-3.5" /> Catálogo
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

          <div className="space-y-4 lg:sticky lg:top-4">
            <Card className="aspect-[4/5] bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-200 relative group overflow-hidden">
              {(imagenPreview || post.image_url) ? (
                <img src={imagenPreview || post.image_url} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-8">
                  <SafeIcon name="Image" className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-400 font-medium tracking-tight">Así se verá tu publicación</p>
                  <p className="text-[11px] text-gray-400 mt-1">Sigue el guion de la izquierda para grabar o armar tu pieza.</p>
                </div>
              )}
            </Card>
            {/* Roadmap: generación de arte. Se muestra como aviso, no como botón falso. */}
            <div className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <SafeIcon name="Image" className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-gray-700">Generar el arte del post</p>
                <p className="text-[11px] text-gray-400">Muy pronto podrás crear la imagen aquí mismo.</p>
              </div>
              <Badge variant="primary" className="ml-auto text-[9px] uppercase shrink-0">Pronto</Badge>
            </div>
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
