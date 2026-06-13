import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import supabase from '../supabase/supabase';
import { useAuth } from '../context/AuthContext';
import { Card, Badge } from './ui/Components';
import SafeIcon from '../common/SafeIcon';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // Suscripción en tiempo real usando el nombre estable de la tabla
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            setNotifications(prev => [payload.new, ...prev]);
            setUnreadCount(c => c + 1);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const { data } = await supabase
        .from('notifications') // Nombre estable
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
        
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read).length);
    } catch (err) {
      console.error("Error cargando notificaciones:", err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await supabase
        .from('notifications') // Nombre estable
        .update({ read: true })
        .eq('id', id);
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (err) {
      console.error("Error al marcar como leída:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error al marcar todas como leídas:", err);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 text-gray-400 hover:text-primary transition-colors rounded-full hover:bg-gray-100"
      >
        <SafeIcon name="Bell" className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-alert text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl z-20 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-heading font-bold text-sm">Notificaciones</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] text-primary font-bold uppercase hover:underline"
                  >
                    Marcar todas
                  </button>
                )}
              </div>

              <div className="max-h-[350px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <SafeIcon name="BellOff" className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-xs text-gray-400">No tienes notificaciones aún</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.post_id) navigate(`/n/${n.business_id}/post/${n.post_id}`);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors relative",
                        !n.read && "bg-primary/[0.02]"
                      )}
                    >
                      {!n.read && <div className="absolute left-1.5 top-5 w-1.5 h-1.5 bg-primary rounded-full" />}
                      <div className="flex gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          n.type === 'REMINDER' ? "bg-alert/10 text-alert" : "bg-primary/10 text-primary"
                        )}>
                          <SafeIcon name={n.type === 'REMINDER' ? 'Clock' : 'Info'} className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs leading-tight mb-1", !n.read ? "font-bold text-gray-900" : "text-gray-600")}>{n.title}</p>
                          <p className="text-[11px] text-gray-500 line-clamp-2 mb-1">{n.message}</p>
                          <span className="text-[9px] text-gray-400 font-medium">
                            {format(new Date(n.created_at), "d 'de' MMM, HH:mm", { locale: es })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}