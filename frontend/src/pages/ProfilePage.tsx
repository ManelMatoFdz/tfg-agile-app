import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usersApi } from '../api/users';
import { useAuthStore } from '../store/authStore';
import ProfileInfo from '../components/profile/ProfileInfo';
import AvatarUpload from '../components/profile/AvatarUpload';
import ChangePassword from '../components/profile/ChangePassword';
import NotificationPreferences from '../components/profile/NotificationPreferences';
import { buildAvatarSrc } from '../utils/avatarUrl';

export default function ProfilePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  useEffect(() => {
    usersApi.getMe().then((res) => setUser(res.data)).catch(() => {});
  }, [setUser]);

  const avatarSrc = buildAvatarSrc(user?.avatarUrl, user?.updatedAt);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [avatarSrc]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Profile header */}
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle background accent */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 200,
          height: 200,
          background: 'var(--accent-muted)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          transform: 'translate(30%, -50%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {avatarSrc && !avatarLoadError ? (
              <img
                src={avatarSrc}
                alt=""
                style={{
                  width: 72, height: 72,
                  borderRadius: 'var(--radius-md)',
                  objectFit: 'cover',
                  border: '2px solid var(--border)',
                }}
                referrerPolicy="no-referrer"
                onError={() => setAvatarLoadError(true)}
              />
            ) : (
              <div style={{
                width: 72, height: 72,
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 28, fontWeight: 700,
                border: '2px solid var(--border)',
              }}>
                {user?.username?.charAt(0).toUpperCase() ?? '?'}
              </div>
            )}
            {/* Online dot */}
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 14, height: 14,
              background: '#22c55e',
              border: '2px solid var(--bg-elevated)',
              borderRadius: '50%',
            }} />
          </div>

          {/* User info */}
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {user?.fullName || user?.username || t('profile.defaultUser')}
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
              @{user?.username}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>{user?.email}</p>
            {user?.bio && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-muted)', maxWidth: 480 }}>{user.bio}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ProfileInfo />
          <ChangePassword />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AvatarUpload />
          <NotificationPreferences />
        </div>
      </div>
    </div>
  );
}