import { useState, type FormEvent } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { usersApi } from '../../api/users';
import { useApiAction } from '../../hooks/useApiAction';

export default function ChangePassword() {
  const { loading, error, success, run, reset } = useApiAction();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (newPassword.length < 6) {
      setValidationError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirm) {
      setValidationError('Las contraseñas no coinciden.');
      return;
    }

    const result = await run(usersApi.changePassword(currentPassword, newPassword));
    if (result !== null) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    }
  };

  return (
    <div className="glass-card-strong rounded-2xl p-6 space-y-6 hover:shadow-xl transition-shadow duration-500">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cambiar contraseña</h3>
          <p className="text-sm text-gray-400 mt-0.5">Actualiza la contraseña de tu cuenta</p>
        </div>
      </div>

      {(error || validationError) && (
        <Alert type="error" message={validationError || error!} onClose={() => { reset(); setValidationError(''); }} />
      )}
      {success && <Alert type="success" message="Contraseña actualizada correctamente." onClose={reset} />}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Contraseña actual"
          type="password"
          placeholder="••••••••"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nueva contraseña"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
          />
          <Input
            label="Confirmar nueva"
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" loading={loading}>
            Cambiar contraseña
          </Button>
        </div>
      </form>
    </div>
  );
}
