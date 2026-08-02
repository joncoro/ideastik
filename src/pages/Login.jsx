import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card, Label } from '../components/ui/Components';
import SafeIcon from '../common/SafeIcon';

export default function Login() {
  const { login, signUp, sendPasswordReset } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const isSignUp = view === 'signup';
  const isReset = view === 'reset';
  const from = location.state?.from?.pathname || "/onboarding";

  const cambiarVista = (v) => { setView(v); setError(''); setResetSent(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isReset) {
        await sendPasswordReset(email);
        setResetSent(true);
      } else if (isSignUp) {
        await signUp(email, password, name);
        navigate(from, { replace: true });
      } else {
        await login(email, password);
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Error al autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-heading font-bold text-primary mb-2">ideastik<span className="text-success">.</span></h1>
        <p className="text-gray-600">
          {isReset ? 'Recupera el acceso a tu cuenta' : isSignUp ? 'Crea tu cuenta gratis' : 'Entra a tu centro de estrategia'}
        </p>
      </div>

      <Card className="w-full max-w-sm p-6 shadow-xl">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-center gap-2">
            <SafeIcon name="AlertCircle" className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {isReset && resetSent ? (
          <div className="text-center space-y-4 py-2">
            <div className="w-12 h-12 rounded-2xl bg-success/15 text-success flex items-center justify-center mx-auto">
              <SafeIcon name="Mail" className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg">Revisa tu correo</h3>
              <p className="text-sm text-gray-500 mt-1">
                Si <b>{email}</b> tiene una cuenta, te enviamos un enlace para restablecer tu contraseña. Revisa también spam.
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => cambiarVista('signin')}>Volver a iniciar sesión</Button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-1">
                  <Label>Nombre completo</Label>
                  <Input placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              {!isReset && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label>Contraseña</Label>
                    {!isSignUp && (
                      <button type="button" onClick={() => cambiarVista('reset')} className="text-[11px] text-primary font-medium hover:underline">
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              )}

              <Button type="submit" className="w-full" isLoading={loading}>
                {isReset ? 'Enviar enlace de recuperación' : isSignUp ? 'Registrarme' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              {isReset ? (
                <button onClick={() => cambiarVista('signin')} className="text-sm text-primary font-medium hover:underline">
                  Volver a iniciar sesión
                </button>
              ) : (
                <button onClick={() => cambiarVista(isSignUp ? 'signin' : 'signup')} className="text-sm text-primary font-medium hover:underline">
                  {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                </button>
              )}
            </div>
          </>
        )}
      </Card>

      <p className="mt-6 text-center text-xs text-gray-400 max-w-sm">
        Al continuar aceptas nuestra{' '}
        <a href="/privacidad" target="_blank" rel="noopener" className="text-primary hover:underline">Política de Privacidad</a>{' '}y la{' '}
        <a href="/eliminacion-datos" target="_blank" rel="noopener" className="text-primary hover:underline">eliminación de datos</a>.
      </p>
    </div>
  );
}
