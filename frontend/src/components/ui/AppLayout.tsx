import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { useEffect, useState } from 'react';
import { buildAvatarSrc } from '../../utils/avatarUrl';
import { User, Bell, LogOut, Zap, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/profile',       i18nKey: 'profile',        Icon: User        },
  { to: '/notifications', i18nKey: 'notifications',  Icon: Bell        },
] as const;

export default function AppLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshToken, logout } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const avatarSrc = buildAvatarSrc(user?.avatarUrl, user?.updatedAt);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [avatarSrc]);

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
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
        }}>

          <Link
            to="/profile"
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
          >
            <div style={{
              width: 32,
              height: 32,
              background: 'var(--accent)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Zap size={15} color="white" strokeWidth={2.5} fill="white" />
            </div>
            <span style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
            }}>
              Agile App
            </span>
          </Link>

          <div className="app-desktop-nav" style={{
            display: 'none',
            alignItems: 'center',
            gap: 2,
            background: 'var(--bg-sunken)',
            borderRadius: 'var(--radius-md)',
            padding: 3,
          }}>
            {NAV_ITEMS.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    color: active ? 'var(--text)' : 'var(--text-muted)',
                    background: active ? 'var(--bg-elevated)' : 'transparent',
                    textDecoration: 'none',
                    transition: `background var(--duration-micro) var(--ease-micro), color var(--duration-micro) var(--ease-micro)`,
                  }}
                  onMouseEnter={e => {
                    if (!active) e.currentTarget.style.color = 'var(--text)';
                  }}
                  onMouseLeave={e => {
                    if (!active) e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                >
                  <item.Icon size={14} strokeWidth={active ? 2.25 : 1.75} />
                  {t(`workspace.nav.${item.i18nKey}`)}
                </Link>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

            <div className="app-desktop-user" style={{ display: 'none', textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {user?.fullName || user?.username}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)' }}>
                {user?.email}
              </p>
            </div>

            <div style={{ position: 'relative' }}>
              {avatarSrc && !avatarLoadError ? (
                <img
                  src={avatarSrc}
                  alt=""
                  onError={() => setAvatarLoadError(true)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 'var(--radius-md)',
                    objectFit: 'cover',
                    border: '1px solid var(--border)',
                  }}
                />
              ) : (
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 700,
                }}>
                  {user?.username?.charAt(0).toUpperCase() ?? '?'}
                </div>
              )}
              <div style={{
                position: 'absolute',
                bottom: -1,
                right: -1,
                width: 10,
                height: 10,
                background: 'var(--success)',
                border: '2px solid var(--bg-elevated)',
                borderRadius: 'var(--radius-pill)',
              }} />
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="app-desktop-logout"
              style={{
                display: 'none',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-faint)',
                background: 'transparent',
                border: 'none',
                cursor: loggingOut ? 'not-allowed' : 'pointer',
                opacity: loggingOut ? 0.5 : 1,
                fontFamily: 'var(--font-sans)',
                transition: `color var(--duration-micro) var(--ease-micro), background var(--duration-micro) var(--ease-micro)`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--danger-text)';
                e.currentTarget.style.background = 'var(--danger-bg)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-faint)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <LogOut size={14} strokeWidth={1.75} />
              {t('workspace.nav.logout')}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="app-mobile-menu-btn"
              style={{
                display: 'flex',
                padding: 8,
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: `background var(--duration-micro) var(--ease-micro)`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <div
          className="app-mobile-menu"
          style={{
            overflow: 'hidden',
            maxHeight: mobileMenuOpen ? 240 : 0,
            opacity: mobileMenuOpen ? 1 : 0,
            transition: `max-height var(--duration-panel) var(--ease-dramatic), opacity var(--duration-panel) var(--ease-micro)`,
          }}
        >
          <div style={{
            borderTop: '1px solid var(--border)',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}>
            {NAV_ITEMS.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    color: active ? 'var(--accent-text)' : 'var(--text-muted)',
                    background: active ? 'var(--accent-muted)' : 'transparent',
                    textDecoration: 'none',
                    transition: `background var(--duration-micro) var(--ease-micro)`,
                  }}
                >
                  <item.Icon size={16} strokeWidth={active ? 2.25 : 1.75} />
                  {t(`workspace.nav.${item.i18nKey}`)}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--danger-text)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: `background var(--duration-micro) var(--ease-micro)`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-bg)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <LogOut size={16} strokeWidth={1.75} />
              {t('workspace.nav.logout')}
            </button>
          </div>
        </div>
      </nav>

      <style>{`
        @media (min-width:768px){
          .app-desktop-nav{display:flex!important}
          .app-desktop-user{display:block!important}
          .app-desktop-logout{display:flex!important}
          .app-mobile-menu-btn{display:none!important}
          .app-mobile-menu{display:none!important}
        }
      `}</style>

      <main style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: 1120,
        margin: '0 auto',
        padding: '32px 24px',
      }}>
        <Outlet />
      </main>
    </div>
  );
}