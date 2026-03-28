import { useRef, useState } from 'react';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { usersApi } from '../../api/users';
import { useAuthStore } from '../../store/authStore';
import { useApiAction } from '../../hooks/useApiAction';
import type { User } from '../../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export default function AvatarUpload() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { loading, error, success, run, reset } = useApiAction<User>();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const avatarSrc = user?.avatarUrl
    ? `${API_BASE}/assets/avatars/${user.id}`
    : null;

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const updated = await run(usersApi.uploadAvatar(file));
    if (updated) setUser(updated);
  };

  return (
    <div className="glass-card-strong rounded-2xl p-6 space-y-6 hover:shadow-xl transition-shadow duration-500">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-accent-500/10 to-primary-100 rounded-xl flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Avatar</h3>
          <p className="text-sm text-gray-400 mt-0.5">Tu imagen de perfil</p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={reset} />}
      {success && <Alert type="success" message="Avatar actualizado." onClose={reset} />}

      <div className="flex flex-col items-center gap-5">
        {/* Avatar with ring animation */}
        <div className="relative group">
          <div className={`absolute -inset-1 bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 rounded-2xl blur-sm opacity-0 group-hover:opacity-60 transition-opacity duration-500 ${loading ? 'opacity-60 animate-spin' : ''}`} style={{ backgroundSize: '200% 200%', animation: loading ? 'gradient-shift 2s linear infinite' : undefined }} />
          <div className="relative">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Avatar"
                className="w-28 h-28 rounded-2xl object-cover ring-4 ring-white shadow-xl transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-primary-400 via-accent-400 to-primary-600 flex items-center justify-center text-white text-4xl font-bold ring-4 ring-white shadow-xl transition-transform duration-300 group-hover:scale-105">
                {user?.username?.charAt(0).toUpperCase() ?? '?'}
              </div>
            )}
            <button
              type="button"
              className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <svg className="w-7 h-7 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Drop zone */}
        <div
          className={`w-full border-2 border-dashed rounded-xl p-4 text-center transition-all duration-300 cursor-pointer ${
            dragOver
              ? 'border-primary-400 bg-primary-50/50 scale-[1.02]'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
          }`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
        >
          <Button variant="secondary" loading={loading} type="button" className="mb-2">
            Seleccionar imagen
          </Button>
          <p className="text-xs text-gray-400">o arrastra y suelta aquí</p>
          <p className="text-xs text-gray-300 mt-1">JPG, PNG o GIF. Máx 5 MB</p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    </div>
  );
}
