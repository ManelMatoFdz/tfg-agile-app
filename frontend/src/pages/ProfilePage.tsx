import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { usersApi } from '../api/users';
import { useAuthStore } from '../store/authStore';
import ProfileInfo from '../components/profile/ProfileInfo';
import AvatarUpload from '../components/profile/AvatarUpload';
import ChangePassword from '../components/profile/ChangePassword';
import NotificationPreferences from '../components/profile/NotificationPreferences';
import { buildAvatarSrc } from '../utils/avatarUrl';
import PageTitle from '../components/motion/PageTitle';
import TopBar from '../components/ui/TopBar';

export default function ProfilePage() {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const isStandalone = location.pathname === '/profile';

  useEffect(() => {
    usersApi.getMe().then((res) => setUser(res.data)).catch(() => {});
  }, [setUser]);

  const avatarSrc = buildAvatarSrc(user?.avatarUrl, user?.updatedAt);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [avatarSrc]);

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`.profile-grid{display:grid;gap:24px;grid-template-columns:1fr}@media(min-width:1024px){.profile-grid{grid-template-columns:2fr 1fr}.profile-main{grid-column:1}}`}</style>
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
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
                color: 'var(--accent-fg)', fontSize: 28, fontWeight: 700,
                border: '2px solid var(--border)',
              }}>
                {user?.username?.charAt(0).toUpperCase() ?? '?'}
              </div>
            )}
            {/* Online dot */}
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 14, height: 14,
              background: 'var(--success)',
              border: '2px solid var(--bg-elevated)',
              borderRadius: '50%',
            }} />
          </div>

          {/* User info */}
          <div>
            <PageTitle style={{ fontSize: 24 }}>
              {user?.fullName || user?.username || t('profile.defaultUser')}
            </PageTitle>
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
      <div className="profile-grid">
        <div className="profile-main" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

  if (!isStandalone) return content;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopBar />

      <style>{`
        .profile-standalone-content{max-width:900px;margin:0 auto;padding:32px 24px}
        @media(min-width:1280px){.profile-standalone-content{max-width:1100px;padding:40px 48px}}
        @media(min-width:1536px){.profile-standalone-content{max-width:1300px;padding:48px 64px}}
      `}</style>
      <div className="profile-standalone-content">
        {content}
      </div>
    </div>
  );
}