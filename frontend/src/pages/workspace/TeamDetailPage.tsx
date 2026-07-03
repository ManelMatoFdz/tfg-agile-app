import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Plus, ArrowLeftRight, UserMinus, LogOut, Trash2, Users } from 'lucide-react';
import { teamsApi } from '../../api/teams';
import { workspacesApi } from '../../api/workspaces';
import { useApiAction } from '../../hooks/useApiAction';
import { useUserMap } from '../../hooks/useUserMap';
import { useAuthStore } from '../../store/authStore';
import Alert from '../../components/ui/Alert';
import PageTitle from '../../components/motion/PageTitle';
import type { Team, TeamMember, TeamRole, UserSummary } from '../../types';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  fontSize: 12,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
};

const modalBg: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundColor: 'var(--bg-overlay)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  animation: 'fade-in 200ms ease both',
};

const modalCard: React.CSSProperties = {
  position: 'relative',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: 20,
  width: '100%',
  maxWidth: 360,
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
};

const btnPrimary: React.CSSProperties = {
  flex: 1,
  padding: '7px 14px',
  fontSize: 12,
  fontWeight: 500,
  background: 'var(--accent)',
  color: 'var(--accent-fg)',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  flex: 1,
  padding: '7px 14px',
  fontSize: 12,
  fontWeight: 500,
  background: 'var(--bg-hover)',
  color: 'var(--text-muted)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
};

function Avatar({ name, avatarUrl, size = 32 }: { name: string; avatarUrl?: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {avatarUrl && !imgError ? (
        <img
          src={avatarUrl}
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
      fontSize: 10,
      fontWeight: 600,
      color: isAdmin ? 'var(--accent)' : 'var(--text-faint)',
      background: isAdmin ? 'var(--accent-muted)' : 'var(--bg-hover)',
      border: `1px solid ${isAdmin ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-sm)',
      padding: '1px 6px',
      letterSpacing: '0.03em',
    }}>
      {t(`teams.detail.roles.${role}`)}
    </span>
  );
}

function MemberRow({
  member,
  user,
  canManage,
  isSelf,
  onRemove,
  onChangeRole,
  removing,
}: {
  member: TeamMember;
  user?: UserSummary;
  canManage: boolean;
  isSelf: boolean;
  onRemove: (userId: string) => void;
  onChangeRole: (userId: string, newRole: TeamRole) => void;
  removing: boolean;
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const newRole: TeamRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
  const displayName = user?.fullName || user?.username || t('common.unknownUser');

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
        borderRadius: 'var(--radius-sm)',
        transition: `background var(--duration)`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name={displayName} avatarUrl={user?.avatarUrl} size={32} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{displayName}</span>
            <RoleBadge role={member.role} />
          </div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)' }}>
            {t('common.since', {
              date: new Date(member.joinedAt).toLocaleDateString(undefined, {
                day: 'numeric', month: 'short', year: 'numeric',
              }),
            })}
          </p>
        </div>
      </div>

      {canManage && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          opacity: hovered ? 1 : 0,
          transition: `opacity var(--duration)`,
        }}>
          <button
            onClick={() => onChangeRole(member.userId, newRole)}
            disabled={removing}
            title={member.role === 'ADMIN' ? t('teams.detail.demoteToMember') : t('teams.detail.promoteToAdmin')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26, border: 'none', borderRadius: 'var(--radius-sm)',
              background: 'transparent', color: 'var(--text-faint)',
              cursor: removing ? 'not-allowed' : 'pointer',
              transition: `background var(--duration), color var(--duration)`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-muted)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)'; }}
          >
            <ArrowLeftRight size={12} strokeWidth={2} />
          </button>
          {!isSelf && (
            <button
              onClick={() => onRemove(member.userId)}
              disabled={removing}
              title={t('teams.detail.removeMember')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 26, height: 26, border: 'none', borderRadius: 'var(--radius-sm)',
                background: 'transparent', color: 'var(--text-faint)',
                cursor: removing ? 'not-allowed' : 'pointer',
                transition: `background var(--duration), color var(--duration)`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)'; }}
            >
              {removing ? (
                <div style={{
                  width: 10, height: 10,
                  border: '2px solid var(--border)',
                  borderTopColor: 'var(--danger)',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
              ) : (
                <UserMinus size={12} strokeWidth={2} />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MemberPicker({
  candidates,
  search,
  onSearch,
  onSelect,
  onCancel,
  loading,
  error,
  onErrorClose,
}: {
  candidates: UserSummary[];
  search: string;
  onSearch: (v: string) => void;
  onSelect: (userId: string) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
  onErrorClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div style={{ marginBottom: 12 }}>
      {error && <Alert type="error" message={error} onClose={onErrorClose} />}
      <input
        placeholder={t('teams.detail.searchPlaceholder')}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        autoFocus
        style={inputStyle}
      />
      <div style={{
        marginTop: 4,
        maxHeight: 200,
        overflowY: 'auto',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
            <div style={{
              width: 16, height: 16,
              border: '2px solid var(--border)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }} />
          </div>
        ) : candidates.length === 0 ? (
          <p style={{ margin: 0, padding: '14px 12px', fontSize: 12, color: 'var(--text-faint)', textAlign: 'center' }}>
            {t('teams.detail.noResults')}
          </p>
        ) : (
          candidates.map((u, idx) => (
            <button
              key={u.id}
              onClick={() => onSelect(u.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 10px',
                background: 'transparent',
                border: 'none',
                borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                textAlign: 'left',
                cursor: 'pointer',
                transition: `background var(--duration)`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Avatar name={u.fullName || u.username} avatarUrl={u.avatarUrl} size={28} />
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
                  {u.fullName || u.username}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)' }}>@{u.username}</p>
              </div>
            </button>
          ))
        )}
      </div>
      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ ...btnSecondary, flex: 'none', padding: '5px 12px' }}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

export default function TeamDetailPage() {
  const { t } = useTranslation();
  const { workspaceId, teamId } = useParams<{ workspaceId: string; teamId: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [team, setTeam] = useState<Team | null>(null);
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

  const teamAction = useApiAction<Team>();
  const membersAction = useApiAction<TeamMember[]>();
  const addAction = useApiAction<TeamMember>();
  const deleteAction = useApiAction<void>();
  const leaveAction = useApiAction<void>();
  const roleChangeAction = useApiAction<TeamMember>();

  const allTrackedIds = [...new Set([...members.map((m) => m.userId), ...workspaceMemberIds])];
  const userMap = useUserMap(allTrackedIds);

  useEffect(() => {
    if (!teamId || !workspaceId) return;
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

  const getDisplayName = (userId: string) => {
    const u = userMap.get(userId);
    return u?.fullName || u?.username || t('common.unknownUser');
  };

  return (
    <div>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
        <Link
          to={`/workspaces/${workspaceId}/teams`}
          style={{ fontSize: 12, color: 'var(--text-faint)', textDecoration: 'none', transition: `color var(--duration)` }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
        >
          {t('teams.detail.breadcrumb')}
        </Link>
        <ChevronRight size={12} strokeWidth={2} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {team?.name ?? '…'}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Team header */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44,
                  background: 'var(--accent)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent-fg)', fontSize: 20, fontWeight: 700, flexShrink: 0,
                }}>
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <PageTitle style={{ fontSize: 24 }}>
                    {team.name}
                  </PageTitle>
                  {team.description && (
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{team.description}</p>
                  )}
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                    {t('common.createdAt', {
                      date: new Date(team.createdAt).toLocaleDateString(undefined, {
                        day: 'numeric', month: 'long', year: 'numeric',
                      }),
                    })}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {isCurrentUserMember && (
                  <button
                    onClick={() => setShowLeaveConfirm(true)}
                    title={t('teams.detail.leaveTeam')}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 30, height: 30, border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent', color: 'var(--text-faint)',
                      cursor: 'pointer',
                      transition: `background var(--duration), color var(--duration)`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ochre-soft)'; e.currentTarget.style.color = 'var(--ochre)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)'; }}
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
                      width: 30, height: 30, border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent', color: 'var(--text-faint)',
                      cursor: 'pointer',
                      transition: `background var(--duration), color var(--duration)`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)'; }}
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Members */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                  {t('teams.detail.members')}
                </h2>
                {members.length > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: 'var(--text-faint)',
                    background: 'var(--bg-hover)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '1px 5px',
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
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 500, color: 'var(--accent)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '3px 6px', borderRadius: 'var(--radius-sm)',
                    transition: `background var(--duration)`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-muted)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <Plus size={11} strokeWidth={2.5} />
                  {t('teams.detail.addMember')}
                </button>
              )}
            </div>

            {showAddMember && (
              <MemberPicker
                candidates={candidates}
                search={search}
                onSearch={setSearch}
                onSelect={handleAddMember}
                onCancel={() => { setShowAddMember(false); setSearch(''); addAction.reset(); }}
                loading={addAction.loading}
                error={addAction.error}
                onErrorClose={addAction.reset}
              />
            )}

            {membersAction.loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                <div style={{
                  width: 18, height: 18,
                  border: '2px solid var(--border)',
                  borderTopColor: 'var(--accent)',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
              </div>
            ) : members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Users size={24} strokeWidth={1.5} style={{ color: 'var(--text-faint)', marginBottom: 6 }} />
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)' }}>{t('teams.detail.noMembers')}</p>
                {canManage && !showAddMember && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    style={{
                      marginTop: 8, fontSize: 11, fontWeight: 500, color: 'var(--accent)',
                      background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  >
                    {t('teams.detail.addFirst')}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {members.map((m) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    user={userMap.get(m.userId)}
                    canManage={canManage}
                    isSelf={m.userId === currentUser?.id}
                    onRemove={(userId) => setConfirmRemoveId(userId)}
                    onChangeRole={(userId, newRole) => setConfirmRoleChange({ userId, newRole })}
                    removing={removingId === m.userId}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Leave team confirm */}
      {showLeaveConfirm && (
        <div style={modalOverlay}>
          <div style={modalBg} onClick={() => { setShowLeaveConfirm(false); leaveAction.reset(); }} />
          <div style={modalCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36,
                background: 'var(--ochre-soft)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <LogOut size={16} strokeWidth={2} style={{ color: 'var(--ochre)' }} />
              </div>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {t('teams.detail.confirmLeave.title')}
              </h2>
            </div>
            <p
              style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-muted)' }}
              dangerouslySetInnerHTML={{ __html: t('teams.detail.confirmLeave.message', { name: team?.name ?? '' }) }}
            />
            {leaveAction.error && (
              <Alert type="error" message={leaveAction.error} onClose={leaveAction.reset} />
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{
                  ...btnPrimary,
                  background: 'var(--danger)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: leaveAction.loading ? 0.7 : 1,
                  cursor: leaveAction.loading ? 'not-allowed' : 'pointer',
                }}
                disabled={leaveAction.loading}
                onClick={handleLeaveTeam}
              >
                {leaveAction.loading && (
                  <div style={{
                    width: 10, height: 10,
                    border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'var(--accent-fg)',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                  }} />
                )}
                {t('teams.detail.confirmLeave.submit')}
              </button>
              <button
                style={btnSecondary}
                onClick={() => { setShowLeaveConfirm(false); leaveAction.reset(); }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete team confirm */}
      {showDeleteConfirm && (
        <div style={modalOverlay}>
          <div style={modalBg} onClick={() => setShowDeleteConfirm(false)} />
          <div style={modalCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 36, height: 36,
                background: 'var(--danger-bg)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Trash2 size={16} strokeWidth={2} style={{ color: 'var(--danger)' }} />
              </div>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {t('teams.detail.deleteConfirm.title')}
              </h2>
            </div>
            <p
              style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-muted)' }}
              dangerouslySetInnerHTML={{ __html: t('teams.detail.deleteConfirm.message', { name: team?.name ?? '' }) }}
            />
            {deleteAction.error && (
              <Alert type="error" message={deleteAction.error} onClose={deleteAction.reset} />
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{
                  ...btnPrimary,
                  background: 'var(--danger)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: deleteAction.loading ? 0.7 : 1,
                  cursor: deleteAction.loading ? 'not-allowed' : 'pointer',
                }}
                disabled={deleteAction.loading}
                onClick={handleDeleteTeam}
              >
                {deleteAction.loading && (
                  <div style={{
                    width: 10, height: 10,
                    border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'var(--accent-fg)',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                  }} />
                )}
                {t('teams.detail.deleteConfirm.submit')}
              </button>
              <button style={btnSecondary} onClick={() => setShowDeleteConfirm(false)}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove member confirm */}
      {confirmRemoveId && (
        <div style={modalOverlay}>
          <div style={modalBg} onClick={() => setConfirmRemoveId(null)} />
          <div style={modalCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 36, height: 36,
                background: 'var(--danger-bg)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <UserMinus size={16} strokeWidth={2} style={{ color: 'var(--danger)' }} />
              </div>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {t('teams.detail.confirmRemove.title')}
              </h2>
            </div>
            <p
              style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-muted)' }}
              dangerouslySetInnerHTML={{ __html: t('teams.detail.confirmRemove.message', { name: getDisplayName(confirmRemoveId) }) }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{ ...btnPrimary, background: 'var(--danger)' }}
                onClick={handleRemoveMember}
              >
                {t('teams.detail.confirmRemove.submit')}
              </button>
              <button style={btnSecondary} onClick={() => setConfirmRemoveId(null)}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role change confirm */}
      {confirmRoleChange && (
        <div style={modalOverlay}>
          <div style={modalBg} onClick={() => { setConfirmRoleChange(null); roleChangeAction.reset(); }} />
          <div style={modalCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 36, height: 36,
                background: 'var(--accent-muted)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <ArrowLeftRight size={16} strokeWidth={2} style={{ color: 'var(--accent)' }} />
              </div>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {t('teams.detail.confirmRoleChange.title')}
              </h2>
            </div>
            <p
              style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-muted)' }}
              dangerouslySetInnerHTML={{
                __html: confirmRoleChange.newRole === 'ADMIN'
                  ? t('teams.detail.confirmRoleChange.messageToAdmin', { name: getDisplayName(confirmRoleChange.userId) })
                  : t('teams.detail.confirmRoleChange.messageToMember', { name: getDisplayName(confirmRoleChange.userId) }),
              }}
            />
            {roleChangeAction.error && (
              <Alert type="error" message={roleChangeAction.error} onClose={roleChangeAction.reset} />
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{
                  ...btnPrimary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: roleChangeAction.loading ? 0.7 : 1,
                  cursor: roleChangeAction.loading ? 'not-allowed' : 'pointer',
                }}
                disabled={roleChangeAction.loading}
                onClick={handleRoleChange}
              >
                {roleChangeAction.loading && (
                  <div style={{
                    width: 10, height: 10,
                    border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'var(--accent-fg)',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                  }} />
                )}
                {t('teams.detail.confirmRoleChange.submit')}
              </button>
              <button
                style={btnSecondary}
                onClick={() => { setConfirmRoleChange(null); roleChangeAction.reset(); }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}