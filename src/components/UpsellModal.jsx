import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from './ui/Components';
import SafeIcon from '../common/SafeIcon';

/**
 * Modal de upsell reutilizable. Lleva al usuario al plan Mensual (/cuenta).
 */
export default function UpsellModal({ open, onClose, titulo, mensaje }) {
  const navigate = useNavigate();
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm"
          >
            <Card className="p-7 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-[#8B5CF6] text-white flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
                <SafeIcon name="Zap" className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-xl mb-1.5">{titulo || 'Mejora a Mensual'}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{mensaje}</p>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <Button className="w-full shadow-lg shadow-primary/20" onClick={() => navigate('/cuenta')}>
                  Ver plan Mensual
                </Button>
                <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 font-medium py-1">
                  Ahora no
                </button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
