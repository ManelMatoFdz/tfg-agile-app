import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Plus, Pencil, ArrowLeftRight, UserMinus, LogOut, Trash2, Users, X, FolderOpen, Gauge } from 'lucide-react';
import { teamsApi } from '../../api/teams';
import { projectsApi } from '../../api/projects';
import { sprintsApi } from '../../api/sprints';
import { workspacesApi } from '../../api/workspaces';
import { useApiAction } from '../../hooks/useApiAction';
import { useUserMap } from '../../hooks/useUserMap';
import { useAuthStore } from '../../store/authStore';
import { buildAvatarSrc } from '../../utils/avatarUrl';
import Alert from '../../components/ui/Alert';
import PageTitle from '../../components/motion/PageTitle';
import type { Team, TeamMember, TeamRole, ScrumRole, UserSummary } from '../../types';

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-faint)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  textAlign: 'left',
  borderBottom: '1px solid var(--border)',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 13,
  color: 'var(--text)',
  borderBottom: '1px solid var(--border)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 13,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 6,
};

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  background: 'rgba(0,0,0,0.5)',
};

const modalCard: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-card)',
  padding: 24,
  width: '100%',
  maxWidth: 440,
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 20px',
  fontSize: 13,
  fontWeight: 500,
  background: 'var(--accent)',
  color: 'var(--accent-fg)',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 500,
  background: 'transparent',
  color: 'var(--text-muted)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
};

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6d28d9', '#475569', '#1e293b',
];

const DEFAULT_COLOR = '#6366f1';

function getTeamColors(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem('teamColors') || '{}');
  } catch { return {}; }
}

function setTeamColorStorage(teamId: string, color: string) {
  const colors = getTeamColors();
  colors[teamId] = color;
  localStorage.setItem('teamColors', JSON.stringify(colors));
}

function Avatar({ name, avatarUrl, size = 32 }: { name: string; avatarUrl?: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const src = buildAvatarSrc(avatarUrl);
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {src && !imgError ? (
        <img
          src={src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent-fg)', fontSize: size * 0.38, fontWeight: 700,
        }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: TeamRole }) {
  const { t } = useTranslation();
  const isAdmin = role === 'ADMIN';
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      color: isAdmin ? 'var(--accent)' : 'var(--text-faint)',
      background: isAdmin ? 'var(--accent-muted)' : 'var(--bg-hover)',
      border: `1px solid ${isAdmin ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-sm)',
      padding: '2px 8px',
    }}>
      {t(`teams.detail.roles.${role}`)}
    </span>
  );
}

export default function TeamDetailPage() {
  const { t } = useTranslation();
  const { workspaceId, teamId } = useParams<{ workspaceId: string; teamId: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [team, setTeam] = useState<Team | null>(null);
  const [teamColor, setTeamColor] = useState(DEFAULT_COLOR);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [workspaceMemberIds, setWorkspaceMemberIds] = useState<string[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [search, setSearch] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmRoleChange, setConfirmRoleChange] = useState<{ userId: string; newRole: TeamRole } | null>(null);
  const [activeProjectsCount, setActiveProjectsCount] = useState<number | null>(null);
  const [avgVelocity, setAvgVelocity] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState(DEFAULT_COLOR);

  const teamAction = useApiAction<Team>();
  const membersAction = useApiAction<TeamMember[]>();
  const addAction = useApiAction<TeamMember>();
  const deleteAction = useApiAction<void>();
  const leaveAction = useApiAction<void>();
  const roleChangeAction = useApiAction<TeamMember>();
  const editAction = useApiAction<Team>();

  const allTrackedIds = [...new Set([...members.map((m) => m.userId), ...workspaceMemberIds])];
  const userMap = useUserMap(allTrackedIds);

  useEffect(() => {
    if (!teamId || !workspaceId) return;
    const colors = getTeamColors();
    if (teamId && colors[teamId]) setTeamColor(colors[teamId]);

    teamAction.run(teamsApi.getById(teamId)).then((data) => {
      if (data) setTeam(data);
    });
    membersAction.run(teamsApi.getMembers(teamId)).then((data) => {
      if (data) {
        setMembers(data);
        const myMember = data.find((m) => m.userId === currentUser?.id);
        if (myMember?.role === 'ADMIN') setCanManage(true);
      }
    });
    workspacesApi.getMembers(workspaceId).then((res) => {
      setWorkspaceMemberIds(res.data.map((m) => m.userId));
      const isWorkspaceAdmin = res.data.some((m) => m.userId === currentUser?.id && m.role === 'ADMIN');
      if (isWorkspaceAdmin) setCanManage(true);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, workspaceId]);

  // Fetch team statistics: active projects & average velocity
  useEffect(() => {
    if (!workspaceId || !teamId) return;

    (async () => {
      try {
        const projects = (await projectsApi.list(workspaceId)).data;
        // Find projects assigned to this team via team_id
        const teamProjectsList = projects.filter((p) => p.teamId === teamId);
        const projectIds = teamProjectsList.map((p) => p.id);
        setActiveProjectsCount(teamProjectsList.length);

        // Calculate average velocity from completed sprints across team projects
        const allCompletedSprints: { doneStoryPoints: number }[] = [];
        await Promise.all(
          projectIds.map(async (pid) => {
            try {
              const sprints = await sprintsApi.listSprints(pid);
              sprints
                .filter((s) => s.status === 'COMPLETED' && s.closedDoneStoryPoints != null)
                .forEach((s) => allCompletedSprints.push({ doneStoryPoints: s.closedDoneStoryPoints! }));
            } catch { /* ignore */ }
          }),
        );
        if (allCompletedSprints.length > 0) {
          const total = allCompletedSprints.reduce((sum, s) => sum + s.doneStoryPoints, 0);
          setAvgVelocity(Math.round((total / allCompletedSprints.length) * 10) / 10);
        } else {
          setAvgVelocity(0);
        }
      } catch {
        setActiveProjectsCount(0);
        setAvgVelocity(0);
      }
    })();
  }, [workspaceId, teamId]);

  const teamMemberSet = new Set(members.map((m) => m.userId));

  const candidates = workspaceMemberIds
    .filter((uid) => !teamMemberSet.has(uid))
    .map((uid) => userMap.get(uid))
    .filter((u): u is UserSummary => u !== undefined)
    .filter((u) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (u.username?.toLowerCase().includes(q) || u.fullName?.toLowerCase().includes(q));
    });

  const handleAddMember = async (userId: string) => {
    if (!teamId) return;
    const data = await addAction.run(teamsApi.addMember(teamId, userId));
    if (data) {
      setMembers((prev) => [...prev, data]);
      setSearch('');
      setShowAddMember(false);
      addAction.reset();
    }
  };

  const handleRemoveMember = async () => {
    if (!teamId || !confirmRemoveId) return;
    setRemovingId(confirmRemoveId);
    setConfirmRemoveId(null);
    try {
      await teamsApi.removeMember(teamId, confirmRemoveId);
      setMembers((prev) => prev.filter((m) => m.userId !== confirmRemoveId));
    } catch {
      // ignore
    } finally {
      setRemovingId(null);
    }
  };

  const handleRoleChange = async () => {
    if (!teamId || !confirmRoleChange) return;
    const { userId, newRole } = confirmRoleChange;
    const updated = await roleChangeAction.run(teamsApi.updateMemberRole(teamId, userId, newRole));
    if (updated) {
      setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, role: updated.role } : m));
      setConfirmRoleChange(null);
      roleChangeAction.reset();
    }
  };

  const handleScrumRoleChange = async (userId: string, scrumRole: ScrumRole | null) => {
    if (!teamId) return;
    try {
      await teamsApi.updateScrumRole(teamId, userId, scrumRole);
      setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, scrumRole } : m));
    } catch {
      // ignore
    }
  };

  const isCurrentUserMember = members.some((m) => m.userId === currentUser?.id);

  const handleDeleteTeam = async () => {
    if (!teamId) return;
    await deleteAction.run(teamsApi.delete(teamId));
    navigate(`/workspaces/${workspaceId}/teams`);
  };

  const handleLeaveTeam = async () => {
    if (!teamId) return;
    const result = await leaveAction.run(teamsApi.leaveTeam(teamId));
    if (result !== null) {
      navigate(`/workspaces/${workspaceId}/teams`);
    }
  };

  const openEditModal = () => {
    if (!team) return;
    setEditName(team.name);
    setEditDescription(team.description || '');
    setEditColor(teamColor);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!teamId) return;
    const data = await editAction.run(
      teamsApi.update(teamId, { name: editName, description: editDescription || undefined }),
    );
    if (data) {
      setTeam(data);
      setTeamColorStorage(teamId, editColor);
      setTeamColor(editColor);
      setShowEditModal(false);
      editAction.reset();
    }
  };

  const getDisplayName = (userId: string) => {
    const u = userMap.get(userId);
    return u?.fullName || u?.username || t('common.unknownUser');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Link
          to={`/workspaces/${workspaceId}/teams`}
          style={{ fontSize: 13, color: 'var(--text-faint)', textDecoration: 'none', transition: `color var(--duration)` }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
        >
          {t('teams.detail.breadcrumb')}
        </Link>
        <ChevronRight size={12} strokeWidth={2} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {team?.name ?? '...'}
        </span>
      </nav>

      {teamAction.error && (
        <Alert type="error" message={teamAction.error} onClose={teamAction.reset} />
      )}

      {teamAction.loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: 24, height: 24,
            border: '2px solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : team ? (
        <>
          {/* Team header card */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 52, height: 52,
                  background: teamColor,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 22, fontWeight: 700, flexShrink: 0,
                }}>
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <PageTitle style={{ fontSize: 22 }}>
                    {team.name}
                  </PageTitle>
                  {team.description && (
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{team.description}</p>
                  )}
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
                    {t('common.createdAt', {
                      date: new Date(team.createdAt).toLocaleDateString(undefined, {
                        day: 'numeric', month: 'long', year: 'numeric',
                      }),
                    })}
                    {' · '}
                    {t('teams.member', { count: members.length })}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {canManage && (
                  <button
                    onClick={openEditModal}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 14px', fontSize: 13, fontWeight: 500,
                      background: 'var(--bg-hover)', color: 'var(--text)',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                      cursor: 'pointer', transition: 'border-color var(--duration)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <Pencil size={13} strokeWidth={2} />
                    {t('teams.detail.editTeam')}
                  </button>
                )}
                {isCurrentUserMember && (
                  <button
                    onClick={() => setShowLeaveConfirm(true)}
                    title={t('teams.detail.leaveTeam')}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 34, height: 34, border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-hover)', color: 'var(--text-faint)',
                      cursor: 'pointer',
                      transition: `background var(--duration), color var(--duration)`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--warning-bg)'; e.currentTarget.style.color = 'var(--warning)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-faint)'; }}
                  >
                    <LogOut size={14} strokeWidth={2} />
                  </button>
                )}
                {canManage && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    title={t('teams.detail.delete')}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 34, height: 34, border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-hover)', color: 'var(--text-faint)',
                      cursor: 'pointer',
                      transition: `background var(--duration), color var(--duration)`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-faint)'; }}
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Team Statistics */}
          {members.length > 0 && (
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)',
              padding: 24,
            }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {t('teams.detail.statistics')}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  {
                    icon: <Users size={18} strokeWidth={2} />,
                    label: t('teams.detail.totalMembers'),
                    value: members.length,
                    color: 'var(--accent)',
                    bg: 'var(--accent-muted)',
                  },
                  {
                    icon: <FolderOpen size={18} strokeWidth={2} />,
                    label: t('teams.detail.activeProjects'),
                    value: activeProjectsCount,
                    color: 'var(--purple)',
                    bg: 'var(--purple-soft)',
                  },
                  {
                    icon: <Gauge size={18} strokeWidth={2} />,
                    label: t('teams.detail.avgVelocity'),
                    value: avgVelocity,
                    suffix: ' SP',
                    color: 'var(--green)',
                    bg: 'var(--green-soft)',
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      background: stat.bg,
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <div style={{ color: stat.color, opacity: 0.7 }}>{stat.icon}</div>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: stat.color, lineHeight: 1 }}>
                      {stat.value != null ? `${stat.value}${'suffix' in stat && stat.suffix ? stat.suffix : ''}` : '—'}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members section */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            overflow: 'hidden',
          }}>
            {/* Members header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  {t('teams.detail.members')}
                </h2>
                {members.length > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 500, color: 'var(--text-faint)',
                    background: 'var(--bg-hover)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '1px 6px',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {members.length}
                  </span>
                )}
              </div>
              {canManage && !showAddMember && (
                <button
                  onClick={() => setShowAddMember(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', fontSize: 12, fontWeight: 500,
                    background: 'var(--accent)', color: 'var(--accent-fg)',
                    border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
                >
                  <Plus size={12} strokeWidth={2.5} />
                  {t('teams.detail.addMember')}
                </button>
              )}
            </div>

            {/* Add member picker */}
            {showAddMember && (
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                {addAction.error && <Alert type="error" message={addAction.error} onClose={addAction.reset} />}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    placeholder={t('teams.detail.searchPlaceholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  />
                  <button
                    onClick={() => { setShowAddMember(false); setSearch(''); addAction.reset(); }}
                    style={btnSecondary}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
                <div style={{
                  marginTop: 6, maxHeight: 200, overflowY: 'auto',
                  border: candidates.length > 0 ? '1px solid var(--border)' : 'none',
                  borderRadius: 'var(--radius-md)',
                }}>
                  {addAction.loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                      <div style={{
                        width: 16, height: 16,
                        border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
                        borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                      }} />
                    </div>
                  ) : candidates.length === 0 ? (
                    <p style={{ margin: 0, padding: '12px 0', fontSize: 12, color: 'var(--text-faint)', textAlign: 'center' }}>
                      {t('teams.detail.noResults')}
                    </p>
                  ) : (
                    candidates.map((u, idx) => (
                      <button
                        key={u.id}
                        onClick={() => handleAddMember(u.id)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px', background: 'transparent', border: 'none',
                          borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                          textAlign: 'left', cursor: 'pointer', transition: `background var(--duration)`,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Avatar name={u.fullName || u.username} avatarUrl={u.avatarUrl} size={28} />
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                            {u.fullName || u.username}
                          </p>
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)' }}>@{u.username}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Members table */}
            {membersAction.loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <div style={{
                  width: 20, height: 20,
                  border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
                  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                }} />
              </div>
            ) : members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Users size={28} strokeWidth={1.5} style={{ color: 'var(--text-faint)', marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>{t('teams.detail.noMembers')}</p>
                {canManage && !showAddMember && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    style={{
                      marginTop: 12, fontSize: 12, fontWeight: 500, color: 'var(--accent)',
                      background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  >
                    {t('teams.detail.addFirst')}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: canManage ? '25%' : '30%' }}>{t('teams.detail.members')}</th>
                      <th style={{ ...thStyle, width: '15%' }}>{t('teams.detail.role')}</th>
                      <th style={{ ...thStyle, width: '20%' }}>{t('teams.detail.scrumRole')}</th>
                      <th style={{ ...thStyle, width: '20%' }}>{t('teams.detail.joined')}</th>
                      {canManage && <th style={{ ...thStyle, width: '20%' }}>{t('teams.detail.actions')}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => {
                      const user = userMap.get(m.userId);
                      const displayName = user?.fullName || user?.username || t('common.unknownUser');
                      const isSelf = m.userId === currentUser?.id;
                      return (
                        <MemberTableRow
                          key={m.id}
                          member={m}
                          user={user}
                          displayName={displayName}
                          isSelf={isSelf}
                          canManage={canManage}
                          removing={removingId === m.userId}
                          onRemove={() => setConfirmRemoveId(m.userId)}
                          onChangeRole={() => setConfirmRoleChange({
                            userId: m.userId,
                            newRole: m.role === 'ADMIN' ? 'MEMBER' : 'ADMIN',
                          })}
                          onScrumRoleChange={(scrumRole) => handleScrumRoleChange(m.userId, scrumRole)}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Edit team modal */}
      {showEditModal && (
        <div style={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) { setShowEditModal(false); editAction.reset(); } }}>
          <div style={modalCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                {t('teams.detail.editTitle')}
              </h2>
              <button
                onClick={() => { setShowEditModal(false); editAction.reset(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {editAction.error && (
              <div style={{ marginBottom: 16 }}>
                <Alert type="error" message={editAction.error} onClose={editAction.reset} />
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>{t('teams.form.name')}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  autoFocus
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  {t('teams.form.description', { optional: t('common.optional') })}
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>

              {/* Color picker */}
              <div>
                <label style={labelStyle}>{t('workspace.settings.categories.modal.colorLabel')}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      style={{
                        width: 24, height: 24,
                        borderRadius: 'var(--radius-sm)',
                        background: c,
                        border: editColor === c ? '2px solid var(--text)' : '2px solid transparent',
                        cursor: 'pointer',
                        padding: 0,
                        outline: editColor === c ? '2px solid var(--bg-elevated)' : 'none',
                        outlineOffset: -4,
                      }}
                    />
                  ))}
                </div>
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                    background: editColor, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700,
                  }}>
                    {editName.trim() ? editName.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                    {editColor}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, paddingTop: 4, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); editAction.reset(); }}
                  style={btnSecondary}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={editAction.loading || !editName.trim()}
                  style={{
                    ...btnPrimary,
                    opacity: editAction.loading || !editName.trim() ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { if (!editAction.loading && editName.trim()) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
                >
                  {editAction.loading ? '...' : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave team confirm */}
      {showLeaveConfirm && (
        <div style={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) { setShowLeaveConfirm(false); leaveAction.reset(); } }}>
          <div style={modalCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 40, height: 40,
                background: 'var(--warning-bg)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <LogOut size={18} strokeWidth={2} style={{ color: 'var(--warning)' }} />
              </div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                {t('teams.detail.confirmLeave.title')}
              </h2>
            </div>
            <p
              style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}
              dangerouslySetInnerHTML={{ __html: t('teams.detail.confirmLeave.message', { name: team?.name ?? '' }) }}
            />
            {leaveAction.error && (
              <div style={{ marginBottom: 12 }}>
                <Alert type="error" message={leaveAction.error} onClose={leaveAction.reset} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btnSecondary} onClick={() => { setShowLeaveConfirm(false); leaveAction.reset(); }}>
                {t('common.cancel')}
              </button>
              <button
                style={{ ...btnPrimary, background: 'var(--danger)', opacity: leaveAction.loading ? 0.7 : 1 }}
                disabled={leaveAction.loading}
                onClick={handleLeaveTeam}
              >
                {t('teams.detail.confirmLeave.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete team confirm */}
      {showDeleteConfirm && (
        <div style={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}>
          <div style={modalCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 40, height: 40,
                background: 'var(--danger-bg)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Trash2 size={18} strokeWidth={2} style={{ color: 'var(--danger)' }} />
              </div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                {t('teams.detail.deleteConfirm.title')}
              </h2>
            </div>
            <p
              style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}
              dangerouslySetInnerHTML={{ __html: t('teams.detail.deleteConfirm.message', { name: team?.name ?? '' }) }}
            />
            {deleteAction.error && (
              <div style={{ marginBottom: 12 }}>
                <Alert type="error" message={deleteAction.error} onClose={deleteAction.reset} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btnSecondary} onClick={() => setShowDeleteConfirm(false)}>
                {t('common.cancel')}
              </button>
              <button
                style={{ ...btnPrimary, background: 'var(--danger)', opacity: deleteAction.loading ? 0.7 : 1 }}
                disabled={deleteAction.loading}
                onClick={handleDeleteTeam}
              >
                {t('teams.detail.deleteConfirm.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove member confirm */}
      {confirmRemoveId && (
        <div style={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setConfirmRemoveId(null); }}>
          <div style={modalCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 40, height: 40,
                background: 'var(--danger-bg)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <UserMinus size={18} strokeWidth={2} style={{ color: 'var(--danger)' }} />
              </div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                {t('teams.detail.confirmRemove.title')}
              </h2>
            </div>
            <p
              style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}
              dangerouslySetInnerHTML={{ __html: t('teams.detail.confirmRemove.message', { name: getDisplayName(confirmRemoveId) }) }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btnSecondary} onClick={() => setConfirmRemoveId(null)}>
                {t('common.cancel')}
              </button>
              <button
                style={{ ...btnPrimary, background: 'var(--danger)' }}
                onClick={handleRemoveMember}
              >
                {t('teams.detail.confirmRemove.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role change confirm */}
      {confirmRoleChange && (
        <div style={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) { setConfirmRoleChange(null); roleChangeAction.reset(); } }}>
          <div style={modalCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 40, height: 40,
                background: 'var(--accent-muted)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <ArrowLeftRight size={18} strokeWidth={2} style={{ color: 'var(--accent)' }} />
              </div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                {t('teams.detail.confirmRoleChange.title')}
              </h2>
            </div>
            <p
              style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}
              dangerouslySetInnerHTML={{
                __html: confirmRoleChange.newRole === 'ADMIN'
                  ? t('teams.detail.confirmRoleChange.messageToAdmin', { name: getDisplayName(confirmRoleChange.userId) })
                  : t('teams.detail.confirmRoleChange.messageToMember', { name: getDisplayName(confirmRoleChange.userId) }),
              }}
            />
            {roleChangeAction.error && (
              <div style={{ marginBottom: 12 }}>
                <Alert type="error" message={roleChangeAction.error} onClose={roleChangeAction.reset} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btnSecondary} onClick={() => { setConfirmRoleChange(null); roleChangeAction.reset(); }}>
                {t('common.cancel')}
              </button>
              <button
                style={{ ...btnPrimary, opacity: roleChangeAction.loading ? 0.7 : 1 }}
                disabled={roleChangeAction.loading}
                onClick={handleRoleChange}
              >
                {t('teams.detail.confirmRoleChange.submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SCRUM_ROLES: (ScrumRole | null)[] = [null, 'PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER'];
const SCRUM_ROLE_COLOR: Record<string, string> = {
  PRODUCT_OWNER: '#7C3AED',
  SCRUM_MASTER:  '#D97706',
  DEVELOPER:     '#2563EB',
};

function ScrumRoleBadge({ scrumRole }: { scrumRole?: ScrumRole | null }) {
  const { t } = useTranslation();
  if (!scrumRole) {
    return (
      <span style={{
        fontSize: 11, fontWeight: 500,
        color: 'var(--text-faint)',
        fontStyle: 'italic',
      }}>
        {t('teams.detail.scrumRoleNone')}
      </span>
    );
  }
  const colorMap: Record<ScrumRole, { color: string; bg: string }> = {
    PRODUCT_OWNER: { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
    SCRUM_MASTER:  { color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
    DEVELOPER:     { color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
  };
  const { color, bg } = colorMap[scrumRole];
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      color, background: bg,
      borderRadius: 'var(--radius-pill)',
      padding: '3px 10px',
    }}>
      {t(`projects.members.scrumRoles.${scrumRole}`)}
    </span>
  );
}

function MemberTableRow({ member, user, displayName, isSelf, canManage, removing, onRemove, onChangeRole, onScrumRoleChange }: {
  member: TeamMember;
  user?: UserSummary;
  displayName: string;
  isSelf: boolean;
  canManage: boolean;
  removing: boolean;
  onRemove: () => void;
  onChangeRole: () => void;
  onScrumRoleChange: (scrumRole: ScrumRole | null) => void;
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      style={{ background: hovered ? 'var(--bg-hover)' : 'transparent', transition: 'background var(--duration)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Member info */}
      <td style={tdStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={displayName} avatarUrl={user?.avatarUrl} size={32} />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {displayName}
              {isSelf && (
                <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-faint)' }}>({t('common.you')})</span>
              )}
            </p>
            {user?.username && (
              <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-faint)' }}>@{user.username}</p>
            )}
          </div>
        </div>
      </td>

      {/* Role */}
      <td style={tdStyle}>
        <RoleBadge role={member.role} />
      </td>

      {/* Scrum Role */}
      <td style={tdStyle}>
        {canManage ? (
          <select
            value={member.scrumRole || ''}
            onChange={(e) => {
              const val = e.target.value;
              onScrumRoleChange(val ? val as ScrumRole : null);
            }}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 8px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: member.scrumRole ? SCRUM_ROLE_COLOR[member.scrumRole] : 'var(--text-faint)',
              cursor: 'pointer',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            {SCRUM_ROLES.map((r) => (
              <option key={r ?? 'none'} value={r ?? ''}>
                {r ? t(`projects.members.scrumRoles.${r}`) : t('teams.detail.scrumRoleNone')}
              </option>
            ))}
          </select>
        ) : (
          <ScrumRoleBadge scrumRole={member.scrumRole} />
        )}
      </td>

      {/* Joined */}
      <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text-faint)' }}>
        {new Date(member.joinedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>

      {/* Actions */}
      {canManage && (
        <td style={tdStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={onChangeRole}
              disabled={removing}
              title={member.role === 'ADMIN' ? t('teams.detail.demoteToMember') : t('teams.detail.promoteToAdmin')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg)', color: 'var(--text-faint)',
                cursor: removing ? 'not-allowed' : 'pointer',
                transition: 'background var(--duration), color var(--duration), border-color var(--duration)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-muted)'; e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <ArrowLeftRight size={13} strokeWidth={2} />
            </button>
            {!isSelf && (
              <button
                onClick={onRemove}
                disabled={removing}
                title={t('teams.detail.removeMember')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg)', color: 'var(--text-faint)',
                  cursor: removing ? 'not-allowed' : 'pointer',
                  transition: 'background var(--duration), color var(--duration), border-color var(--duration)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                {removing ? (
                  <div style={{
                    width: 11, height: 11,
                    border: '2px solid var(--border)', borderTopColor: 'var(--danger)',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                  }} />
                ) : (
                  <UserMinus size={13} strokeWidth={2} />
                )}
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}