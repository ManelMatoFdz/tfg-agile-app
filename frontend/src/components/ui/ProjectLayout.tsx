import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight, LayoutDashboard, ListChecks, RefreshCw,
  Users, Layers, BarChart2, Settings, Target,
} from 'lucide-react';
import { projectsApi } from '../../api/projects';
import type { Project } from '../../types';

const TABS = [
  { key: 'board',    path: 'board',    Icon: LayoutDashboard },
  { key: 'backlog',  path: 'backlog',  Icon: ListChecks      },
  { key: 'epics',    path: 'epics',    Icon: Target          },
  { key: 'sprints',  path: 'sprints',  Icon: RefreshCw       },
  { key: 'members',  path: 'members',  Icon: Users           },
  { key: 'poker',    path: 'poker',    Icon: Layers          },
  { key: 'metrics',        path: 'metrics',        Icon: BarChart2 },
  { key: 'settings',       path: 'settings',       Icon: Settings },
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Breadcrumb */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
        fontSize: 13,
      }}>
        <Link
          to={`/workspaces/${workspaceId}`}
          style={{
            color: 'var(--accent)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
        >
          AgileFlow
        </Link>
        <ChevronRight size={13} style={{ color: 'var(--text-faint)', flexShrink: 0 }} strokeWidth={1.75} />
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
          {project?.name ?? '...'}
        </span>
        <ChevronRight size={13} style={{ color: 'var(--text-faint)', flexShrink: 0 }} strokeWidth={1.75} />
        <span style={{ fontWeight: 600, color: 'var(--text)', textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.02em' }}>
          {getCurrentTabLabel(t)}
        </span>
      </nav>

      {/* Project header */}
      <div style={{
        marginBottom: 0,
        paddingBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40,
            borderRadius: 'var(--radius-md)',
            background: project?.color || 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            color: '#fff',
            fontSize: 18,
            fontWeight: 700,
          }}>
            {project?.name?.charAt(0).toUpperCase() ?? 'P'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}>
              {project?.name ?? <span style={{ color: 'var(--text-faint)' }}>...</span>}
            </h1>
            {project?.description && (
              <p style={{
                margin: '2px 0 0',
                fontSize: 13,
                color: 'var(--text-muted)',
                lineHeight: 1.4,
              }}>
                {project.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tab navigation - horizontal like mockup board view */}
      <div style={{
        marginBottom: 24,
        overflowX: 'auto',
        borderBottom: '1px solid var(--border)',
      }}>
        <nav style={{ display: 'flex', gap: 0 }}>
          {TABS.map(({ key, path, Icon }) => (
            <NavLink
              key={key}
              to={`/workspaces/${workspaceId}/projects/${projectId}/${path}`}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                whiteSpace: 'nowrap',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                marginBottom: -1,
                textDecoration: 'none',
                flexShrink: 0,
                transition: 'color var(--duration) var(--ease-in-out), border-color var(--duration) var(--ease-in-out)',
                cursor: 'pointer',
              })}
              onMouseEnter={e => {
                const el = e.currentTarget;
                if (!el.style.borderBottomColor || el.style.borderBottomColor === 'transparent') {
                  el.style.color = 'var(--text)';
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                if (!el.style.borderBottomColor || el.style.borderBottomColor === 'transparent') {
                  el.style.color = 'var(--text-muted)';
                }
              }}
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} strokeWidth={isActive ? 2 : 1.75} style={{ flexShrink: 0 }} />
                  {t(`projects.tabs.${key}`)}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </div>
    </div>
  );
}

function getCurrentTabLabel(t: (key: string) => string): string {
  const path = window.location.pathname;
  const segments = path.split('/');
  const last = segments[segments.length - 1];
  if (last === 'board-settings') return t('projects.tabs.boardSettings');
  const tabKeys = ['board', 'backlog', 'epics', 'sprints', 'members', 'poker', 'metrics', 'settings'];
  if (tabKeys.includes(last)) {
    return t(`projects.tabs.${last}`);
  }
  return '';
}