import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/mockDb';
import { Button, Card, Badge } from '../components/ui/Components';
import SafeIcon from '../common/SafeIcon';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, getPilarColor, getPilarText } from '../lib/utils';

export default function Report() {
  const { bizId, mes } = useParams();
  const { currentBusiness } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentBusiness) {
      loadStats();
    }
  }, [currentBusiness, mes]);

  const loadStats = async () => {
    setLoading(true);
    const monthInt = parseInt(mes) || new Date().getMonth() + 1;
    const yearInt = new Date().getFullYear();
    
    const grid = await db.getGrid(bizId, monthInt, yearInt);
    if (grid) {
      const posts = await db.getPostsByGrid(grid.id);
      
      const planeadas = posts.length;
      const publicadas = posts.filter(p => p.status === 'PUBLISHED').length;
      
      const balance = {};
      posts.forEach(p => {
        balance[p.pilarTipo] = (balance[p.pilarTipo] || 0) + 1;
      });

      setStats({
        planeadas,
        publicadas,
        balance,
        porcentaje: planeadas > 0 ? Math.round((publicadas / planeadas) * 100) : 0,
        mesNombre: format(new Date(yearInt, monthInt - 1), 'MMMM', { locale: es })
      });
    }
    setLoading(false);
  };

  if (loading) return <div className="p-8"><div className="animate-pulse h-64 bg-white/50 rounded-3xl" /></div>;
  if (!stats) return <div className="p-8 text-center text-gray-500">No hay datos para este periodo.</div>;

  const pilaresOrden = ['autoridad', 'conexion', 'venta', 'prueba_social', 'educacion'];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-heading font-bold capitalize">Reporte de {stats.mesNombre}</h2>
          <p className="text-gray-500">Análisis de consistencia y balance de contenido.</p>
        </div>
        <Button variant="outline" onClick={() => alert('Generando imagen del reporte...')}>
          <SafeIcon name="Share" className="w-4 h-4 mr-2" />
          Compartir
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 text-center">
          <p className="text-sm text-gray-500 font-medium uppercase mb-2">Publicadas</p>
          <p className="text-4xl font-heading font-bold text-primary">{stats.publicadas} / {stats.planeadas}</p>
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${stats.porcentaje}%` }} />
          </div>
        </Card>

        <Card className="p-6 md:col-span-2 bg-success/5 border-success/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center text-success shrink-0">
              <SafeIcon name="Trophy" className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg mb-1">¡Buen trabajo!</h3>
              <p className="text-gray-700 leading-relaxed">
                Has publicado el {stats.porcentaje}% de lo planeado. {stats.porcentaje > 70 
                  ? "Eso ya es más consistencia que la mayoría de negocios en redes." 
                  : "Vas por buen camino, recuerda que la constancia le gana a la intensidad."}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <section>
        <h3 className="font-heading font-bold text-xl mb-4">Balance de Pilares</h3>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            {pilaresOrden.map(tipo => {
              const count = stats.balance[tipo] || 0;
              const perc = stats.planeadas > 0 ? Math.round((count / stats.planeadas) * 100) : 0;
              return (
                <div key={tipo} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className={cn("font-semibold capitalize", getPilarText(tipo))}>
                      {tipo.replace('_', ' ')}
                    </span>
                    <span className="text-gray-500">{perc}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={cn("h-full transition-all duration-1000", getPilarColor(tipo))} style={{ width: `${perc}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <Card className="p-6 bg-white/40 border-white/50">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <SafeIcon name="Lightbulb" className="w-4 h-4 text-alert" />
              Tip del Agente
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              Tu balance está {stats.balance.venta / stats.planeadas > 0.4 ? 'muy enfocado en vender. Intenta subir los pilares de Conexión o Educación para que la gente no se canse de ver solo ofertas.' : 'bastante equilibrado. Esto ayuda a que el algoritmo te muestre a gente nueva mientras mantienes a tus clientes actuales interesados.'}
            </p>
          </Card>
        </div>
      </section>

      <div className="pt-8 border-t border-gray-100 flex justify-center">
        <Button size="lg" className="px-10" onClick={() => navigate(`/n/${bizId}/wizard/1`)}>
          Crear mi parrilla de {format(addDays(new Date(), 30), 'MMMM', { locale: es })}
          <SafeIcon name="ArrowRight" className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}