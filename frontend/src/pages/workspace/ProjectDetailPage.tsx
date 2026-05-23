import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { projectsApi } from '../../api/projects';
import { useApiAction } from '../../hooks/useApiAction';
import { useUserMap } from '../../hooks/useUserMap';
import Alert from '../../components/ui/Alert';
import type { Project, ProjectMember, ProjectRole } from '../../types';

const ROLE_STYLE: Record<ProjectRole, { color: string; bg: string }> = {
  ADMIN:  { color: 'var(--accent)',  bg: 'var(--accent-muted)' },
  MEMBER: { color: '#16a34a',        bg: 'rgba(22,163,74,0.08)' },
  VIEWER: { color: 'var(--text-faint)', bg: 'var(--bg-hover)' },
};

function MemberRow({ member, displayName, avatarUrl }: { member: ProjectMember; displayName: string; avatarUrl?: string }) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const roleStyle = ROLE_STYLE[member.role];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
        {avatarUrl && !imgError ? (
          <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            referrerPolicy="no-referrer" onError={() => setImgError(true)} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
          }}>
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {displayName}
        </p>
        <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--text-faint)' }}>
          {t('common.since', { date: new Date(member.joinedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) })}
        </p>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
        color: roleStyle.color, background: roleStyle.bg,
        borderRadius: 'var(--radius-sm)', padding: '2px 7px', flexShrink: 0,
      }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-faint)' }}>
        <Link
          to={`/workspaces/${workspaceId}`}
          style={{ color: 'var(--text-faint)', textDecoration: 'none', transition: `color var(--duration)` }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
        >
          {t('projects.breadcrumb')}
        </Link>
        <ChevronRight size={12} strokeWidth={2} />
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{project?.name ?? '…'}</span>
      </nav>

      {(projectAction.error || membersAction.error) && (
        <Alert
          type="error"
          message={projectAction.error ?? membersAction.error!}
          onClose={() => { projectAction.reset(); membersAction.reset(); }}
        />
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: 24, height: 24,
            border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : project ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Project header */}
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '16px 18px',
          }}>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {project.name}
            </h1>
            {project.description && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{project.description}</p>
            )}
            <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--text-faint)' }}>
              {t('common.createdAt', { date: new Date(project.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) })}
            </p>
          </div>

          {/* Kanban placeholder */}
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{t('projects.kanban.title')}</h2>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                color: '#d97706', background: 'rgba(217,119,6,0.1)',
                borderRadius: 'var(--radius-sm)', padding: '2px 7px',
              }}>
                {t('common.comingSoon')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {[t('projects.kanban.todo'), t('projects.kanban.inProgress'), t('projects.kanban.done')].map((col) => (
                <div key={col} style={{
                  flexShrink: 0, width: 200,
                  background: 'var(--bg-hover)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: 10,
                }}>
                  <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                    {col}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[1, 2].map((i) => (
                      <div key={i} style={{
                        height: 48, background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', opacity: 0.6,
                      }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Members */}
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                {t('projects.members.title')}
              </h2>
              {members.length > 0 && (
                <span style={{
                  fontSize: 10, color: 'var(--text-faint)', background: 'var(--bg-hover)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  padding: '0 5px', fontFamily: 'var(--font-mono)',
                }}>
                  {members.length}
                </span>
              )}
            </div>

            {membersAction.loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                <div style={{ width: 18, height: 18, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              </div>
            ) : members.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '24px 0' }}>
                {t('projects.members.noMembers')}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {members.map((m, idx) => {
                  const u = userMap.get(m.userId);
                  return (
                    <div key={m.id} style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                      <MemberRow
                        member={m}
                        displayName={u?.fullName || u?.username || t('common.unknownUser')}
                        avatarUrl={u?.avatarUrl}
                      />
                    </div>
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