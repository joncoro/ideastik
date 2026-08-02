import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input, Label } from './ui/Components';
import SafeIcon from '../common/SafeIcon';

/**
 * Overlay global para restablecer la contraseña. Se muestra cuando el usuario
 * llega desde el enlace del correo (evento PASSWORD_RECOVERY de Supabase), por
 * encima de cualquier ruta para no chocar con el HashRouter.
 */
export default function ResetPasswordModal() {
  const { recoveryMode, updatePassword, setRecoveryMode, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!recoveryMode) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const cerrar = async () => {
    setRecoveryMode(false);
    await logout();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <Card className="relative w-full max-w-sm p-6 shadow-xl">
        {done ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-success/15 text-success flex items-center justify-center mx-auto">
              <SafeIcon name="CheckCircle" className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg">Contraseña actualizada</h3>
              <p className="text-sm text-gray-500 mt-1">Ya puedes usar tu nueva contraseña.</p>
            </div>
            <Button className="w-full" onClick={() => setRecoveryMode(false)}>Continuar</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <SafeIcon name="Lock" className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg leading-tight">Nueva contraseña</h3>
                <p className="text-xs text-gray-500">Elige una contraseña para tu cuenta.</p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-center gap-2">
                <SafeIcon name="AlertCircle" className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <div className="space-y-1">
              <Label>Nueva contraseña</Label>
              <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
            </div>
            <div className="space-y-1">
              <Label>Repite la contraseña</Label>
              <Input type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>

            <Button type="submit" className="w-full" isLoading={loading}>Guardar contraseña</Button>
            <button type="button" onClick={cerrar} className="w-full text-center text-xs text-gray-400 hover:text-gray-600">
              Cancelar
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
