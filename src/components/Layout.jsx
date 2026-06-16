import React from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import SafeIcon from '../common/SafeIcon';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import BusinessSwitcher from './BusinessSwitcher';
import NotificationCenter from './NotificationCenter';

export default function Layout() {
  const { user, currentBusiness, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return <Outlet />;

  const isExcluded = location.pathname.includes('/estrategia') || location.pathname.includes('/post/') || location.pathname.includes('/empezar');
  if (isExcluded) return <Outlet />;

  const navItems = [
    { name: 'Calendario', path: `/n/${currentBusiness?.id}/calendario`, icon: 'Calendar' },
    { name: 'Negocios', path: `/negocios`, icon: 'Grid' },
    { name: 'Ajustes', path: `/n/${currentBusiness?.id}/ajustes`, icon: 'Sliders' },
    { name: 'Cuenta', path: `/cuenta`, icon: 'User' },
  ];

  return (
    <div className="flex h-screen text-foreground overflow-hidden">
      <aside className="hidden lg:flex flex-col w-64 glass border-r border-white/50 shrink-0 rounded-none">
        <div className="p-6">
          <h1 className="text-2xl font-heading font-bold tracking-tighter text-primary">ideastik<span className="text-success">.</span></h1>
          <BusinessSwitcher />
        </div>
        <nav className="flex-1 px-4 space-y-1.5">
          {navItems.map((item) => (
            <NavLink key={item.name} to={item.path} className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-gradient-to-r from-primary to-[#8B5CF6] text-white shadow-lg shadow-primary/25"
                : "text-gray-600 hover:bg-white/60 hover:text-gray-900"
            )}>
              <SafeIcon name={item.icon} className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/40">
          <button onClick={logout} className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-900 px-4 py-2 w-full transition-colors">
            <SafeIcon name="LogOut" className="w-4 h-4" /> Cerrar sesion
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0 relative">
        <header className="bg-white/40 backdrop-blur-xl border-b border-white/40 px-6 h-16 flex items-center justify-between sticky top-0 z-10 lg:bg-transparent lg:border-none lg:backdrop-blur-none">
          {currentBusiness ? (
            <button onClick={() => navigate('/negocios')} className="lg:hidden flex items-center gap-2 max-w-[62%]">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-[#8B5CF6] text-white flex items-center justify-center font-bold text-sm shrink-0">{currentBusiness.nombre?.charAt(0)}</div>
              <span className="font-heading font-bold text-sm text-gray-800 truncate">{currentBusiness.nombre}</span>
              <SafeIcon name="ChevronDown" className="w-4 h-4 text-gray-400 shrink-0" />
            </button>
          ) : (
            <h1 className="lg:hidden text-xl font-heading font-bold text-primary">ideastik.</h1>
          )}
          <div className="flex items-center gap-4">
            <NotificationCenter />
          </div>
        </header>
        <div key={location.pathname} className="animate-fadeup">
          <Outlet />
        </div>
      </main>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass border-t border-white/50 rounded-none flex justify-around items-center h-16 pb-safe z-50">
        {navItems.map((item) => (
          <NavLink key={item.name} to={item.path} className={({ isActive }) => cn(
            "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
            isActive ? "text-primary" : "text-gray-400"
          )}>
            <SafeIcon name={item.icon} className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
