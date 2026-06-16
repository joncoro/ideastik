import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button, Skeleton, Card } from '../components/ui/Components';
import SafeIcon from '../common/SafeIcon';
import { cn, getPilarBorder } from '../lib/utils';
import InspirationPanel from '../components/InspirationPanel';
import WizardAgent from '../components/WizardAgent';
import { motion } from 'framer-motion';

export default function CalendarHub() {
  const { currentBusiness } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInspirationOpen, setIsInspirationOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Estrategia normalizada: puede venir como {estrategia:{...}} o {...}
  const est = (() => {
    const e = currentBusiness?.estrategia;
    if (!e) return {};
    return (e.estrategia && typeof e.estrategia === 'object') ? e.estrategia : e;
  })();

  useEffect(() => {
    if (currentBusiness) loadPosts();
  }, [currentBusiness, currentDate]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const grid = await db.getGrid(currentBusiness.id, currentDate.getMonth() + 1, currentDate.getFullYear());
      if (grid) {
        const p = await db.getPostsByGrid(grid.id);
        setPosts(p || []);
      } else {
        setPosts([]);
      }
    } catch (e) {
      console.error(e);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePostInSlot = (day) => {
    setSelectedSlot(day);
    setIsInspirationOpen(true);
  };

  const handleIdeaSelected = async (idea) => {
    let grid = await db.getGrid(currentBusiness.id, currentDate.getMonth() + 1, currentDate.getFullYear());
    if (!grid) {
      grid = await db.createGrid(currentBusiness.id, currentDate.getMonth() + 1, currentDate.getFullYear());
    }
    const newPosts = await db.createPosts([{
      grid_id: grid.id,
      fecha: selectedSlot ? selectedSlot.toISOString() : new Date().toISOString(),
      pilar: idea.pilarName,
      pilar_tipo: idea.pilarTipo,
      formato: idea.formato,
      canal: est.canalPrincipal || 'Instagram',
      gancho: idea.gancho,
      hora: 'mediodia'
    }]);
    setIsInspirationOpen(false);
    navigate(`/n/${currentBusiness.id}/post/${newPosts[0].id}`);
  };

  // Color de fondo suave por tipo de pilar para las etiquetas
  const pilarChip = (tipo) => {
    const map = {
      autoridad: 'bg-[#6C3DF4]/10 text-[#6C3DF4]',
      conexion: 'bg-[#EC4899]/10 text-[#EC4899]',
      venta: 'bg-[#F59E0B]/10 text-[#B45309]',
      prueba_social: 'bg-[#10B981]/10 text-[#047857]',
      educacion: 'bg-[#3B82F6]/10 text-[#1D4ED8]',
    };
    return map[tipo] || 'bg-gray-100 text-gray-500';
  };

  // ---------- VISTA ESCRITORIO: cuadrícula mensual ----------
  const renderGrid = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dayPosts = posts.filter(p => isSameDay(new Date(p.fecha), cloneDay));
        days.push(
          <div key={day.toString()} className={cn("min-h-[120px] p-2 border-r border-b border-gray-100 relative group", !isSameMonth(day, monthStart) ? "bg-white/10 text-gray-300" : "bg-white/35")}>
            <div className="flex justify-between items-start mb-2">
              <span className={cn("text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full", isToday(day) ? "bg-primary text-white" : "text-gray-500")}>
                {format(day, 'd')}
              </span>
              <button onClick={() => handleCreatePostInSlot(cloneDay)} className="opacity-0 group-hover:opacity-100 p-1 text-primary hover:bg-primary/5 rounded-lg transition-all">
                <SafeIcon name="PlusCircle" className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {dayPosts.map(post => (
                <motion.div layoutId={post.id} key={post.id} onClick={() => navigate(`/n/${currentBusiness.id}/post/${post.id}`)} className={cn("text-[10px] p-2 rounded-lg cursor-pointer border-l-4 shadow-sm bg-white hover:scale-[1.02] transition-transform", getPilarBorder(post.pilar_tipo))}>
                  <p className="font-medium text-gray-800 line-clamp-2 leading-tight">{post.gancho}</p>
                  <div className="flex flex-wrap items-center gap-1 mt-1 text-[9px] text-gray-400">
                    {post.formato && <span>{post.formato}</span>}
                    {post.canal && <span>· {post.canal}</span>}
                    {post.hora && <span>· {post.hora}</span>}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div key={day.toString()} className="grid grid-cols-7">{days}</div>);
      days = [];
    }
    return rows;
  };

  // ---------- VISTA MÓVIL: lista vertical agrupada por día ----------
  const renderList = () => {
    // Solo días que tienen posts, ordenados por fecha
    const byDay = {};
    posts.forEach(p => {
      const key = format(new Date(p.fecha), 'yyyy-MM-dd');
      (byDay[key] = byDay[key] || []).push(p);
    });
    const dias = Object.keys(byDay).sort();

    return (
      <div className="space-y-4">
        {dias.map(key => {
          const fecha = new Date(key + 'T12:00:00');
          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className={cn("text-sm font-bold capitalize", isToday(fecha) ? "text-primary" : "text-gray-700")}>
                  {format(fecha, "EEEE d", { locale: es })}
                </span>
                <span className="text-xs text-gray-400 capitalize">{format(fecha, "MMMM", { locale: es })}</span>
                {isToday(fecha) && <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-bold">HOY</span>}
              </div>
              <div className="space-y-2">
                {byDay[key].map(post => (
                  <div key={post.id} onClick={() => navigate(`/n/${currentBusiness.id}/post/${post.id}`)}
                    className={cn("p-3 rounded-xl cursor-pointer border-l-4 bg-white shadow-sm active:scale-[0.99] transition-transform", getPilarBorder(post.pilar_tipo))}>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", pilarChip(post.pilar_tipo))}>{post.pilar}</span>
                      {post.formato && <span className="text-[10px] text-gray-400">· {post.formato}</span>}
                      {post.canal && <span className="text-[10px] text-gray-400">· {post.canal}</span>}
                      {post.hora && <span className="text-[10px] text-gray-400">· {post.hora}</span>}
                    </div>
                    <p className="text-sm font-medium text-gray-800 leading-snug">{post.gancho}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const EmptyState = () => (
    <Card className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white border-dashed border-2 border-gray-200">
      <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-6">
        <SafeIcon name="Calendar" className="w-10 h-10 opacity-50" />
      </div>
      <h3 className="text-xl font-heading font-bold text-gray-900 mb-2">Aún no tienes tu parrilla del mes</h3>
      <p className="text-gray-500 max-w-sm mb-8">Trabajemos juntos para diseñar una estrategia de contenidos que conecte con tu audiencia y venda más.</p>
      <Button size="lg" onClick={() => navigate(`/n/${currentBusiness.id}/estrategia`)} className="px-8 shadow-xl shadow-primary/20">
        <SafeIcon name="Zap" className="w-4 h-4 mr-2" /> Comenzar Estrategia
      </Button>
    </Card>
  );

  return (
    // pb-32 en móvil deja aire para la barra inferior y el botón de chat
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen pb-32 lg:pb-12">
      {currentBusiness?.propuesta_valor && (
        <Card className="p-4 md:p-5 mb-6 bg-gradient-to-r from-primary/5 to-success/5 border-primary/10">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><SafeIcon name="Compass" className="w-5 h-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-0.5">Tu propuesta de valor</p>
              <p className="text-sm text-gray-800 font-medium leading-snug">{currentBusiness.propuesta_valor}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {est.canalPrincipal && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-gray-600 border border-gray-200 flex items-center gap-1"><SafeIcon name="Send" className="w-3 h-3" /> {est.canalPrincipal}</span>}
                {est.frecuencia && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-gray-600 border border-gray-200 flex items-center gap-1"><SafeIcon name="Repeat" className="w-3 h-3" /> {est.frecuencia}</span>}
                <button onClick={() => navigate(`/n/${currentBusiness.id}/ajustes`)} className="text-[10px] px-2 py-0.5 rounded-full bg-white text-primary border border-primary/20 flex items-center gap-1 hover:bg-primary/5"><SafeIcon name="Edit2" className="w-3 h-3" /> Editar estrategia</button>
              </div>
            </div>
          </div>
        </Card>
      )}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-heading font-bold capitalize">{format(currentDate, 'MMMM yyyy', { locale: es })}</h2>
        <Button variant="outline" size="sm" onClick={() => setIsInspirationOpen(true)} disabled={posts.length === 0}>
          <SafeIcon name="Sparkles" className="w-4 h-4 mr-2" /> Ideas IA
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-[600px] w-full" />
      ) : posts.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Móvil: lista */}
          <div className="lg:hidden">{renderList()}</div>
          {/* Escritorio: cuadrícula */}
          <div className="hidden lg:block bg-white/55 backdrop-blur-xl border border-white/50 rounded-3xl overflow-hidden shadow-[0_8px_32px_-10px_rgba(31,31,31,0.12)]">
            <div className="grid grid-cols-7 bg-white/30 border-b border-white/40">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                <div key={d} className="py-3 text-center text-[10px] font-bold text-gray-400 uppercase">{d}</div>
              ))}
            </div>
            {renderGrid()}
          </div>
        </>
      )}

      <InspirationPanel isOpen={isInspirationOpen} onClose={() => setIsInspirationOpen(false)} onIdeaSelected={handleIdeaSelected} />
      <WizardAgent context="calendar" />
    </div>
  );
}
