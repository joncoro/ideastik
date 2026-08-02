import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { cn } from '../lib/utils';

/**
 * Botón unificado para publicar/compartir en varias redes con una sola acción.
 * Colapsado muestra un disparador; al tocarlo despliega las redes (WhatsApp,
 * Instagram, Facebook…). Se cierra al tocar fuera.
 *
 * Adaptado del "Social Button" de KokonutUI (@dorianbaffier, MIT) al stack de
 * Ideastik: framer-motion + SafeIcon, pensado para móvil (tap, no hover).
 *
 * items: [{ key, icon, label, onSelect, loading, disabled, tone }]
 *   - icon: nombre Feather para SafeIcon (p. ej. 'Instagram').
 *   - onSelect: acción a ejecutar (puede ser async).
 *   - loading/disabled: estado por red (p. ej. IG publicando).
 *   - tone: 'wpp' | 'ig' | 'fb' para el color del acento.
 */
const TONES = {
  wpp: 'text-success',
  ig: 'text-[#E1306C]',
  fb: 'text-[#1877F2]',
  default: 'text-primary',
};

export default function SocialShareButton({
  label = 'Publicar / Compartir',
  items = [],
  disabled = false,
  className,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Cerrar al tocar fuera.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const handleSelect = async (item) => {
    if (item.loading || item.disabled) return;
    try { await item.onSelect?.(); } finally { /* el estado y los mensajes los maneja el padre */ }
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <AnimatePresence initial={false} mode="wait">
        {!open ? (
          <motion.button
            key="trigger"
            type="button"
            disabled={disabled}
            onClick={() => setOpen(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className={cn(
              'w-full h-12 rounded-2xl inline-flex items-center justify-center gap-2',
              'bg-gradient-to-br from-primary to-[#8B5CF6] text-white font-medium text-sm',
              'shadow-lg shadow-primary/25 transition-all duration-200 active:scale-[0.98]',
              'disabled:opacity-50 disabled:pointer-events-none'
            )}
          >
            <SafeIcon name="Share2" className="w-4 h-4" />
            {label}
          </motion.button>
        ) : (
          <motion.div
            key="row"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex gap-2"
          >
            {items.map((item, i) => (
              <motion.button
                key={item.key || item.label}
                type="button"
                aria-label={item.label}
                disabled={item.disabled}
                onClick={() => handleSelect(item)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: i * 0.05 }}
                className={cn(
                  'flex-1 h-12 rounded-2xl inline-flex flex-col items-center justify-center gap-0.5',
                  'bg-white border border-primary/15 shadow-sm text-gray-700',
                  'transition-all duration-200 active:scale-[0.97] hover:border-primary/40',
                  'disabled:opacity-50 disabled:pointer-events-none'
                )}
              >
                {item.loading ? (
                  <SafeIcon name="Loader" className={cn('w-4 h-4 animate-spin', TONES[item.tone] || TONES.default)} />
                ) : (
                  <SafeIcon name={item.icon} className={cn('w-4 h-4', TONES[item.tone] || TONES.default)} />
                )}
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
