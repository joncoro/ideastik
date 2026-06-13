import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import SafeIcon from '../common/SafeIcon';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import BusinessSwitcher from './BusinessSwitcher';
import NotificationCenter from './NotificationCenter';

export default function Layout() {
  const { user, currentBusiness, logout } = useAuth();
  const location = useLocation();
  
  if (!user) return <Outlet />;
  
  const isExcluded = location.pathname.includes('/estrategia') || location.pathname.includes('/post/');
  if (isExcluded) return <Outlet />;

  const navItems = [
    { name: 'Calendario', path: `/n/${currentBusiness?.id}/calendario`, icon: 'Calendar' },
    { name: 'Ajustes', path: `/n/${currentBusiness?.id}/ajustes`, icon: 'Sliders' },
    { name: 'Cuenta', path: `/cuenta`, icon: 'User' },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="hidden lg:flex flex-col w-64 border-r border-gray-200 bg-white">
        <div className="p-6">
          <h1 className="text-2xl font-heading font-bold tracking-tighter text-primary">ideastik<span className="text-success">.</span></h1>
          <BusinessSwitcher />
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink key={item.name} to={item.path} className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              isActive ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}>
              <SafeIcon name={item.icon} className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={logout} className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-900 px-4 py-2 w-full">
            <SafeIcon name="LogOut" className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0 relative">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 h-16 flex items-center justify-between sticky top-0 z-10 lg:bg-transparent lg:border-none">
          <h1 className="lg:hidden text-xl font-heading font-bold text-primary">ideastik.</h1>
          <div className="flex items-center gap-4">
            <NotificationCenter />
          </div>
        </header>
        <Outlet />
      </main>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 pb-safe z-50">
        {navItems.map((item) => (
          <NavLink key={item.name} to={item.path} className={({ isActive }) => cn(
            "flex flex-col items-center justify-center w-full h-full gap-1",
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