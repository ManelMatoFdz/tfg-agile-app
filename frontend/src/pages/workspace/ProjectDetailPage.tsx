import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { projectsApi } from '../../api/projects';
import { useApiAction } from '../../hooks/useApiAction';
import { useUserMap } from '../../hooks/useUserMap';
import Alert from '../../components/ui/Alert';
import type { Project, ProjectMember, ProjectRole } from '../../types';

const ROLE_COLORS: Record<ProjectRole, string> = {
  ADMIN: 'bg-primary-100 text-primary-700',
  MEMBER: 'bg-emerald-100 text-emerald-700',
  VIEWER: 'bg-gray-100 text-gray-600',
};

function MemberRow({ member, displayName, avatarUrl }: { member: ProjectMember; displayName: string; avatarUrl?: string }) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-gray-50/70 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
          {avatarUrl && !imgError ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{displayName}</p>
          <p className="text-xs text-gray-400">
            {t('common.since', { date: new Date(member.joinedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) })}
          </p>
        </div>
      </div>
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[member.role]}`}>
        {t(`projects.members.roles.${member.role}`)}
      </span>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);

  const projectAction = useApiAction<Project>();
  const membersAction = useApiAction<ProjectMember[]>();

  useEffect(() => {
    if (!projectId) return;
    projectAction.run(projectsApi.getById(projectId)).then((data) => {
      if (data) setProject(data);
    });
    membersAction.run(projectsApi.getMembers(projectId)).then((data) => {
      if (data) setMembers(data);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const userMap = useUserMap(members.map((m) => m.userId));
  const loading = projectAction.loading;

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to={`/workspaces/${workspaceId}`} className="hover:text-primary-600 transition-colors">
          {t('projects.breadcrumb')}
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-700 font-medium truncate">{project?.name ?? '...'}</span>
      </nav>

      {(projectAction.error || membersAction.error) && (
        <Alert
          type="error"
          message={projectAction.error ?? membersAction.error!}
          onClose={() => { projectAction.reset(); membersAction.reset(); }}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : project ? (
        <div className="space-y-6">
          {/* Project header */}
          <div className="glass-card-strong p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{project.name}</h1>
                {project.description && (
                  <p className="text-gray-500 mt-1.5">{project.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-3">
                  {t('common.createdAt', { date: new Date(project.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) })}
                </p>
              </div>
            </div>
          </div>

          {/* Kanban placeholder */}
          <div className="glass-card-strong p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">{t('projects.kanban.title')}</h2>
              <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">{t('common.comingSoon')}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[t('projects.kanban.todo'), t('projects.kanban.inProgress'), t('projects.kanban.done')].map((col) => (
                <div
                  key={col}
                  className="flex-shrink-0 w-64 bg-gray-50/80 rounded-xl border border-gray-100 p-3"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{col}</p>
                  </div>
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 bg-white/80 rounded-lg border border-gray-100 animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Members */}
          <div className="glass-card-strong p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                {t('projects.members.title')}
                {members.length > 0 && (
                  <span className="ml-2 text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {members.length}
                  </span>
                )}
              </h2>
            </div>

            {membersAction.loading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">{t('projects.members.noMembers')}</p>
            ) : (
              <div className="divide-y divide-gray-100/60">
                {members.map((m) => {
                  const u = userMap.get(m.userId);
                  return (
                    <MemberRow
                      key={m.id}
                      member={m}
                      displayName={u?.fullName || u?.username || m.userId}
                      avatarUrl={u?.avatarUrl}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}