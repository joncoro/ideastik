import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Spinner from './components/ui/Spinner';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const CalendarHub = lazy(() => import('./pages/Calendar'));
const Composer = lazy(() => import('./pages/Composer'));
const Account = lazy(() => import('./pages/Account'));
const Report = lazy(() => import('./pages/Report'));
const Settings = lazy(() => import('./pages/Settings'));
const ChatWizard = lazy(() => import('./pages/ChatWizard'));

const HomeRedirect = () => {
  const { currentBusiness, allBusinesses, loading, user } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Spinner />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  if (!allBusinesses || allBusinesses.length === 0) {
    return <Navigate to="/empezar" replace />;
  }

  const business = currentBusiness || allBusinesses[0];
  const isParrillaReady = business.current_fase === 'COMPLETADO' || business.current_fase === 'FIN';

  if (isParrillaReady) {
    return <Navigate to={`/n/${business.id}/calendario`} replace />;
  }

  return <Navigate to={`/n/${business.id}/estrategia`} replace />;
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Spinner />
    </div>
  );

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Spinner />
    </div>
  );

  if (user) {
    return <Navigate to="/inicio" replace />;
  }

  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Spinner /></div>}>
        <Routes>
          <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/inicio" element={<HomeRedirect />} />
            <Route path="/empezar" element={<ChatWizard />} />
            <Route path="/n/:bizId/estrategia" element={<ChatWizard />} />
            <Route path="/n/:bizId/calendario" element={<CalendarHub />} />
            <Route path="/n/:bizId/post/:postId" element={<Composer />} />
            <Route path="/n/:bizId/reporte/:mes" element={<Report />} />
            <Route path="/n/:bizId/ajustes" element={<Settings />} />
            <Route path="/cuenta" element={<Account />} />
          </Route>

          <Route path="*" element={<Navigate to="/inicio" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}