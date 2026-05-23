import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserPlus, UserMinus, Check, X, Users } from 'lucide-react';
import { projectsApi } from '../../../api/projects';
import { workspacesApi } from '../../../api/workspaces';
import { teamsApi } from '../../../api/teams';
import { useApiAction } from '../../../hooks/useApiAction';
import { useUserMap } from '../../../hooks/useUserMap';
import { useAuthStore } from '../../../store/authStore';
import Alert from '../../../components/ui/Alert';
import type { ProjectMember, ProjectRole, ScrumRole, WorkspaceMember, Team, TeamMember } from '../../../types';

const PROJECT_ROLES: ProjectRole[] = ['ADMIN', 'MEMBER', 'VIEWER'];
const SCRUM_ROLES: (ScrumRole | null)[] = [null, 'PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER'];

const ROLE_COLOR: Record<ProjectRole, { color: string; bg: string }> = {
  ADMIN:  { color: 'var(--accent)',   bg: 'var(--accent-muted)' },
  MEMBER: { color: '#16a34a',         bg: 'rgba(22,163,74,0.08)' },
  VIEWER: { color: 'var(--text-faint)', bg: 'var(--bg-hover)' },
};

const selectStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 500,
  padding: '3px 6px',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  outline: 'none',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  fontSize: 12,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 4,
};

function Avatar({ name, avatarUrl, size = 30 }: { name: string; avatarUrl?: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (avatarUrl && !err) {
    return <img src={avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setErr(true)} style={{ width: size, height: size, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: 'var(--radius-sm)', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.38, fontWeight: 700 }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function MemberRow({
  member, name, avatarUrl, isSelf, isAdmin,
  isUpdatingRole, isUpdatingScrum, isRemoving,
  memberTeams,
  onRoleChange, onScrumRoleChange, onRemove,
}: {
  member: ProjectMember; name: string; avatarUrl?: string;
  isSelf: boolean; isAdmin: boolean;
  isUpdatingRole: boolean; isUpdatingScrum: boolean; isRemoving: boolean;
  memberTeams: Team[];
  onRoleChange: (role: ProjectRole) => void;
  onScrumRoleChange: (role: ScrumRole | null) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const rc = ROLE_COLOR[member.role];

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', gap: 10, transition: `background var(--duration)` }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Avatar name={name} avatarUrl={avatarUrl} size={28} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{name}</p>
            {isSelf && <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-faint)', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 4px', flexShrink: 0 }}>{t('common.you')}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
              {t('common.since', { date: new Date(member.joinedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) })}
            </span>
            {memberTeams.map((team) => (
              <span key={team.id} style={{
                fontSize: 9, fontWeight: 600, letterSpacing: '0.03em',
                color: '#7c3aed', background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.15)',
                borderRadius: 'var(--radius-sm)', padding: '0 5px',
                flexShrink: 0,
              }}>
                {team.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {/* Scrum role */}
        {isAdmin ? (
          <select
            value={member.scrumRole ?? ''}
            disabled={isUpdatingScrum}
            onChange={(e) => onScrumRoleChange((e.target.value as ScrumRole) || null)}
            style={{ ...selectStyle, color: member.scrumRole ? '#7c3aed' : 'var(--text-faint)', opacity: isUpdatingScrum ? 0.5 : 1 }}
          >
            <option value="">{t('projects.members.scrumRoles.none')}</option>
            {SCRUM_ROLES.filter(Boolean).map((r) => <option key={r!} value={r!}>{t(`projects.members.scrumRoles.${r}`)}</option>)}
          </select>
        ) : member.scrumRole ? (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed', background: 'rgba(124,58,237,0.08)', borderRadius: 'var(--radius-sm)', padding: '2px 6px' }}>
            {t(`projects.members.scrumRoles.${member.scrumRole}`)}
          </span>
        ) : null}

        {/* Project role */}
        {isAdmin ? (
          <select
            value={member.role}
            disabled={isUpdatingRole}
            onChange={(e) => onRoleChange(e.target.value as ProjectRole)}
            style={{ ...selectStyle, color: rc.color, background: rc.bg, opacity: isUpdatingRole ? 0.5 : 1 }}
          >
            {PROJECT_ROLES.map((r) => <option key={r} value={r}>{t(`projects.members.roles.${r}`)}</option>)}
          </select>
        ) : (
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: rc.color, background: rc.bg, borderRadius: 'var(--radius-sm)', padding: '2px 6px' }}>
            {t(`projects.members.roles.${member.role}`)}
          </span>
        )}

        {/* Remove */}
        {isAdmin && !isSelf && (
          <button
            onClick={onRemove}
            disabled={isRemoving}
            title={t('projects.members.removeMember')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, border: 'none', background: 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-faint)', opacity: isRemoving ? 0.4 : 1, transition: `background var(--duration), color var(--duration)` }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--danger-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--danger)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-faint)'; }}
          >
            <UserMinus size={12} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'var(--bg-overlay)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)' }}>
        {children}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProjectMembersPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const currentUser = useAuthStore((s) => s.user);

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [updatingScrumId, setUpdatingScrumId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<ProjectMember | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [wsMembersLoading, setWsMembersLoading] = useState(false);
  const [wsMembers, setWsMembers] = useState<WorkspaceMember[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('MEMBER');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Team membership map (userId → teams they belong to in the workspace)
  const [userTeamMap, setUserTeamMap] = useState<Map<string, Team[]>>(new Map());

  // Add-from-team modal state
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamMembersLoading, setTeamMembersLoading] = useState(false);
  const [selectedTeamUserIds, setSelectedTeamUserIds] = useState<Set<string>>(new Set());
  const [addingTeam, setAddingTeam] = useState(false);
  const [addTeamError, setAddTeamError] = useState<string | null>(null);

  const membersAction = useApiAction<ProjectMember[]>();

  useEffect(() => {
    if (!projectId) return;
    membersAction.run(projectsApi.getMembers(projectId)).then((data) => { if (!data) return; setMembers(data); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Load workspace teams + their members in background to show team badges
  useEffect(() => {
    if (!workspaceId) return;
    teamsApi.list(workspaceId).then(async (res) => {
      const allTeams = res.data;
      setTeams(allTeams);
      const map = new Map<string, Team[]>();
      await Promise.all(allTeams.map(async (team) => {
        try {
          const { data: members } = await teamsApi.getMembers(team.id);
          members.forEach((tm) => {
            if (!map.has(tm.userId)) map.set(tm.userId, []);
            map.get(tm.userId)!.push(team);
          });
        } catch { /* ignore */ }
      }));
      setUserTeamMap(new Map(map));
    }).catch(() => { /* ignore, badges just won't show */ });
  }, [workspaceId]);

  const allUserIds = [...members.map((m) => m.userId), ...wsMembers.map((m) => m.userId), ...teamMembers.map((m) => m.userId)];
  const userMap = useUserMap(allUserIds);
  const isAdmin = members.some((m) => m.userId === currentUser?.id && m.role === 'ADMIN');

  const displayName = (userId: string) => {
    const u = userMap.get(userId);
    return u?.fullName || u?.username || t('common.unknownUser');
  };

  const openAddModal = async () => {
    setShowAddModal(true); setSearch(''); setSelectedUserId(''); setSelectedRole('MEMBER'); setAddError(null);
    if (!workspaceId) return;
    setWsMembersLoading(true);
    try { const res = await workspacesApi.getMembers(workspaceId); setWsMembers(res.data); }
    catch { setAddError(t('projects.members.add.error')); }
    finally { setWsMembersLoading(false); }
  };

  const openAddTeamModal = async () => {
    setShowAddTeamModal(true);
    setSelectedTeam(null);
    setTeamMembers([]);
    setSelectedTeamUserIds(new Set());
    setAddTeamError(null);
    // Teams already loaded by background effect; only fetch if not yet available
    if (teams.length === 0 && workspaceId) {
      setTeamsLoading(true);
      try { const res = await teamsApi.list(workspaceId); setTeams(res.data); }
      catch { setAddTeamError(t('projects.members.addTeam.error')); }
      finally { setTeamsLoading(false); }
    }
  };

  const handleTeamSelect = async (team: Team) => {
    setSelectedTeam(team);
    setTeamMembers([]);
    setSelectedTeamUserIds(new Set());
    setAddTeamError(null);
    setTeamMembersLoading(true);
    try {
      const res = await teamsApi.getMembers(team.id);
      setTeamMembers(res.data);
      // Pre-select all members not already in project
      const available = res.data.filter((tm) => !members.some((pm) => pm.userId === tm.userId));
      setSelectedTeamUserIds(new Set(available.map((tm) => tm.userId)));
    } catch { setAddTeamError(t('projects.members.addTeam.error')); }
    finally { setTeamMembersLoading(false); }
  };

  const toggleTeamMember = (userId: string) => {
    setSelectedTeamUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const handleAddFromTeam = async () => {
    if (!projectId || !selectedTeam || selectedTeamUserIds.size === 0) return;
    setAddingTeam(true); setAddTeamError(null);
    try {
      const res = await projectsApi.addMembersFromTeam(projectId, selectedTeam.id, [...selectedTeamUserIds]);
      setMembers((prev) => {
        const existingIds = new Set(prev.map((m) => m.userId));
        return [...prev, ...res.data.filter((m: ProjectMember) => !existingIds.has(m.userId))];
      });
      setShowAddTeamModal(false);
    } catch { setAddTeamError(t('projects.members.addTeam.error')); }
    finally { setAddingTeam(false); }
  };

  const candidateMembers = wsMembers.filter(
    (wm) => !members.some((pm) => pm.userId === wm.userId) && (search.trim() === '' || displayName(wm.userId).toLowerCase().includes(search.toLowerCase())),
  );

  const handleAddMember = async () => {
    if (!projectId || !selectedUserId) return;
    setAdding(true); setAddError(null);
    try {
      const res = await projectsApi.addMember(projectId, { userId: selectedUserId, role: selectedRole });
      setMembers((prev) => [...prev, res.data]);
      setShowAddModal(false);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { errorCode?: string } } })?.response?.data?.errorCode;
      setAddError(code ? t(`errors.${code}`) : t('projects.members.add.error'));
    } finally { setAdding(false); }
  };

  const handleRoleChange = async (userId: string, role: ProjectRole) => {
    if (!projectId) return;
    setUpdatingRoleId(userId); setActionError(null);
    try {
      const res = await projectsApi.updateMemberRole(projectId, userId, role);
      setMembers((prev) => prev.map((m) => (m.userId === userId ? res.data : m)));
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { errorCode?: string } } })?.response?.data?.errorCode;
      setActionError(code ? t(`errors.${code}`) : t('projects.members.errors.changeRole'));
    } finally { setUpdatingRoleId(null); }
  };

  const handleScrumRoleChange = async (userId: string, scrumRole: ScrumRole | null) => {
    if (!projectId) return;
    setUpdatingScrumId(userId); setActionError(null);
    try {
      const res = await projectsApi.updateScrumRole(projectId, userId, scrumRole);
      setMembers((prev) => prev.map((m) => (m.userId === userId ? res.data : m)));
    } catch { setActionError(t('projects.members.errors.changeScrumRole')); }
    finally { setUpdatingScrumId(null); }
  };

  const handleRemove = async () => {
    if (!projectId || !confirmRemove) return;
    setRemovingId(confirmRemove.userId); setRemoveError(null);
    try {
      await projectsApi.removeMember(projectId, confirmRemove.userId);
      setMembers((prev) => prev.filter((m) => m.userId !== confirmRemove.userId));
      setConfirmRemove(null);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { errorCode?: string } } })?.response?.data?.errorCode;
      setRemoveError(code ? t(`errors.${code}`) : t('projects.members.errors.remove'));
    } finally { setRemovingId(null); }
  };

  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      {(membersAction.error || actionError) && (
        <Alert type="error" message={membersAction.error ?? actionError!} onClose={() => { membersAction.reset(); setActionError(null); }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {t('projects.members.title')}
          </h2>
          {members.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 4px', fontFamily: 'var(--font-mono)' }}>
              {members.length}
            </span>
          )}
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={openAddTeamModal}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 11, fontWeight: 500, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: `background var(--duration)` }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Users size={11} strokeWidth={2} />
              {t('projects.members.addTeam.button')}
            </button>
            <button
              onClick={openAddModal}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 11, fontWeight: 500, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: `background var(--duration)` }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
            >
              <UserPlus size={11} strokeWidth={2} />
              {t('projects.members.addMember')}
            </button>
          </div>
        )}
      </div>

      {/* Member list */}
      {membersAction.loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
          <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : members.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '32px 0' }}>{t('projects.members.noMembers')}</p>
      ) : (
        <div>
          {members.map((m, idx) => {
            const u = userMap.get(m.userId);
            return (
              <div key={m.id} style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                <MemberRow
                  member={m}
                  name={displayName(m.userId)}
                  avatarUrl={u?.avatarUrl}
                  isSelf={m.userId === currentUser?.id}
                  isAdmin={isAdmin}
                  isUpdatingRole={updatingRoleId === m.userId}
                  isUpdatingScrum={updatingScrumId === m.userId}
                  isRemoving={removingId === m.userId}
                  memberTeams={userTeamMap.get(m.userId) ?? []}
                  onRoleChange={(role) => handleRoleChange(m.userId, role)}
                  onScrumRoleChange={(role) => handleScrumRoleChange(m.userId, role)}
                  onRemove={() => setConfirmRemove(m)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Add member modal */}
      {showAddModal && (
        <ModalOverlay onClose={() => setShowAddModal(false)}>
          <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{t('projects.members.add.title')}</h3>
            <button onClick={() => setShowAddModal(false)} style={{ display: 'flex', width: 24, height: 24, alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-faint)' }}><X size={13} /></button>
          </div>

          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {addError && <div style={{ fontSize: 11, color: 'var(--danger)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', padding: '5px 10px' }}>{addError}</div>}

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('projects.members.add.searchPlaceholder')}
              autoFocus
              style={inputStyle}
            />

            {wsMembersLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                <div style={{ width: 18, height: 18, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              </div>
            ) : candidateMembers.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '16px 0' }}>{t('projects.members.add.noResults')}</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                {candidateMembers.map((wm, idx) => {
                  const n = displayName(wm.userId);
                  const selected = selectedUserId === wm.userId;
                  return (
                    <li
                      key={wm.userId}
                      onClick={() => setSelectedUserId(wm.userId)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', cursor: 'pointer',
                        background: selected ? 'var(--accent-muted)' : 'transparent',
                        borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                        transition: `background var(--duration)`,
                      }}
                      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <Avatar name={n} size={26} />
                      <span style={{ fontSize: 12, color: 'var(--text)', flex: 1 }}>{n}</span>
                      {selected && <Check size={12} strokeWidth={2.5} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                    </li>
                  );
                })}
              </ul>
            )}

            <div>
              <label style={labelStyle}>{t('projects.members.add.roleLabel')}</label>
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as ProjectRole)} style={inputStyle}>
                {PROJECT_ROLES.map((r) => <option key={r} value={r}>{t(`projects.members.roles.${r}`)}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '10px 18px 14px', borderTop: '1px solid var(--border)' }}>
            <button onClick={() => setShowAddModal(false)} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>{t('common.cancel')}</button>
            <button
              onClick={handleAddMember}
              disabled={adding || !selectedUserId}
              style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', opacity: adding || !selectedUserId ? 0.5 : 1 }}
              onMouseEnter={e => { if (!adding && selectedUserId) (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; }}
            >
              {adding ? t('projects.members.add.adding') : t('projects.members.add.submit')}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* Add from team modal */}
      {showAddTeamModal && (
        <ModalOverlay onClose={() => setShowAddTeamModal(false)}>
          <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedTeam && (
                <button
                  onClick={() => { setSelectedTeam(null); setTeamMembers([]); setSelectedTeamUserIds(new Set()); setAddTeamError(null); }}
                  style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', fontSize: 11, fontWeight: 500, background: 'transparent', color: 'var(--text-faint)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                >
                  ← {t('projects.members.addTeam.back')}
                </button>
              )}
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                {selectedTeam ? selectedTeam.name : t('projects.members.addTeam.title')}
              </h3>
            </div>
            <button onClick={() => setShowAddTeamModal(false)} style={{ display: 'flex', width: 24, height: 24, alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-faint)' }}><X size={13} /></button>
          </div>

          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {addTeamError && <div style={{ fontSize: 11, color: 'var(--danger)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', padding: '5px 10px' }}>{addTeamError}</div>}

            {!selectedTeam ? (
              /* Step 1: Team selection */
              teamsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                  <div style={{ width: 18, height: 18, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </div>
              ) : teams.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '16px 0' }}>{t('projects.members.addTeam.noTeams')}</p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  {teams.map((team, idx) => (
                    <li
                      key={team.id}
                      onClick={() => handleTeamSelect(team)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer',
                        borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                        transition: `background var(--duration)`,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 'var(--radius-sm)', background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={13} strokeWidth={2} style={{ color: 'var(--accent)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{team.name}</p>
                        {team.description && <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{team.description}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              /* Step 2: Member selection */
              teamMembersLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                  <div style={{ width: 18, height: 18, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </div>
              ) : teamMembers.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '16px 0' }}>{t('projects.members.addTeam.noMembersAvailable')}</p>
              ) : (
                <>
                  {/* Select all / Deselect all */}
                  {(() => {
                    const available = teamMembers.filter((tm) => !members.some((pm) => pm.userId === tm.userId));
                    const allSelected = available.length > 0 && available.every((tm) => selectedTeamUserIds.has(tm.userId));
                    return available.length > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                          {t('projects.members.addTeam.selected', { count: selectedTeamUserIds.size })}
                        </span>
                        <button
                          onClick={() => {
                            if (allSelected) setSelectedTeamUserIds(new Set());
                            else setSelectedTeamUserIds(new Set(available.map((tm) => tm.userId)));
                          }}
                          style={{ fontSize: 11, fontWeight: 500, color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          {allSelected ? t('projects.members.addTeam.deselectAll') : t('projects.members.addTeam.selectAll')}
                        </button>
                      </div>
                    ) : null;
                  })()}

                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    {teamMembers.map((tm, idx) => {
                      const alreadyIn = members.some((pm) => pm.userId === tm.userId);
                      const checked = selectedTeamUserIds.has(tm.userId);
                      const n = displayName(tm.userId);
                      const u = userMap.get(tm.userId);
                      return (
                        <li
                          key={tm.userId}
                          onClick={() => !alreadyIn && toggleTeamMember(tm.userId)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px',
                            cursor: alreadyIn ? 'default' : 'pointer',
                            opacity: alreadyIn ? 0.5 : 1,
                            background: checked && !alreadyIn ? 'var(--accent-muted)' : 'transparent',
                            borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                            transition: `background var(--duration)`,
                          }}
                          onMouseEnter={e => { if (!alreadyIn && !checked) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                          onMouseLeave={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <Avatar name={n} avatarUrl={u?.avatarUrl} size={26} />
                          <span style={{ fontSize: 12, color: 'var(--text)', flex: 1 }}>{n}</span>
                          {alreadyIn ? (
                            <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-faint)', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1px 5px', flexShrink: 0 }}>
                              {t('projects.members.addTeam.alreadyMember')}
                            </span>
                          ) : checked ? (
                            <Check size={12} strokeWidth={2.5} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )
            )}
          </div>

          {selectedTeam && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '10px 18px 14px', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowAddTeamModal(false)} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>{t('common.cancel')}</button>
              <button
                onClick={handleAddFromTeam}
                disabled={addingTeam || selectedTeamUserIds.size === 0}
                style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', opacity: addingTeam || selectedTeamUserIds.size === 0 ? 0.5 : 1 }}
                onMouseEnter={e => { if (!addingTeam && selectedTeamUserIds.size > 0) (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; }}
              >
                {addingTeam ? t('projects.members.addTeam.adding') : t('projects.members.addTeam.submit')}
              </button>
            </div>
          )}
        </ModalOverlay>
      )}

      {/* Remove confirm */}
      {confirmRemove && (
        <ModalOverlay onClose={() => { setConfirmRemove(null); setRemoveError(null); }}>
          <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{t('projects.members.confirmRemove.title')}</h3>
          </div>
          <div style={{ padding: '12px 18px' }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: t('projects.members.confirmRemove.message', { name: displayName(confirmRemove.userId) }) }}
            />
            {removeError && <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--danger)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', padding: '5px 10px' }}>{removeError}</p>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '10px 18px 14px', borderTop: '1px solid var(--border)' }}>
            <button onClick={() => { setConfirmRemove(null); setRemoveError(null); }} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>{t('common.cancel')}</button>
            <button
              onClick={handleRemove}
              disabled={removingId === confirmRemove.userId}
              style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', opacity: removingId === confirmRemove.userId ? 0.5 : 1 }}
            >
              {removingId === confirmRemove.userId ? t('projects.members.confirmRemove.removing') : t('projects.members.confirmRemove.confirm')}
            </button>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}