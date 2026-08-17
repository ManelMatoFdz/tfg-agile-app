import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutGrid, Users, UserPlus, Settings, CheckSquare,
  Menu, Bell, User, LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { authApi } from '../../api/auth';
import { notificationsApi } from '../../api/notifications';
import { workspacesApi } from '../../api/workspaces';
import { buildAvatarSrc } from '../../utils/avatarUrl';
import { KadenzaLogo } from '../auth/AuthLayout';

const WS_NAV = [
  { to: '',         i18nKey: 'projects',      end: true,  Icon: LayoutGrid   },
  { to: 'my-tasks', i18nKey: 'myTasks',       end: false, Icon: CheckSquare  },
  { to: 'members',  i18nKey: 'members',       end: false, Icon: UserPlus     },
  { to: 'teams',    i18nKey: 'teams',         end: false, Icon: Users        },
  { to: 'settings', i18nKey: 'settings',      end: false, Icon: Settings     },
] as const;

const ACCOUNT_NAV = [
  { to: 'notifications', i18nKey: 'notifications', Icon: Bell },
  { to: 'profile',       i18nKey: 'profile',       Icon: User },
] as const;

const SIDEBAR_W = 240;

export default function WorkspaceLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user, refreshToken, logout } = useAuthStore();
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarErr, setAvatarErr] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const avatarSrc = buildAvatarSrc(user?.avatarUrl, user?.updatedAt);

  const { data: workspace } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: async () => (await workspacesApi.getById(workspaceId!)).data,
    enabled: !!workspaceId,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await notificationsApi.list({ unreadOnly: true, size: 1 });
      return res.data.totalElements;
    },
  });

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch { /* ignore */ } finally {
      logout();
      navigate('/login');
    }
  };

  const isActive = (to: string, end: boolean) => {
    const base = `/workspaces/${workspaceId}`;
    if (end) return location.pathname === base || location.pathname === `${base}/`;
    return location.pathname.startsWith(`${base}/${to}`);
  };

  const NavItem = ({ to, label, end = false, Icon, badge, onClick }: {
    to: string; label: string; end?: boolean;
    Icon: React.ElementType; badge?: number; onClick?: () => void;
  }) => {
    const active = isActive(to, end);
    const href = to ? `/workspaces/${workspaceId}/${to}` : `/workspaces/${workspaceId}`;
    return (
      <Link
        to={href}
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          fontSize: 14,
          fontWeight: active ? 600 : 500,
          color: active ? 'var(--accent-text)' : 'var(--text-muted)',
          background: active ? 'var(--accent-muted)' : 'transparent',
          borderRadius: 'var(--radius-md)',
          textDecoration: 'none',
          transition: 'background var(--duration) var(--ease-in-out), color var(--duration) var(--ease-in-out)',
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text)';
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }
        }}
      >
        <Icon size={18} strokeWidth={active ? 2 : 1.75} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        {badge != null && badge > 0 && (
          <span style={{
            minWidth: 18, height: 18, padding: '0 5px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--danger)', color: '#fff',
            fontSize: 10, fontWeight: 700, borderRadius: 'var(--radius-pill)',
          }}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '16px 16px 12px' }}>
        <KadenzaLogo height={24} />
      </div>

      {/* Workspace selector */}
      <div style={{ padding: '0 12px 12px' }}>
        <button
          onClick={() => { navigate('/workspaces'); setSidebarOpen(false); }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            color: 'var(--text)',
            textAlign: 'left',
            transition: 'border-color var(--duration) var(--ease-in-out), background var(--duration) var(--ease-in-out)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.background = 'var(--accent-muted)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.background = 'var(--bg)';
          }}
        >
          <div style={{
            width: 30, height: 30,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-fg)', fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>
            {workspace?.name?.charAt(0).toUpperCase() ?? 'W'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              display: 'block',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3,
            }}>
              {workspace?.name ?? '\u00A0'}
            </span>
            <span style={{
              display: 'block',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontSize: 11, fontWeight: 500, color: 'var(--text-faint)', lineHeight: 1.3,
            }}>
              {t('workspace.nav.changeWorkspace')}
            </span>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div style={{ margin: '0 12px', height: 1, background: 'var(--border)' }} />

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 8px', overflow: 'auto' }}>
        <p style={sectionLabelStyle}>{t('workspace.nav.workspace')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {WS_NAV.map(({ to, i18nKey, end, Icon }) => (
            <NavItem key={to} to={to} label={t(`workspace.nav.${i18nKey}`)} end={end} Icon={Icon}
              onClick={() => setSidebarOpen(false)} />
          ))}
        </div>

        <p style={{ ...sectionLabelStyle, marginTop: 16 }}>{t('workspace.nav.account')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {ACCOUNT_NAV.map(({ to, i18nKey, Icon }) => (
            <NavItem key={to} to={to} label={t(`workspace.nav.${i18nKey}`)} Icon={Icon}
              badge={to === 'notifications' ? unreadCount : undefined}
              onClick={() => setSidebarOpen(false)} />
          ))}
        </div>
      </nav>

      {/* Bottom: current user + logout */}
      <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: 6,
          borderRadius: 'var(--radius-md)',
          transition: 'background var(--duration) var(--ease-in-out)',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Link
            to={`/workspaces/${workspaceId}/profile`}
            onClick={() => setSidebarOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              flex: 1, minWidth: 0, textDecoration: 'none',
            }}
          >
            <div style={{
              width: 32, height: 32, flexShrink: 0,
              borderRadius: 'var(--radius-pill)',
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--accent)', color: '#fff',
              fontSize: 12, fontWeight: 700,
            }}>
              {avatarSrc && !avatarErr ? (
                <img
                  src={avatarSrc}
                  alt=""
                  onError={() => setAvatarErr(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{
                margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.fullName || user?.username}
              </p>
              <p style={{
                margin: 0, fontSize: 11, color: 'var(--text-faint)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                @{user?.username}
              </p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title={t('workspace.nav.logout')}
            aria-label={t('workspace.nav.logout')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, flexShrink: 0,
              border: 'none', background: 'transparent',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-faint)',
              cursor: loggingOut ? 'not-allowed' : 'pointer',
              opacity: loggingOut ? 0.5 : 1,
              transition: 'background var(--duration) var(--ease-in-out), color var(--duration) var(--ease-in-out)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--danger-bg)';
              e.currentTarget.style.color = 'var(--danger-text)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-faint)';
            }}
          >
            <LogOut size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    if (workspaceId) setWorkspace(workspaceId);
  }, [workspaceId, setWorkspace]);

  useEffect(() => { setAvatarErr(false); }, [avatarSrc]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>
      <style>{`
        .ws-sidebar{transform:translateX(-${SIDEBAR_W}px)}
        @media (min-width:1024px){
          .ws-sidebar{transform:translateX(0)!important}
          .ws-shell{margin-left:${SIDEBAR_W}px}
          .ws-mobile-top{display:none!important}
          .ws-backdrop{display:none!important}
        }
      `}</style>

      {sidebarOpen && (
        <div
          className="ws-backdrop"
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'var(--bg-overlay)' }}
        />
      )}

      <aside
        className="ws-sidebar"
        style={{
          position: 'fixed',
          left: 0, top: 0,
          height: '100%',
          width: SIDEBAR_W,
          zIndex: 50,
          background: 'var(--bg-elevated)',
          borderRight: '1px solid var(--border)',
          transform: sidebarOpen ? 'translateX(0)' : undefined,
          transition: 'transform var(--duration-panel) var(--ease-out)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <SidebarContent />
      </aside>

      <div className="ws-shell" style={{ flex: 1, minWidth: 0 }}>
        {/* Mobile top bar — hamburger only */}
        <div
          className="ws-mobile-top"
          style={{
            display: 'flex', alignItems: 'center',
            padding: '0 16px', height: 52,
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36,
              borderRadius: 'var(--radius-md)', border: 'none',
              background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            <Menu size={20} />
          </button>
        </div>

        <main style={{ padding: '24px 28px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const sectionLabelStyle: React.CSSProperties = {
  padding: '4px 12px',
  margin: '0 0 4px',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-faint)',
};