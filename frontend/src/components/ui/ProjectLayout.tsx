import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, LayoutDashboard, ListChecks, RefreshCw, Users, Layers, BarChart2, Settings } from 'lucide-react';
import { projectsApi } from '../../api/projects';
import type { Project } from '../../types';

const TABS = [
  { key: 'board',    path: 'board',    Icon: LayoutDashboard },
  { key: 'backlog',  path: 'backlog',  Icon: ListChecks      },
  { key: 'sprints',  path: 'sprints',  Icon: RefreshCw       },
  { key: 'members',  path: 'members',  Icon: Users           },
  { key: 'poker',    path: 'poker',    Icon: Layers          },
  { key: 'metrics',  path: 'metrics',  Icon: BarChart2       },
  { key: 'settings', path: 'settings', Icon: Settings        },
] as const;

export default function ProjectLayout() {
  const { t } = useTranslation();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!projectId) return;
    projectsApi.getById(projectId).then((res) => setProject(res.data)).catch(() => {});
  }, [projectId]);

  return (
    <div>
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1 mb-3" style={{ fontSize: 11 }}>
        <Link
          to={`/workspaces/${workspaceId}`}
          className="transition-colors no-underline"
          style={{ color: 'var(--text-faint)', transitionDuration: 'var(--duration)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
        >
          {t('projects.breadcrumb')}
        </Link>
        <ChevronRight size={11} style={{ color: 'var(--text-faint)', flexShrink: 0 }} strokeWidth={2} />
        <span className="font-semibold truncate" style={{ color: 'var(--text-muted)' }}>
          {project?.name ?? '…'}
        </span>
      </nav>

      {/* ── Project header ── */}
      <div className="mb-0 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start gap-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className="font-bold truncate m-0 leading-tight"
                style={{ fontSize: 16, color: 'var(--text)', letterSpacing: '-0.025em' }}
              >
                {project?.name ?? <span style={{ color: 'var(--text-faint)' }}>…</span>}
              </h1>

              {project && (
                project.visibility === 'WORKSPACE' ? (
                  <span
                    className="shrink-0 font-semibold leading-none"
                    style={{
                      fontSize: 10, letterSpacing: '0.03em',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--success-bg)',
                      color: 'var(--success)',
                      border: '1px solid transparent',
                    }}
                  >
                    {t('projects.settings.visibility.WORKSPACE')}
                  </span>
                ) : (
                  <span
                    className="shrink-0 font-semibold leading-none"
                    style={{
                      fontSize: 10, letterSpacing: '0.03em',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-hover)',
                      color: 'var(--text-faint)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {t('projects.settings.visibility.PRIVATE')}
                  </span>
                )
              )}
            </div>

            {project?.description && (
              <p
                className="m-0 mt-0.5 truncate"
                style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}
              >
                {project.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div
        className="mb-5 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--border)', marginTop: -1 }}
      >
        <nav className="flex" style={{ gap: 0 }}>
          {TABS.map(({ key, path, Icon }) => (
            <NavLink
              key={key}
              to={`/workspaces/${workspaceId}/projects/${projectId}/${path}`}
              className="no-underline shrink-0"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '9px 12px',
                fontSize: 12,
                fontWeight: isActive ? 600 : 500,
                whiteSpace: 'nowrap',
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                marginBottom: -1,
                transition: `color var(--duration), border-color var(--duration)`,
                cursor: 'pointer',
              })}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                if (!el.classList.contains('active')) el.style.color = 'var(--text)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                if (el.style.borderBottomColor === 'transparent' || !el.style.borderBottomColor) {
                  el.style.color = 'var(--text-muted)';
                }
              }}
            >
              {({ isActive }) => (
                <>
                  <Icon size={12} strokeWidth={isActive ? 2.25 : 1.75} style={{ flexShrink: 0 }} />
                  {t(`projects.tabs.${key}`)}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ── Content ── */}
      <Outlet />
    </div>
  );
}
