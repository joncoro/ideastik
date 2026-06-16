import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import supabase from '../supabase/supabase';
import { Button, Card, Badge, Input, Label } from '../components/ui/Components';
import SafeIcon from '../common/SafeIcon';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { iniciarSuscripcion, comprarCreditos, cancelarSuscripcion, CREDIT_PACKS, PLAN_MENSUAL_PRECIO, formatearPrecio } from '../lib/pagos';

export default function Account() {
  const { user, profile, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado de pagos
  const [payLoading, setPayLoading] = useState(null); // null | 'plan' | 'cancel' | packId
  const [payError, setPayError] = useState('');
  const [banner, setBanner] = useState(null); // { tipo, texto }

  const esMensual = profile?.plan === 'MENSUAL';

  // Al volver de Mercado Pago (?pago=...), mostramos feedback y refrescamos el perfil.
  useEffect(() => {
    const pago = searchParams.get('pago');
    if (!pago) return;

    const mensajes = {
      success: { tipo: 'success', texto: '¡Pago aprobado! Acreditamos tu compra. Si no ves el cambio al instante, recarga en unos segundos.' },
      suscripcion: { tipo: 'success', texto: 'Suscripción en proceso. Tu plan se activará en cuanto Mercado Pago confirme el pago.' },
      pending: { tipo: 'pending', texto: 'Tu pago quedó pendiente de aprobación. Te avisaremos cuando se confirme.' },
      failure: { tipo: 'error', texto: 'El pago no se completó. No se realizó ningún cargo.' },
    };
    setBanner(mensajes[pago] ?? null);

    // Refrescamos varias veces por si el webhook tarda en impactar.
    refreshProfile?.();
    const t1 = setTimeout(() => refreshProfile?.(), 3000);
    const t2 = setTimeout(() => refreshProfile?.(), 8000);

    // Limpiamos el query param de la URL.
    searchParams.delete('pago');
    setSearchParams(searchParams, { replace: true });

    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSuscribir = async () => {
    setPayError('');
    setPayLoading('plan');
    try {
      await iniciarSuscripcion(); // redirige a Mercado Pago
    } catch (err) {
      setPayError(err.message || 'No se pudo iniciar la suscripción.');
      setPayLoading(null);
    }
  };

  const handleComprar = async (packId) => {
    setPayError('');
    setPayLoading(packId);
    try {
      await comprarCreditos(packId); // redirige a Mercado Pago
    } catch (err) {
      setPayError(err.message || 'No se pudo iniciar el pago.');
      setPayLoading(null);
    }
  };

  const handleCancelar = async () => {
    setPayError('');
    setPayLoading('cancel');
    try {
      await cancelarSuscripcion();
      await refreshProfile?.();
      setBanner({ tipo: 'pending', texto: 'Tu suscripción fue cancelada. Mantienes el acceso hasta el fin del período.' });
    } catch (err) {
      setPayError(err.message || 'No se pudo cancelar la suscripción.');
    } finally {
      setPayLoading(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'ELIMINAR') return;
    
    setIsDeleting(true);
    try {
      // 1. Eliminamos el perfil. 
      // El trigger 'on_profile_deleted' en la DB se encargará de borrar al usuario de auth.users
      // y la integridad referencial (ON DELETE CASCADE) borrará negocios, posts y mensajes.
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      // 2. Limpieza local y redirección
      await logout();
      navigate('/');
    } catch (err) {
      console.error("Error al eliminar cuenta:", err);
      alert("No se pudo eliminar la cuenta. Por favor, intenta de nuevo.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-heading font-bold mb-1">Tu Cuenta</h2>
        <p className="text-gray-500 text-sm">Administra tu identidad y preferencias de acceso.</p>
      </header>

      {/* Banner de retorno del pago */}
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={
              'flex items-start gap-3 rounded-2xl p-4 text-sm border ' +
              (banner.tipo === 'success' ? 'bg-success/5 border-success/20 text-success' :
               banner.tipo === 'error' ? 'bg-red-50 border-red-200 text-red-600' :
               'bg-alert/5 border-alert/20 text-alert')
            }
          >
            <SafeIcon name={banner.tipo === 'success' ? 'CheckCircle' : banner.tipo === 'error' ? 'XCircle' : 'Clock'} className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{banner.texto}</p>
            <button onClick={() => setBanner(null)} className="ml-auto opacity-60 hover:opacity-100">
              <SafeIcon name="X" className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {payError && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm p-3">
          <SafeIcon name="AlertTriangle" className="w-4 h-4 shrink-0" /> {payError}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Perfil */}
        <Card className="p-6 flex flex-col justify-between">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xl font-bold uppercase border-2 border-primary/20">
              {profile?.name?.charAt(0) || user?.email?.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-lg text-gray-900">{profile?.name || 'Usuario Ideastik'}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full flex items-center gap-2" onClick={handleLogout}>
            <SafeIcon name="LogOut" className="w-4 h-4" /> Cerrar Sesión
          </Button>
        </Card>

        {/* Plan y Créditos */}
        <Card className="p-6 bg-gradient-to-br from-primary/[0.02] to-primary/[0.05] border-primary/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Plan Actual</p>
              <h3 className="text-2xl font-heading font-bold text-primary">{profile?.plan || 'FREE'}</h3>
            </div>
            <Badge variant={profile?.plan === 'MENSUAL' ? 'success' : 'primary'}>
              {profile?.plan === 'MENSUAL' ? 'Activo' : 'Básico'}
            </Badge>
          </div>
          {!esMensual ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-700">
                <SafeIcon name="Zap" className="w-4 h-4 text-alert" />
                <span className="text-sm font-medium">{profile?.credits || 0} publicaciones restantes</span>
              </div>
              <Button
                className="w-full shadow-lg shadow-primary/20"
                isLoading={payLoading === 'plan'}
                onClick={handleSuscribir}
              >
                Mejorar a Mensual · {formatearPrecio(PLAN_MENSUAL_PRECIO)}/mes
              </Button>
              <p className="text-[11px] text-gray-400 text-center">Acceso ilimitado. Cancela cuando quieras.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed italic">Tienes acceso ilimitado a todas las funciones de estrategia y calendario.</p>
              <Button
                variant="ghost"
                className="w-full text-gray-500 hover:text-red-600"
                isLoading={payLoading === 'cancel'}
                onClick={handleCancelar}
              >
                Cancelar suscripción
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Compra de créditos (pago único) */}
      {!esMensual && (
        <section className="space-y-4">
          <div>
            <h3 className="font-heading font-bold text-xl text-gray-900">Comprar publicaciones</h3>
            <p className="text-gray-500 text-sm">¿No quieres un plan mensual? Carga créditos sueltos con un pago único.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {CREDIT_PACKS.map((pack) => (
              <Card
                key={pack.id}
                className={'p-5 flex flex-col gap-4 relative ' + (pack.destacado ? 'border-primary/40 ring-1 ring-primary/20' : '')}
              >
                {pack.destacado && (
                  <Badge variant="primary" className="absolute -top-2 right-4">Más elegido</Badge>
                )}
                <div>
                  <p className="text-3xl font-heading font-bold text-gray-900">{pack.credits}</p>
                  <p className="text-xs text-gray-500">{pack.label}</p>
                </div>
                <div className="mt-auto">
                  <p className="text-lg font-bold text-primary mb-3">{formatearPrecio(pack.price)}</p>
                  <Button
                    variant={pack.destacado ? 'primary' : 'outline'}
                    className="w-full"
                    isLoading={payLoading === pack.id}
                    onClick={() => handleComprar(pack.id)}
                  >
                    Comprar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <SafeIcon name="Lock" className="w-3 h-3" /> Pago seguro procesado por Mercado Pago.
          </p>
        </section>
      )}

      {/* Gestión Crítica */}
      <section className="pt-8 border-t border-gray-100">
        <h3 className="font-heading font-bold text-xl mb-4 text-gray-900">Seguridad y Privacidad</h3>
        <Card className="p-6 border-red-100 bg-red-50/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-md">
              <h4 className="font-bold text-gray-900 mb-1">Zona de Peligro</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Al eliminar tu cuenta, se borrarán permanentemente todos tus negocios, estrategias, calendarios de contenido e historial de mensajes. Esta acción no se puede deshacer.
              </p>
            </div>
            <Button 
              variant="danger" 
              className="shrink-0"
              onClick={() => setShowDeleteModal(true)}
            >
              <SafeIcon name="Trash2" className="w-4 h-4 mr-2" /> Eliminar mi cuenta
            </Button>
          </div>
        </Card>
      </section>

      {/* Modal de Confirmación */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setShowDeleteModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white/80 backdrop-blur-2xl border border-white/70 rounded-3xl p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <SafeIcon name="AlertTriangle" className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-heading font-bold text-center text-gray-900 mb-2">¿Estás absolutamente seguro?</h3>
              <p className="text-sm text-gray-500 text-center mb-8 leading-relaxed">
                Esto borrará todos tus datos. Para confirmar, escribe <b>ELIMINAR</b> en el campo de abajo.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Input 
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Escribe ELIMINAR"
                    className="text-center font-bold tracking-widest border-red-200 focus:ring-red-500"
                    disabled={isDeleting}
                  />
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="danger" 
                    className="flex-1"
                    disabled={confirmText !== 'ELIMINAR' || isDeleting}
                    isLoading={isDeleting}
                    onClick={handleDeleteAccount}
                  >
                    Confirmar Borrado
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}