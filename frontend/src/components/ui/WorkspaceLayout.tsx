import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutGrid, Users, UserPlus, Settings,
  CheckSquare, User, Bell,
  Zap, Building2, ChevronsUpDown,
  LogOut, Sun, Moon, Menu,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useThemeStore } from '../../store/themeStore';
import { authApi } from '../../api/auth';
import { buildAvatarSrc } from '../../utils/avatarUrl';

const WS_NAV = [
  { to: '',         label: 'Proyectos',     end: true,  Icon: LayoutGrid },
  { to: 'teams',    label: 'Equipos',       end: false, Icon: Users      },
  { to: 'members',  label: 'Miembros',      end: false, Icon: UserPlus   },
  { to: 'settings', label: 'Configuración', end: false, Icon: Settings   },
] as const;

const ACCOUNT_NAV = [
  { to: 'my-tasks',      label: 'Mis tareas',    Icon: CheckSquare },
  { to: 'profile',       label: 'Perfil',         Icon: User        },
  { to: 'notifications', label: 'Notificaciones', Icon: Bell        },
] as const;

const SIDEBAR_W = '13.75rem';

export default function WorkspaceLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user, refreshToken, logout } = useAuthStore();
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const { theme, toggle: toggleTheme } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut]   = useState(false);
  const [avatarErr, setAvatarErr]     = useState(false);

  const avatarSrc = buildAvatarSrc(user?.avatarUrl, user?.updatedAt);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { if (refreshToken) await authApi.logout(refreshToken); } catch { /* ignore */ }
    finally { logout(); navigate('/login'); }
  };

  const isActive = (to: string, end: boolean) => {
    const base = `/workspaces/${workspaceId}`;
    if (end) return location.pathname === base || location.pathname === `${base}/`;
    return location.pathname.startsWith(`${base}/${to}`);
  };

  /* ── nav item ─────────────────────────── */
  const NavItem = ({ to, label, end = false, Icon, onClick }: {
    to: string; label: string; end?: boolean;
    Icon: React.ElementType; onClick?: () => void;
  }) => {
    const active = isActive(to, end);
    const href   = to ? `/workspaces/${workspaceId}/${to}` : `/workspaces/${workspaceId}`;
    return (
      <Link
        to={href}
        onClick={onClick}
        className={[
          'relative flex items-center gap-2 px-3 py-1.5 text-[0.8125rem] font-medium no-underline',
          'rounded-[var(--radius-md)] transition-[background,color]',
          active
            ? 'nav-item-active'
            : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]',
        ].join(' ')}
        style={{ transitionDuration: 'var(--duration)' }}
      >
        <Icon size={14} strokeWidth={active ? 2.25 : 1.75} style={{ flexShrink: 0 }} />
        {label}
      </Link>
    );
  };

  /* ── small icon button ────────────────── */
  const IconBtn = ({ onClick, title, children, danger = false, disabled = false }: {
    onClick: () => void; title: string; children: React.ReactNode;
    danger?: boolean; disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={[
        'flex items-center justify-center w-[1.625rem] h-[1.625rem] border-none cursor-pointer',
        'rounded-[var(--radius-sm)] bg-transparent transition-[background,color]',
        'text-[var(--text-faint)] disabled:opacity-40 disabled:pointer-events-none',
        danger
          ? 'hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]'
          : 'hover:bg-[var(--bg-hover)] hover:text-[var(--text)]',
      ].join(' ')}
      style={{ transitionDuration: 'var(--duration)' }}
    >
      {children}
    </button>
  );

  /* ── section label ────────────────────── */
  const SectionLabel = ({ label }: { label: string }) => (
    <p className="px-3 pt-2 pb-1 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)] leading-none m-0">
      {label}
    </p>
  );

  /* ── separator ────────────────────────── */
  const Sep = () => (
    <div className="mx-3 my-1.5 h-px bg-[var(--border)]" />
  );

  /* ── sidebar ──────────────────────────── */
  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Logo + switcher */}
      <div className="px-3 pt-3.5 pb-2.5">
        <Link
          to="/workspaces"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2 mb-2.5 no-underline group"
        >
          <div className="w-[1.625rem] h-[1.625rem] rounded-[var(--radius-md)] bg-[var(--accent)] flex items-center justify-center shrink-0 group-hover:opacity-90 transition-opacity">
            <Zap size={13} color="white" strokeWidth={2.5} fill="white" />
          </div>
          <span className="text-[0.8125rem] font-bold text-[var(--text)] tracking-[-0.02em]">
            Agile App
          </span>
        </Link>

        <button
          onClick={() => { navigate('/workspaces'); setSidebarOpen(false); }}
          className="w-full flex items-center gap-2 px-2 py-1.5 border border-[var(--border)] bg-[var(--bg-hover)] rounded-[var(--radius-md)] cursor-pointer text-[0.75rem] font-medium text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text)] transition-[background,border-color,color] text-left"
          style={{ transitionDuration: 'var(--duration)' }}
        >
          <Building2 size={12} strokeWidth={2} className="shrink-0 text-[var(--accent)]" />
          <span className="flex-1 truncate">Cambiar workspace</span>
          <ChevronsUpDown size={11} className="shrink-0 opacity-40" />
        </button>
      </div>

      <Sep />

      {/* Nav */}
      <nav className="flex-1 px-1 overflow-y-auto">
        <SectionLabel label="Workspace" />
        <div className="space-y-0.5">
          {WS_NAV.map(({ to, label, end, Icon }) => (
            <NavItem key={to} to={to} label={label} end={end} Icon={Icon}
              onClick={() => setSidebarOpen(false)} />
          ))}
        </div>

        <div className="mt-1">
          <SectionLabel label="Cuenta" />
          <div className="space-y-0.5">
            {ACCOUNT_NAV.map(({ to, label, Icon }) => (
              <NavItem key={to} to={to} label={label} Icon={Icon}
                onClick={() => setSidebarOpen(false)} />
            ))}
          </div>
        </div>
      </nav>

      <Sep />

      {/* User footer */}
      <div className="px-2 pb-3 pt-1 space-y-1.5">
        {/* User info */}
        <div className="flex items-center gap-2 px-1">
          <div className="relative shrink-0">
            {avatarSrc && !avatarErr ? (
              <img
                src={avatarSrc}
                alt=""
                onError={() => setAvatarErr(true)}
                className="w-[1.625rem] h-[1.625rem] object-cover border border-[var(--border)]"
                style={{ borderRadius: 'var(--radius-sm)' }}
              />
            ) : (
              <div
                className="w-[1.625rem] h-[1.625rem] flex items-center justify-center bg-[var(--accent)] text-white text-[0.6875rem] font-bold"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                {user?.username?.charAt(0).toUpperCase() ?? '?'}
              </div>
            )}
            <div
              className="absolute -bottom-0.5 -right-0.5 w-[0.4375rem] h-[0.4375rem] bg-[var(--success)] border-[1.5px] border-[var(--bg-elevated)] rounded-full"
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[0.75rem] font-semibold text-[var(--text)] truncate leading-tight m-0">
              {user?.fullName || user?.username}
            </p>
            <p className="text-[0.625rem] text-[var(--text-faint)] truncate leading-tight m-0">
              {user?.email}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center justify-end gap-0.5 pr-1">
          <IconBtn onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
            {theme === 'dark' ? <Sun size={13} strokeWidth={1.75} /> : <Moon size={13} strokeWidth={1.75} />}
          </IconBtn>
          <IconBtn onClick={handleLogout} title="Cerrar sesión" danger disabled={loggingOut}>
            <LogOut size={13} strokeWidth={1.75} />
          </IconBtn>
        </div>
      </div>
    </div>
  );

  if (workspaceId) setWorkspace(workspaceId);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', display: 'flex' }}>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-40"
        style={{
          width: SIDEBAR_W,
          background: 'var(--bg-elevated)',
          borderRight: '1px solid var(--border)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'var(--bg-overlay)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className="fixed left-0 top-0 h-full flex flex-col z-50 lg:hidden"
        style={{
          width: SIDEBAR_W,
          background: 'var(--bg-elevated)',
          borderRight: '1px solid var(--border)',
          transform: sidebarOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_W})`,
          transition: `transform var(--duration-panel) var(--ease-out)`,
        }}
      >
        <SidebarContent />
      </aside>

      {/* Content area */}
      <div
        className="flex flex-col flex-1 min-h-screen"
        style={{ marginLeft: 0 }}
      >
        {/* Tailwind can't compute dynamic ml, use CSS directly */}
        <style>{`@media (min-width:1024px){.workspace-content{margin-left:${SIDEBAR_W}}}`}</style>

        {/* Mobile topbar */}
        <div
          className="sticky top-0 z-30 flex items-center justify-between px-4 lg:hidden"
          style={{
            height: '3rem',
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] border-none bg-transparent text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)] cursor-pointer transition-[background,color]"
            style={{ transitionDuration: 'var(--duration)' }}
          >
            <Menu size={16} />
          </button>

          <Link
            to={`/workspaces/${workspaceId}`}
            className="flex items-center gap-1.5 no-underline"
          >
            <div className="w-[1.375rem] h-[1.375rem] flex items-center justify-center bg-[var(--accent)]"
              style={{ borderRadius: 'var(--radius-sm)' }}>
              <Zap size={11} color="white" strokeWidth={2.5} fill="white" />
            </div>
            <span className="text-[0.8125rem] font-bold text-[var(--text)] tracking-[-0.02em]">
              Agile App
            </span>
          </Link>

          <div className="w-8" />
        </div>

        {/* Page */}
        <main
          className="workspace-content flex-1 animate-fade-in"
          style={{ padding: '1.25rem 1.5rem' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
