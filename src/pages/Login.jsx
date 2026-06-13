import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card, Label } from '../components/ui/Components';
import SafeIcon from '../common/SafeIcon';

export default function Login() {
  const { login, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || "/onboarding";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, name);
      } else {
        await login(email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Error al autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-heading font-bold text-primary mb-2">ideastik<span className="text-success">.</span></h1>
        <p className="text-gray-600">
          {isSignUp ? 'Crea tu cuenta gratis' : 'Entra a tu centro de estrategia'}
        </p>
      </div>

      <Card className="w-full max-w-sm p-6 shadow-xl">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-center gap-2">
            <SafeIcon name="AlertCircle" className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1">
              <Label>Nombre completo</Label>
              <Input 
                placeholder="Tu nombre" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>
          )}
          <div className="space-y-1">
            <Label>Email</Label>
            <Input 
              type="email" 
              placeholder="tu@correo.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="space-y-1">
            <Label>Contraseña</Label>
            <Input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          <Button type="submit" className="w-full" isLoading={loading}>
            {isSignUp ? 'Registrarme' : 'Entrar'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-primary font-medium hover:underline"
          >
            {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>
      </Card>
    </div>
  );
}