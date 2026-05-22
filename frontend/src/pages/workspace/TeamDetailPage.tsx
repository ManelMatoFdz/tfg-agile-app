import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { teamsApi } from '../../api/teams';
import { workspacesApi } from '../../api/workspaces';
import { useApiAction } from '../../hooks/useApiAction';
import { useUserMap } from '../../hooks/useUserMap';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import type { Team, TeamMember, TeamRole, UserSummary } from '../../types';

function RoleBadge({ role }: { role: TeamRole }) {
  const { t } = useTranslation();
  if (role === 'ADMIN') {
    return (
      <span className="text-xs font-medium bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
        {t('teams.detail.roles.ADMIN')}
      </span>
    );
  }
  return (
    <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
      {t('teams.detail.roles.MEMBER')}
    </span>
  );
}

function UserAvatar({ user, size = 'md' }: { user: UserSummary; size?: 'sm' | 'md' }) {
  const [imgError, setImgError] = useState(false);
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  const text = size === 'sm' ? 'text-xs' : 'text-sm';
  const label = user.fullName || user.username;
  return (
    <div className={`${dim} rounded-xl overflow-hidden flex-shrink-0`}>
      {user.avatarUrl && !imgError ? (
        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={() => setImgError(true)} />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white ${text} font-bold`}>
          {label.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
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
  const newRole: TeamRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
  const displayName = user?.fullName || user?.username || t('common.unknownUser');
  const fakeUser: UserSummary = { id: member.userId, username: displayName, fullName: user?.fullName, avatarUrl: user?.avatarUrl };

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-gray-50/70 transition-colors group">
      <div className="flex items-center gap-3">
        <UserAvatar user={fakeUser} />
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            <RoleBadge role={member.role} />
          </div>
          <p className="text-xs text-gray-400">
            {t('common.since', { date: new Date(member.joinedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) })}
          </p>
        </div>
      </div>
      {canManage && (
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all duration-200">
          <button
            onClick={() => onChangeRole(member.userId, newRole)}
            disabled={removing}
            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200 cursor-pointer flex-shrink-0"
            title={member.role === 'ADMIN' ? t('teams.detail.demoteToMember') : t('teams.detail.promoteToAdmin')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
          {!isSelf && (
            <button
              onClick={() => onRemove(member.userId)}
              disabled={removing}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 cursor-pointer flex-shrink-0"
              title={t('teams.detail.removeMember')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MemberList({ members, userMap, canManage, currentUserId, onRemove, onChangeRole, removingId }: {
  members: TeamMember[];
  userMap: Map<string, UserSummary>;
  canManage: boolean;
  currentUserId?: string;
  onRemove: (userId: string) => void;
  onChangeRole: (userId: string, newRole: TeamRole) => void;
  removingId: string | null;
}) {
  return (
    <div className="divide-y divide-gray-100/60">
      {members.map((m) => (
        <MemberRow
          key={m.id}
          member={m}
          user={userMap.get(m.userId)}
          canManage={canManage}
          isSelf={m.userId === currentUserId}
          onRemove={onRemove}
          onChangeRole={onChangeRole}
          removing={removingId === m.userId}
        />
      ))}
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
    <div className="mb-4 animate-fade-in">
      {error && <Alert type="error" message={error} onClose={onErrorClose} />}
      <Input
        placeholder={t('teams.detail.searchPlaceholder')}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        autoFocus
        className="w-full"
      />
      <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">{t('teams.detail.noResults')}</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {candidates.map((u) => (
              <button
                key={u.id}
                onClick={() => onSelect(u.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary-50/60 transition-colors text-left cursor-pointer"
              >
                <UserAvatar user={u} size="sm" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.fullName || u.username}</p>
                  <p className="text-xs text-gray-400">@{u.username}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-end">
        <Button variant="secondary" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
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

  // userMap covers both team members and all workspace members for the picker
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
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to={`/workspaces/${workspaceId}/teams`} className="hover:text-primary-600 transition-colors">
          {t('teams.detail.breadcrumb')}
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-700 font-medium truncate">{team?.name ?? '...'}</span>
      </nav>

      {teamAction.error && (
        <Alert type="error" message={teamAction.error} onClose={teamAction.reset} />
      )}

      {teamAction.loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : team ? (
        <div className="space-y-6">
          {/* Team header */}
          <div className="glass-card-strong p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-xl font-bold shadow-md flex-shrink-0">
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{team.name}</h1>
                  {team.description && (
                    <p className="text-gray-500 mt-0.5">{team.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1.5">
                    {t('common.createdAt', { date: new Date(team.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isCurrentUserMember && (
                  <button
                    onClick={() => setShowLeaveConfirm(true)}
                    className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200 cursor-pointer flex-shrink-0"
                    title={t('teams.detail.leaveTeam')}
                  >
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                )}
                {canManage && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 cursor-pointer flex-shrink-0"
                    title={t('teams.detail.delete')}
                  >
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="glass-card-strong p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                {t('teams.detail.members')}
                {members.length > 0 && (
                  <span className="ml-2 text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {members.length}
                  </span>
                )}
              </h2>
              {canManage && !showAddMember && (
                <button
                  onClick={() => setShowAddMember(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('teams.detail.addMember')}
                </button>
              )}
            </div>

            {/* Member picker */}
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
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">{t('teams.detail.noMembers')}</p>
                {canManage && !showAddMember && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700 cursor-pointer transition-colors"
                  >
                    {t('teams.detail.addFirst')}
                  </button>
                )}
              </div>
            ) : (
              <MemberList
                members={members}
                userMap={userMap}
                canManage={canManage}
                currentUserId={currentUser?.id}
                onRemove={(userId) => setConfirmRemoveId(userId)}
                onChangeRole={(userId, newRole) => setConfirmRoleChange({ userId, newRole })}
                removingId={removingId}
              />
            )}
          </div>
        </div>
      ) : null}

      {/* Leave team confirm modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowLeaveConfirm(false); leaveAction.reset(); }} />
          <div className="relative z-10 w-full max-w-sm glass-card-strong p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{t('teams.detail.confirmLeave.title')}</h2>
            </div>
            <p
              className="text-sm text-gray-500 mb-5"
              dangerouslySetInnerHTML={{ __html: t('teams.detail.confirmLeave.message', { name: team?.name ?? '' }) }}
            />
            {leaveAction.error && (
              <Alert type="error" message={leaveAction.error} onClose={leaveAction.reset} />
            )}
            <div className="flex gap-3">
              <Button
                variant="danger"
                loading={leaveAction.loading}
                onClick={handleLeaveTeam}
                className="flex-1"
              >
                {t('teams.detail.confirmLeave.submit')}
              </Button>
              <Button variant="secondary" onClick={() => { setShowLeaveConfirm(false); leaveAction.reset(); }}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete team confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative z-10 w-full max-w-sm glass-card-strong p-6 shadow-2xl animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('teams.detail.deleteConfirm.title')}</h2>
            <p
              className="text-sm text-gray-500 mb-5"
              dangerouslySetInnerHTML={{ __html: t('teams.detail.deleteConfirm.message', { name: team?.name ?? '' }) }}
            />
            {deleteAction.error && (
              <Alert type="error" message={deleteAction.error} onClose={deleteAction.reset} />
            )}
            <div className="flex gap-3">
              <Button
                variant="danger"
                loading={deleteAction.loading}
                onClick={handleDeleteTeam}
                className="flex-1"
              >
                {t('teams.detail.deleteConfirm.submit')}
              </Button>
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Remove member confirm modal */}
      {confirmRemoveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmRemoveId(null)} />
          <div className="relative z-10 w-full max-w-sm glass-card-strong p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{t('teams.detail.confirmRemove.title')}</h2>
            </div>
            <p
              className="text-sm text-gray-500 mb-5"
              dangerouslySetInnerHTML={{ __html: t('teams.detail.confirmRemove.message', { name: getDisplayName(confirmRemoveId) }) }}
            />
            <div className="flex gap-3">
              <Button variant="danger" onClick={handleRemoveMember} className="flex-1">
                {t('teams.detail.confirmRemove.submit')}
              </Button>
              <Button variant="secondary" onClick={() => setConfirmRemoveId(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Role change confirm modal */}
      {confirmRoleChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setConfirmRoleChange(null); roleChangeAction.reset(); }} />
          <div className="relative z-10 w-full max-w-sm glass-card-strong p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{t('teams.detail.confirmRoleChange.title')}</h2>
            </div>
            <p
              className="text-sm text-gray-500 mb-4"
              dangerouslySetInnerHTML={{
                __html: confirmRoleChange.newRole === 'ADMIN'
                  ? t('teams.detail.confirmRoleChange.messageToAdmin', { name: getDisplayName(confirmRoleChange.userId) })
                  : t('teams.detail.confirmRoleChange.messageToMember', { name: getDisplayName(confirmRoleChange.userId) }),
              }}
            />
            {roleChangeAction.error && (
              <Alert type="error" message={roleChangeAction.error} onClose={roleChangeAction.reset} />
            )}
            <div className="flex gap-3">
              <Button loading={roleChangeAction.loading} onClick={handleRoleChange} className="flex-1">
                {t('teams.detail.confirmRoleChange.submit')}
              </Button>
              <Button variant="secondary" onClick={() => { setConfirmRoleChange(null); roleChangeAction.reset(); }}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}