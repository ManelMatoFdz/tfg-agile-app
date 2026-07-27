import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutGrid, Users, UserPlus, Settings, CheckSquare,
  Menu,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { AgileFlowLogo } from '../auth/AuthLayout';
import LanguageSwitcher from './LanguageSwitcher';
import TopBar from './TopBar';

const WS_NAV = [
  { to: '',         i18nKey: 'projects',      end: true,  Icon: LayoutGrid   },
  { to: 'my-tasks', i18nKey: 'myTasks',       end: false, Icon: CheckSquare  },
  { to: 'members',  i18nKey: 'members',       end: false, Icon: UserPlus     },
  { to: 'teams',    i18nKey: 'teams',         end: false, Icon: Users        },
  { to: 'settings', i18nKey: 'settings',      end: false, Icon: Settings     },
] as const;

const SIDEBAR_W = 240;

export default function WorkspaceLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuthStore();
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (to: string, end: boolean) => {
    const base = `/workspaces/${workspaceId}`;
    if (end) return location.pathname === base || location.pathname === `${base}/`;
    return location.pathname.startsWith(`${base}/${to}`);
  };

  const NavItem = ({ to, label, end = false, Icon, onClick }: {
    to: string; label: string; end?: boolean;
    Icon: React.ElementType; onClick?: () => void;
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
          color: active ? 'var(--accent)' : 'var(--text-muted)',
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
        {label}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <AgileFlowLogo />
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          AgileFlow
        </span>
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
            width: 28, height: 28,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>
            {user?.username?.charAt(0).toUpperCase() ?? 'W'}
          </div>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t('workspace.nav.changeWorkspace')}
          </span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div style={{ margin: '0 12px', height: 1, background: 'var(--border)' }} />

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 8px', overflow: 'auto' }}>
        <p style={{
          padding: '4px 12px',
          margin: '0 0 4px',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-faint)',
        }}>
          {t('workspace.nav.workspace')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {WS_NAV.map(({ to, i18nKey, end, Icon }) => (
            <NavItem key={to} to={to} label={t(`workspace.nav.${i18nKey}`)} end={end} Icon={Icon}
              onClick={() => setSidebarOpen(false)} />
          ))}
        </div>
      </nav>

      {/* Bottom: language switcher */}
      <div style={{ padding: '12px 12px 16px' }}>
        <LanguageSwitcher compact />
      </div>
    </div>
  );

  useEffect(() => {
    if (workspaceId) setWorkspace(workspaceId);
  }, [workspaceId, setWorkspace]);

  return (
    <div style={{ height: '100vh', background: 'var(--bg)', display: 'flex', overflow: 'hidden' }}>
      <style>{`
        .ws-sidebar{transform:translateX(-${SIDEBAR_W}px)}
        @media (min-width:1024px){
          .ws-sidebar{transform:translateX(0)!important}
          .ws-content{margin-left:${SIDEBAR_W}px}
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

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Mobile top bar — hamburger only */}
        <div
          className="ws-mobile-top"
          style={{
            position: 'sticky', top: 0, zIndex: 30,
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

        <TopBar />

        <main className="ws-content" style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function bottomLinkStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    borderRadius: 'var(--radius-md)',
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    background: active ? 'var(--accent-muted)' : 'transparent',
    textDecoration: 'none',
    transition: 'background var(--duration) var(--ease-in-out)',
  };
}