import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SafeIcon from '../common/SafeIcon';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function BusinessSwitcher() {
  const { currentBusiness, allBusinesses, switchBusiness, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  if (!currentBusiness) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
          {currentBusiness.nombre.charAt(0)}
        </div>
        <div className="flex-1 truncate text-left">
          <p className="text-sm font-medium truncate">{currentBusiness.nombre}</p>
          <p className="text-[10px] text-gray-500 truncate uppercase tracking-wider">{currentBusiness.sector}</p>
        </div>
        <SafeIcon 
          name="ChevronDown" 
          className={cn("w-4 h-4 text-gray-400 transition-transform", isOpen && "rotate-180")} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 overflow-hidden"
            >
              <div className="p-2 max-h-60 overflow-y-auto">
                {allBusinesses.map((biz) => (
                  <button
                    key={biz.id}
                    onClick={() => {
                      switchBusiness(biz);
                      setIsOpen(false);
                      navigate(`/n/${biz.id}/calendario`);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-xl transition-colors mb-1",
                      currentBusiness.id === biz.id ? "bg-primary/5 text-primary" : "hover:bg-gray-50 text-gray-600"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                      currentBusiness.id === biz.id ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                    )}>
                      {biz.nombre.charAt(0)}
                    </div>
                    <span className="text-sm font-medium truncate">{biz.nombre}</span>
                    {currentBusiness.id === biz.id && <SafeIcon name="Check" className="w-3.5 h-3.5 ml-auto" />}
                  </button>
                ))}
              </div>
              
              <div className="p-2 border-t border-gray-100 bg-gray-50/50">
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    if (user.plan === 'MENSUAL') {
                      navigate('/onboarding');
                    } else {
                      alert('El plan Mensual te permite gestionar múltiples negocios.');
                      navigate('/cuenta');
                    }
                  }}
                  className="w-full flex items-center gap-2 p-2 text-xs font-semibold text-gray-500 hover:text-primary transition-colors"
                >
                  <SafeIcon name="Plus" className="w-4 h-4" />
                  Agregar nuevo negocio
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}