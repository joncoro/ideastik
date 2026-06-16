import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Components';
import SafeIcon from '../common/SafeIcon';
import { PLAN_MENSUAL_PRECIO, formatearPrecio } from '../lib/pagos';

const fadeUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

export default function Landing() {
  const navigate = useNavigate();
  const goLogin = () => navigate('/login');
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const pasos = [
    { icon: 'MessageCircle', color: 'from-primary to-[#8B5CF6]', n: '01', t: 'Responde', d: 'Preguntas sencillas sobre tu negocio, tu cliente ideal y lo que te hace diferente.' },
    { icon: 'Layout', color: 'from-[#EC4899] to-[#F59E0B]', n: '02', t: 'Revisa', d: 'Recibes tu propuesta de valor, tus pilares y el calendario lleno de ideas que conectan y venden.' },
    { icon: 'PenTool', color: 'from-success to-[#37C77E]', n: '03', t: 'Publica', d: 'Cada post con copy, hashtags y llamado a la acción para cerrar la venta. Copiar, pegar y listo.' },
  ];

  const beneficios = [
    {
      icon: 'Target', tag: 'Estrategia',
      t: 'Estrategia con criterio de marketer',
      d: 'Como tener un estratega de marketing de tu lado: propuesta de valor real, pilares con personalidad y un plan pensado para vender, no para rellenar.',
      checks: ['Propuesta de valor en 3 ángulos', 'Pilares conectados a tu diferencial', 'Tono a la medida de tu cliente'],
    },
    {
      icon: 'Calendar', tag: 'Tu tiempo',
      t: 'Un calendario que se llena solo',
      d: 'Olvídate de la página en blanco y de las horas perdidas. Recibes el mes completo con formato, canal y horario para cada publicación.',
      checks: ['Mes entero en minutos', 'Formato, canal y hora por post', 'Ideas frescas cuando te falten'],
    },
    {
      icon: 'Edit2', tag: 'Edición',
      t: 'Todo editable, siempre tuyo',
      d: 'Ajusta tu propuesta de valor, narrativa, pilares y estrategia cuando quieras. Se propone una versión y tú tienes la última palabra.',
      checks: ['Edita pilares y estrategia', 'Regenera el copy con un clic', 'CTA de WhatsApp automático'],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* NAVBAR */}
      <header className="sticky top-0 z-30 px-4 pt-4">
        <nav className="max-w-6xl mx-auto glass rounded-2xl px-5 py-3 flex items-center justify-between">
          <h1 className="text-xl font-heading font-bold text-primary tracking-tighter">ideastik<span className="text-success">.</span></h1>
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <button onClick={() => scrollTo('como')} className="hover:text-gray-900 transition-colors">Cómo funciona</button>
            <button onClick={() => scrollTo('beneficios')} className="hover:text-gray-900 transition-colors">Beneficios</button>
            <button onClick={() => scrollTo('precios')} className="hover:text-gray-900 transition-colors">Precios</button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goLogin}>Entrar</Button>
            <Button size="sm" onClick={goLogin}>Empieza gratis</Button>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="max-w-6xl mx-auto w-full px-6 pt-16 pb-24 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <SafeIcon name="Zap" className="w-4 h-4" /> Para vender más sin vivir en redes
          </div>
          <h2 className="text-5xl md:text-6xl font-heading font-bold leading-[1.04] tracking-tight text-foreground mb-6">
            Tu mes de contenido,{' '}
            <span className="bg-gradient-to-r from-primary via-[#8B5CF6] to-[#EC4899] bg-clip-text text-transparent">listo para vender.</span>
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl">
            Para emprendedores que no tienen tiempo de pelear con las redes. Cuéntanos qué vendes y te entregamos la estrategia y el calendario del mes, listos para publicar y vender.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" className="text-base px-8" onClick={goLogin}>
              Crea tu primer mes gratis <SafeIcon name="ArrowRight" className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" size="lg" className="text-base px-6" onClick={() => scrollTo('como')}>
              Ver cómo funciona
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4 flex items-center gap-1.5">
            <SafeIcon name="Check" className="w-4 h-4 text-success" /> 1 publicación completa de regalo. Sin tarjeta.
          </p>
        </motion.div>

        {/* MOCKUP GLASS DEL PRODUCTO */}
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-8 bg-gradient-to-tr from-primary/30 via-[#EC4899]/20 to-[#3B82F6]/20 blur-3xl rounded-full opacity-80" />
          <div className="relative glass-strong rounded-3xl p-5 animate-floaty">
            <div className="flex items-center gap-3 pb-4 border-b border-white/40">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-[#8B5CF6] flex items-center justify-center text-white"><SafeIcon name="Zap" className="w-4 h-4" /></div>
              <div>
                <p className="font-heading font-bold text-sm leading-none text-gray-900">Estratega Ideastik</p>
                <span className="text-[11px] text-success font-medium">● En línea</span>
              </div>
            </div>
            <div className="space-y-3 py-4">
              <div className="max-w-[80%] bg-white/70 border border-white/60 rounded-2xl rounded-tl-md p-3 text-[13px] text-gray-700 shadow-sm">¿Qué hace tu negocio y qué te hace diferente?</div>
              <div className="max-w-[70%] ml-auto bg-gradient-to-br from-primary to-[#8B5CF6] text-white rounded-2xl rounded-br-md p-3 text-[13px] shadow-md">Café de especialidad, tostado por nosotros.</div>
              <div className="max-w-[85%] bg-white/70 border border-white/60 rounded-2xl rounded-tl-md p-3 text-[13px] text-gray-700 shadow-sm">Listo. Armé tu propuesta de valor, 5 pilares y el calendario del mes.</div>
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-white/40">
              <div className="flex-1 h-9 rounded-full bg-white/60 border border-white/60" />
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-[#8B5CF6] flex items-center justify-center text-white shrink-0"><SafeIcon name="ArrowRight" className="w-4 h-4" /></div>
            </div>
          </div>

          <div className="hidden md:block absolute -top-6 -right-5 glass rounded-2xl p-3 w-44 animate-floaty" style={{ animationDelay: '1.5s' }}>
            <p className="text-[9px] font-bold text-primary uppercase tracking-wide mb-1.5 flex items-center gap-1"><SafeIcon name="Send" className="w-3 h-3" /> Tu estrategia</p>
            <div className="flex items-center justify-between text-[11px] text-gray-700"><span>Canal</span><span className="font-bold">Instagram</span></div>
            <div className="flex items-center justify-between text-[11px] text-gray-700 mt-1"><span>Frecuencia</span><span className="font-bold">4 / sem</span></div>
          </div>

          <div className="hidden md:block absolute -bottom-7 -left-6 glass rounded-2xl p-3 animate-floaty" style={{ animationDelay: '0.8s' }}>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1"><SafeIcon name="Calendar" className="w-3 h-3" /> Tu mes</p>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 21 }).map((_, i) => {
                const colors = ['bg-primary', 'bg-[#EC4899]', 'bg-[#F59E0B]', 'bg-success', 'bg-[#3B82F6]'];
                const filled = [2, 4, 7, 9, 12, 14, 16, 19].includes(i);
                return <div key={i} className={'w-3 h-3 rounded-sm ' + (filled ? colors[i % colors.length] : 'bg-gray-200/60')} />;
              })}
            </div>
          </div>
        </motion.div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como" className="max-w-6xl mx-auto w-full px-6 py-20">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-sm font-bold text-primary uppercase tracking-widest mb-3">Cómo funciona</p>
          <h3 className="text-3xl md:text-4xl font-heading font-bold tracking-tight">De cero tiempo a un mes que vende, en 3 pasos</h3>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6">
          {pasos.map((p, i) => (
            <motion.div key={p.t} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.12 }} className="glass rounded-3xl p-7">
              <div className={'w-14 h-14 rounded-2xl bg-gradient-to-br ' + p.color + ' flex items-center justify-center text-white shadow-lg mb-5'}>
                <SafeIcon name={p.icon} className="w-7 h-7" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-xs font-bold text-gray-400">{p.n}</span>
                <h4 className="font-heading font-bold text-xl">{p.t}</h4>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{p.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* BENEFICIOS */}
      <section id="beneficios" className="max-w-6xl mx-auto w-full px-6 py-20 space-y-16">
        {beneficios.map((b, i) => (
          <motion.div key={b.t} {...fadeUp} className={'grid lg:grid-cols-2 gap-10 items-center ' + ''}>
            <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
              <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-xs font-bold text-primary mb-4">
                <SafeIcon name={b.icon} className="w-3.5 h-3.5" /> {b.tag}
              </div>
              <h3 className="text-3xl font-heading font-bold tracking-tight mb-4">{b.t}</h3>
              <p className="text-gray-600 leading-relaxed mb-6">{b.d}</p>
              <ul className="space-y-2.5">
                {b.checks.map(c => (
                  <li key={c} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0"><SafeIcon name="Check" className="w-3 h-3" /></span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
              <div className="glass-strong rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-primary/20 to-[#EC4899]/10 blur-2xl" />
                <div className="relative space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[#8B5CF6] flex items-center justify-center text-white"><SafeIcon name={b.icon} className="w-5 h-5" /></div>
                    <div className="h-2.5 w-32 rounded-full bg-white/70" />
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/50" />
                  <div className="h-2 w-4/5 rounded-full bg-white/50" />
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {[0, 1, 2].map(k => <div key={k} className="h-14 rounded-2xl bg-white/40 border border-white/50" />)}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* PRECIOS */}
      <section id="precios" className="max-w-5xl mx-auto w-full px-6 py-20">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-sm font-bold text-primary uppercase tracking-widest mb-3">Precios</p>
          <h3 className="text-3xl md:text-4xl font-heading font-bold tracking-tight">Empieza gratis. Crece cuando quieras.</h3>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <motion.div {...fadeUp} className="glass rounded-3xl p-8 flex flex-col">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Free</p>
            <p className="text-4xl font-heading font-bold mb-1">Gratis</p>
            <p className="text-sm text-gray-500 mb-6">Para probar la magia.</p>
            <ul className="space-y-2.5 mb-8 flex-1">
              {['1 publicación completa', 'Estrategia y pilares', 'Calendario del mes'].map(c => (
                <li key={c} className="flex items-center gap-2.5 text-sm text-gray-700"><SafeIcon name="Check" className="w-4 h-4 text-success shrink-0" /> {c}</li>
              ))}
            </ul>
            <Button variant="outline" className="w-full" onClick={goLogin}>Empezar gratis</Button>
          </motion.div>

          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="glass-strong rounded-3xl p-8 flex flex-col relative ring-2 ring-primary/30">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-[#8B5CF6] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg">Recomendado</div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Mensual</p>
            <p className="text-4xl font-heading font-bold mb-1">{formatearPrecio(PLAN_MENSUAL_PRECIO)}<span className="text-base font-medium text-gray-400">/mes</span></p>
            <p className="text-sm text-gray-500 mb-6">Acceso ilimitado. Cancela cuando quieras.</p>
            <ul className="space-y-2.5 mb-8 flex-1">
              {['Publicaciones ilimitadas', 'Ideas frescas sin límite', 'Edita estrategia y pilares', 'CTA de WhatsApp automático'].map(c => (
                <li key={c} className="flex items-center gap-2.5 text-sm text-gray-700"><SafeIcon name="Check" className="w-4 h-4 text-success shrink-0" /> {c}</li>
              ))}
            </ul>
            <Button className="w-full" onClick={goLogin}>Empezar ahora</Button>
          </motion.div>
        </div>
        <p className="text-center text-[12px] text-gray-400 mt-6 flex items-center justify-center gap-1.5">
          <SafeIcon name="Lock" className="w-3 h-3" /> Pagos seguros con Mercado Pago.
        </p>
      </section>

      {/* CTA DE CIERRE */}
      <section className="max-w-6xl mx-auto w-full px-6 py-16">
        <motion.div {...fadeUp} className="relative overflow-hidden rounded-[2rem] p-10 md:p-16 text-center bg-gradient-to-br from-primary via-[#7C3AED] to-[#8B5CF6] shadow-2xl shadow-primary/30">
          <div className="absolute -top-16 -right-10 w-72 h-72 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-[#2BA664]/30 blur-3xl" />
          <div className="relative">
            <h3 className="text-3xl md:text-5xl font-heading font-bold text-white leading-tight mb-4">Deja de perder tiempo pensando qué publicar.</h3>
            <p className="text-white/80 max-w-xl mx-auto mb-8">En minutos tienes tu estrategia, tus pilares y el calendario del mes, listos para vender. Gratis para empezar.</p>
            <Button size="lg" variant="secondary" className="text-base px-9 bg-white text-primary hover:bg-white/90 border-0" onClick={goLogin}>
              Crea tu primer mes gratis <SafeIcon name="ArrowRight" className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-6xl mx-auto w-full px-6 py-10 border-t border-white/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-lg font-heading font-bold text-primary tracking-tighter">ideastik<span className="text-success">.</span></h1>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <button onClick={() => scrollTo('como')} className="hover:text-gray-900 transition-colors">Cómo funciona</button>
          <button onClick={() => scrollTo('precios')} className="hover:text-gray-900 transition-colors">Precios</button>
          <button onClick={goLogin} className="hover:text-gray-900 transition-colors">Entrar</button>
        </div>
        <p className="text-xs text-gray-400">© 2026 Ideastik</p>
      </footer>
    </div>
  );
}
