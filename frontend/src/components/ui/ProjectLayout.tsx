import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { projectsApi } from '../../api/projects';
import type { Project } from '../../types';

const TABS = [
  { key: 'board',    path: 'board'    },
  { key: 'backlog',  path: 'backlog'  },
  { key: 'sprints',  path: 'sprints'  },
  { key: 'members',  path: 'members'  },
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
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link to={`/workspaces/${workspaceId}`} className="hover:text-primary-600 transition-colors">
          {t('projects.breadcrumb')}
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-700 font-medium truncate">{project?.name ?? '...'}</span>
      </nav>

      {/* Project header */}
      {project && (
        <div className="glass-card-strong px-6 py-4 mb-4">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="glass-card-strong mb-4 px-2">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(({ key, path }) => (
            <NavLink
              key={key}
              to={`/workspaces/${workspaceId}/projects/${projectId}/${path}`}
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 ${
                  isActive
                    ? 'text-primary-700 border-primary-500'
                    : 'text-gray-500 border-transparent hover:text-gray-800 hover:border-gray-300'
                }`
              }
            >
              {t(`projects.tabs.${key}`)}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <Outlet />
    </div>
  );
}
