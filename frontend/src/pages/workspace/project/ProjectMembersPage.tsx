import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { projectsApi } from '../../../api/projects';
import { teamsApi } from '../../../api/teams';
import { useApiAction } from '../../../hooks/useApiAction';
import { useUserMap } from '../../../hooks/useUserMap';
import { useAuthStore } from '../../../store/authStore';
import { useProjectMember } from '../../../hooks/useProjectMember';
import { buildAvatarSrc } from '../../../utils/avatarUrl';
import Alert from '../../../components/ui/Alert';
import PageTitle from '../../../components/motion/PageTitle';
import type { TeamMember, TeamRole, ScrumRole, Project } from '../../../types';

const PAGE_SIZE = 8;
const SCRUM_ROLES: (ScrumRole | null)[] = [null, 'PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER'];

const TEAM_ROLE_COLOR: Record<TeamRole, { color: string; bg: string }> = {
  ADMIN:  { color: 'var(--accent-text)',   bg: 'var(--accent-muted)' },
  MEMBER: { color: 'var(--success-text)',  bg: 'var(--success-bg)' },
};

const SCRUM_ROLE_COLOR: Record<string, { color: string; bg: string }> = {
  PRODUCT_OWNER: { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
  SCRUM_MASTER:  { color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
  DEVELOPER:     { color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
};

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-faint)',
  textAlign: 'left',
  borderBottom: '1px solid var(--border)',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: 13,
  color: 'var(--text)',
  borderBottom: '1px solid var(--border)',
};

const selectStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500,
  padding: '4px 8px',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  outline: 'none',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  fontSize: 13,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

function Avatar({ name, avatarUrl, size = 36 }: { name: string; avatarUrl?: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const src = buildAvatarSrc(avatarUrl);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
      {src && !imgError ? (
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" onError={() => setImgError(true)} />
      ) : (
        <div style={{
          width: '100%', height: '100%', background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent-fg)', fontSize: size * 0.38, fontWeight: 700,
        }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('workspace.dashboard.justNow');
  if (mins < 60) return t('workspace.dashboard.timeAgo.minutes', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('workspace.dashboard.timeAgo.hours', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('workspace.dashboard.timeAgo.days', { count: days });
  const weeks = Math.floor(days / 7);
  return t('workspace.dashboard.timeAgo.weeks', { count: weeks });
}

export default function ProjectMembersPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const permissions = useProjectMember(projectId);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingScrumId, setUpdatingScrumId] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const membersAction = useApiAction<TeamMember[]>();
  const projectAction = useApiAction<Project>();

  useEffect(() => {
    if (!projectId) return;
    membersAction.run(projectsApi.getTeamMembers(projectId)).then((data) => { if (data) setMembers(data); });
    projectAction.run(projectsApi.getById(projectId)).then((data) => { if (data) setProject(data); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const allUserIds = members.map((m) => m.userId);
  const userMap = useUserMap(allUserIds);

  const displayName = (userId: string) => {
    const u = userMap.get(userId);
    return u?.fullName || u?.username || t('common.unknownUser');
  };

  // Filter
  const filtered = members.filter((m) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const u = userMap.get(m.userId);
      const match = u?.fullName?.toLowerCase().includes(q) || u?.username?.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (roleFilter !== 'all') {
      if (roleFilter === 'ADMIN' || roleFilter === 'MEMBER') {
        if (m.role !== roleFilter) return false;
      } else {
        // Scrum role filter
        if (roleFilter === 'none') {
          if (m.scrumRole) return false;
        } else if (m.scrumRole !== roleFilter) return false;
      }
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageMembers = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const to = Math.min((safePage + 1) * PAGE_SIZE, filtered.length);

  useEffect(() => setPage(0), [searchQuery, roleFilter]);

  const handleScrumRoleChange = async (member: TeamMember, scrumRole: ScrumRole | null) => {
    if (!project?.teamId) return;
    setUpdatingScrumId(member.userId);
    setActionError(null);
    try {
      const res = await teamsApi.updateScrumRole(project.teamId, member.userId, scrumRole);
      setMembers((prev) => prev.map((m) => (m.userId === member.userId ? res.data : m)));
    } catch {
      setActionError(t('projects.members.errors.changeScrumRole'));
    } finally {
      setUpdatingScrumId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {(membersAction.error || actionError) && (
        <Alert type="error" message={membersAction.error ?? actionError!} onClose={() => { membersAction.reset(); setActionError(null); }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PageTitle as="h2" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {t('projects.members.title')}
            </PageTitle>
            {members.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '2px 10px', fontFamily: 'var(--font-mono)' }}>
                {members.length}
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-faint)' }}>
            {t('projects.members.subtitle')}
          </p>
        </div>
        {permissions.isAdmin && project?.teamId && workspaceId && (
          <Link
            to={`/workspaces/${workspaceId}/teams/${project.teamId}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', fontSize: 13, fontWeight: 600,
              background: 'var(--bg-elevated)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              textDecoration: 'none', flexShrink: 0,
              transition: 'background 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
          >
            <Users size={15} strokeWidth={2.5} />
            {t('projects.members.manageTeam')}
            <ExternalLink size={13} strokeWidth={2} style={{ marginLeft: 2 }} />
          </Link>
        )}
      </div>

      {/* Search & filter bar */}
      {!membersAction.loading && members.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)', padding: '12px 16px',
        }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <Search size={15} strokeWidth={2} style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-faint)',
            }} />
            <input
              type="text"
              placeholder={t('projects.members.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 34 }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                padding: '8px 12px', fontSize: 13,
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', color: 'var(--text)',
                cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
              }}
            >
              <option value="all">{t('projects.members.allRoles')}</option>
              <option value="ADMIN">{t('teams.roles.ADMIN')}</option>
              <option value="MEMBER">{t('teams.roles.MEMBER')}</option>
              <option value="PRODUCT_OWNER">{t('projects.members.scrumRoles.PRODUCT_OWNER')}</option>
              <option value="SCRUM_MASTER">{t('projects.members.scrumRoles.SCRUM_MASTER')}</option>
              <option value="DEVELOPER">{t('projects.members.scrumRoles.DEVELOPER')}</option>
            </select>
            {(searchQuery || roleFilter !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setRoleFilter('all'); }}
                style={{
                  padding: '8px 14px', fontSize: 12, fontWeight: 500,
                  background: 'var(--bg)', color: 'var(--text-muted)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', transition: 'background 150ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
              >
                {t('common.clear')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Members table */}
      {membersAction.loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--accent-text)',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : members.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--text-muted)' }}>
            {t('projects.members.noMembers')}
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)', overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: '30%' }}>{t('projects.members.tableHeader.name')}</th>
                  <th style={{ ...thStyle, width: '18%' }}>{t('projects.members.tableHeader.teamRole')}</th>
                  <th style={{ ...thStyle, width: '22%' }}>{t('projects.members.tableHeader.scrumRole')}</th>
                  <th style={{ ...thStyle, width: '30%' }}>{t('projects.members.tableHeader.lastActive')}</th>
                </tr>
              </thead>
              <tbody>
                {pageMembers.map((m) => {
                  const u = userMap.get(m.userId);
                  const name = u?.fullName || u?.username || t('common.unknownUser');
                  const isSelf = m.userId === currentUser?.id;
                  const rc = TEAM_ROLE_COLOR[m.role];
                  const scrumConfig = m.scrumRole ? SCRUM_ROLE_COLOR[m.scrumRole] : null;
                  const isUpdatingScrum = updatingScrumId === m.userId;

                  return (
                    <tr
                      key={m.id}
                      style={{ transition: 'background 150ms' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Name */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar name={name} avatarUrl={u?.avatarUrl} size={38} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {name}
                              </span>
                              {isSelf && (
                                <span style={{
                                  fontSize: 10, color: 'var(--text-faint)',
                                  background: 'var(--bg-hover)', border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius-sm)', padding: '0 5px',
                                }}>
                                  {t('common.you')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Team role (read-only) */}
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                          color: rc.color, background: rc.bg,
                          borderRadius: 'var(--radius-pill)', padding: '3px 10px',
                        }}>
                          {t(`teams.roles.${m.role}`)}
                        </span>
                      </td>

                      {/* Scrum role (read-only, managed from team) */}
                      <td style={tdStyle}>
                        {m.scrumRole && scrumConfig ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: scrumConfig.color, background: scrumConfig.bg, borderRadius: 'var(--radius-pill)', padding: '3px 10px' }}>
                            {t(`projects.members.scrumRoles.${m.scrumRole}`)}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>—</span>
                        )}
                      </td>

                      {/* Last active */}
                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {m.lastActiveAt
                            ? timeAgo(m.lastActiveAt, t)
                            : <span style={{ color: 'var(--text-faint)' }}>—</span>
                          }
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
              {t('projects.members.showing', { from, to, total: filtered.length })}
            </span>
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)',
                    color: 'var(--text-faint)', cursor: safePage === 0 ? 'not-allowed' : 'pointer',
                    opacity: safePage === 0 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => {
                  if (i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 1) {
                    return (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        style={{
                          width: 32, height: 32, fontSize: 12, fontWeight: i === safePage ? 600 : 400,
                          border: i === safePage ? '1px solid var(--accent)' : '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          background: i === safePage ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                          color: i === safePage ? 'var(--accent-text)' : 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        {i + 1}
                      </button>
                    );
                  }
                  if (i === 1 && safePage > 2) return <span key="el1" style={{ padding: '0 4px', color: 'var(--text-faint)', fontSize: 12 }}>...</span>;
                  if (i === totalPages - 2 && safePage < totalPages - 3) return <span key="el2" style={{ padding: '0 4px', color: 'var(--text-faint)', fontSize: 12 }}>...</span>;
                  return null;
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)',
                    color: 'var(--text-faint)', cursor: safePage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                    opacity: safePage >= totalPages - 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}