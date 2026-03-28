import { useState, useEffect, type FormEvent } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { usersApi } from '../../api/users';
import { useAuthStore } from '../../store/authStore';
import { useApiAction } from '../../hooks/useApiAction';
import type { User } from '../../types';

export default function ProfileInfo() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { loading, error, success, run, reset } = useApiAction<User>();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName ?? '');
      setBio(user.bio ?? '');
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const updated = await run(usersApi.updateMe({ fullName, bio }));
    if (updated) setUser(updated);
  };

  return (
    <div className="glass-card-strong rounded-2xl p-6 space-y-6 hover:shadow-xl transition-shadow duration-500">
      {/* Header with icon */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-50 rounded-xl flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Información personal</h3>
          <p className="text-sm text-gray-400 mt-0.5">Actualiza tu nombre y biografía</p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={reset} />}
      {success && <Alert type="success" message="Perfil actualizado correctamente." onClose={reset} />}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nombre de usuario" value={user?.username ?? ''} disabled />
          <Input label="Correo electrónico" value={user?.email ?? ''} disabled />
        </div>
        <Input
          label="Nombre completo"
          placeholder="Tu nombre completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-600">Biografía</label>
          <textarea
            className="block w-full rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm px-4 py-3 text-sm placeholder:text-gray-400 focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10 focus:outline-none focus:shadow-lg focus:shadow-primary-500/5 focus:bg-white hover:border-gray-300 resize-none transition-all duration-300"
            rows={3}
            placeholder="Cuéntanos sobre ti..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" loading={loading}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  );
}
