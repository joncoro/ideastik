import React, { useEffect, useState } from 'react';
import SafeIcon from '../common/SafeIcon';

const DISMISS_KEY = 'ideastik_pwa_dismissed';

/**
 * Invita a instalar la app.
 * - Android/Chrome: captura beforeinstallprompt y muestra botón "Instalar".
 * - iOS/Safari (sin ese evento): muestra las instrucciones de "Añadir a inicio".
 * No aparece si ya está instalada (standalone) o si el usuario la cerró antes.
 */
export default function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;
    if (standalone) return; // ya instalada
    if (localStorage.getItem(DISMISS_KEY)) return; // ya la cerró

    const ua = window.navigator.userAgent || '';
    const ios = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua); // Safari iOS
    setIsIOS(ios);

    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); setVisible(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // En iOS no hay evento: mostramos las instrucciones tras un momento.
    let t;
    if (ios) t = setTimeout(() => setVisible(true), 1500);

    window.addEventListener('appinstalled', () => setVisible(false));
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); if (t) clearTimeout(t); };
  }, []);

  const cerrar = () => { setVisible(false); try { localStorage.setItem(DISMISS_KEY, '1'); } catch (_) { /* noop */ } };

  const instalar = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch (_) { /* noop */ }
    setDeferred(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed left-3 right-3 bottom-20 lg:bottom-4 lg:left-auto lg:right-4 lg:max-w-sm z-[60] rounded-2xl bg-white shadow-2xl border border-primary/20 p-3.5 flex items-start gap-3 animate-fadeup">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[#8B5CF6] text-white flex items-center justify-center shrink-0 font-heading font-bold">i.</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-900 leading-tight">Instala Ideastik</p>
        {isIOS ? (
          <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">
            Toca <SafeIcon name="Share" className="inline w-3.5 h-3.5 -mt-0.5" /> <b>Compartir</b> y luego <b>“Añadir a inicio”</b> para tenerla como app.
          </p>
        ) : (
          <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">Tenla en tu pantalla de inicio y ábrela como una app, sin buscar el navegador.</p>
        )}
        {!isIOS && (
          <button onClick={instalar} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl px-3 py-1.5">
            <SafeIcon name="Download" className="w-4 h-4" /> Instalar
          </button>
        )}
      </div>
      <button onClick={cerrar} className="text-gray-400 hover:text-gray-600 shrink-0" aria-label="Cerrar">
        <SafeIcon name="X" className="w-4 h-4" />
      </button>
    </div>
  );
}
