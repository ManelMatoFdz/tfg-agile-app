import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { buildAvatarSrc } from '../../utils/avatarUrl';
import { AgileFlowLogo } from '../auth/AuthLayout';
import NotificationBell from './NotificationBell';

export default function TopBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user, refreshToken, logout } = useAuthStore();

  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarErr, setAvatarErr] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const avatarSrc = buildAvatarSrc(user?.avatarUrl, user?.updatedAt);

  useEffect(() => { setAvatarErr(false); }, [avatarSrc]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch { /* ignore */ } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 52,
      background: 'var(--bg-elevated)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      {/* Left: Logo */}
      <Link to="/workspaces" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <AgileFlowLogo />
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          AgileFlow
        </span>
      </Link>

      {/* Right: actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* My Tasks — only when inside a workspace */}
        {workspaceId && (
          <Link
            to={`/workspaces/${workspaceId}/my-tasks`}
            style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 150ms' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            {t('workspace.nav.myTasks')}
          </Link>
        )}

        <NotificationBell />

        {/* Profile dropdown */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, padding: 0,
              borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)',
              background: 'var(--bg-elevated)', cursor: 'pointer',
              overflow: 'hidden',
            }}
          >
            {avatarSrc && !avatarErr ? (
              <img
                src={avatarSrc}
                alt=""
                onError={() => setAvatarErr(true)}
                style={{ width: 36, height: 36, objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: 36, height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--accent)', color: '#fff',
                fontSize: 13, fontWeight: 600,
              }}>
                {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </button>

          {profileOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 44,
              width: 240, background: 'var(--bg-elevated)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)', zIndex: 100,
              overflow: 'hidden',
            }}>
              {/* User info */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <p style={{
                  margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user?.fullName || user?.username}
                </p>
                <p style={{
                  margin: '2px 0 0', fontSize: 12, color: 'var(--text-faint)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user?.email}
                </p>
              </div>
              {/* Menu items */}
              <div style={{ padding: '6px' }}>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/profile');
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '8px 12px', fontSize: 13, fontWeight: 500,
                    color: 'var(--text)', background: 'transparent',
                    border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <User size={15} strokeWidth={1.75} />
                  {t('workspace.nav.profile')}
                </button>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '8px 12px', fontSize: 13, fontWeight: 500,
                    color: 'var(--danger)', background: 'transparent',
                    border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    opacity: loggingOut ? 0.5 : 1,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <LogOut size={15} strokeWidth={1.75} />
                  {t('workspace.nav.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}