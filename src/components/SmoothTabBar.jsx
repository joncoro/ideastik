import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { cn } from '../lib/utils';

/**
 * Barra de navegación inferior (móvil) con un "pill" deslizante animado.
 * Adaptado del patrón de smooth tabs al stack del proyecto: framer-motion
 * (layoutId comparte el fondo entre pestañas para que se deslice solo),
 * react-icons y react-router. Reemplaza la barra inferior estática.
 */
export default function SmoothTabBar({ items }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass border-t border-white/50 rounded-none flex items-stretch h-16 pb-safe z-50 px-1">
      {items.map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.name}
            onClick={() => navigate(item.path)}
            aria-current={active ? 'page' : undefined}
            className="relative flex-1 flex items-center justify-center focus:outline-none"
          >
            {active && (
              <motion.div
                layoutId="navPill"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className="absolute inset-x-1.5 inset-y-2 rounded-2xl bg-gradient-to-r from-primary to-[#8B5CF6] shadow-lg shadow-primary/25"
              />
            )}
            <span className={cn(
              'relative z-10 flex flex-col items-center gap-0.5 transition-colors duration-200',
              active ? 'text-white' : 'text-gray-400'
            )}>
              <SafeIcon name={item.icon} className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{item.name}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
