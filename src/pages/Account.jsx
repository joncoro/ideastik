import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import supabase from '../supabase/supabase';
import { Button, Card, Badge, Input, Label } from '../components/ui/Components';
import SafeIcon from '../common/SafeIcon';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function Account() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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
          {profile?.plan !== 'MENSUAL' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-700">
                <SafeIcon name="Zap" className="w-4 h-4 text-alert" />
                <span className="text-sm font-medium">{profile?.credits || 0} publicaciones restantes</span>
              </div>
              <Button className="w-full shadow-lg shadow-primary/20">Mejorar Plan</Button>
            </div>
          ) : (
            <p className="text-xs text-gray-600 leading-relaxed italic">Tienes acceso ilimitado a todas las funciones de estrategia y calendario.</p>
          )}
        </Card>
      </div>

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
              className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl"
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