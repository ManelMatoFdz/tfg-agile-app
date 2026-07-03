import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera } from 'lucide-react';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { usersApi } from '../../api/users';
import { useAuthStore } from '../../store/authStore';
import { useApiAction } from '../../hooks/useApiAction';
import { buildAvatarSrc } from '../../utils/avatarUrl';

export default function AvatarUpload() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { loading, error, success, run, reset } = useApiAction<{ avatarUrl: string }>();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [hoverAvatar, setHoverAvatar] = useState(false);

  const avatarSrc = buildAvatarSrc(user?.avatarUrl, user?.updatedAt);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [avatarSrc]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const updated = await run(usersApi.uploadAvatar(file));
    if (updated && user) {
      setUser({ ...user, avatarUrl: updated.avatarUrl, updatedAt: new Date().toISOString() });
    }
  };

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 36,
          height: 36,
          background: 'var(--plum-soft)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Camera size={18} strokeWidth={1.75} style={{ color: 'var(--plum)' }} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {t('profile.avatar.title')}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
            {t('profile.avatar.subtitle')}
          </p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={reset} />}
      {success && <Alert type="success" message={t('profile.avatar.successMessage')} onClose={reset} />}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => fileRef.current?.click()}
          onMouseEnter={() => setHoverAvatar(true)}
          onMouseLeave={() => setHoverAvatar(false)}
        >
          {avatarSrc && !avatarLoadError ? (
            <img
              src={avatarSrc}
              alt="Avatar"
              style={{
                width: 96,
                height: 96,
                borderRadius: 'var(--radius-md)',
                objectFit: 'cover',
                border: '2px solid var(--border)',
              }}
              onError={() => setAvatarLoadError(true)}
            />
          ) : (
            <div style={{
              width: 96,
              height: 96,
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-fg)',
              fontSize: 36,
              fontWeight: 700,
              border: '2px solid var(--border)',
            }}>
              {user?.username?.charAt(0).toUpperCase() ?? '?'}
            </div>
          )}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hoverAvatar ? 1 : 0,
            transition: `opacity var(--duration-micro) var(--ease-micro)`,
          }}>
            <Camera size={24} color="var(--accent-fg)" strokeWidth={2} />
          </div>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          style={{
            width: '100%',
            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            padding: 16,
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'var(--accent-muted)' : 'transparent',
            transition: `border-color var(--duration-micro) var(--ease-micro), background var(--duration-micro) var(--ease-micro)`,
          }}
        >
          <Button variant="secondary" loading={loading} type="button" style={{ marginBottom: 8 }}>
            {t('profile.avatar.selectImage')}
          </Button>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)' }}>
            {t('profile.avatar.dragDrop')}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-faint)', opacity: 0.7 }}>
            {t('profile.avatar.fileTypes')}
          </p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    </div>
  );
}