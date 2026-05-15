import { useEffect, useState, type FormEvent } from 'react';
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
import type { Team, TeamMember, TeamRole } from '../../types';

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

function MemberRow({
  member,
  displayName,
  avatarUrl,
  canManage,
  onRemove,
  onChangeRole,
  removing,
}: {
  member: TeamMember;
  displayName: string;
  avatarUrl?: string;
  canManage: boolean;
  onRemove: (userId: string) => void;
  onChangeRole: (userId: string, newRole: TeamRole) => void;
  removing: boolean;
}) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const newRole: TeamRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-gray-50/70 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
          {avatarUrl && !imgError ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={() => setImgError(true)} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
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
        </div>
      )}
    </div>
  );
}

function MemberList({ members, canManage, onRemove, onChangeRole, removingId }: {
  members: TeamMember[];
  canManage: boolean;
  onRemove: (userId: string) => void;
  onChangeRole: (userId: string, newRole: TeamRole) => void;
  removingId: string | null;
}) {
  const { t } = useTranslation();
  const userMap = useUserMap(members.map((m) => m.userId));
  return (
    <div className="divide-y divide-gray-100/60">
      {members.map((m) => {
        const u = userMap.get(m.userId);
        return (
          <MemberRow
            key={m.id}
            member={m}
            displayName={u?.fullName || u?.username || t('common.unknownUser')}
            avatarUrl={u?.avatarUrl}
            canManage={canManage}
            onRemove={onRemove}
            onChangeRole={onChangeRole}
            removing={removingId === m.userId}
          />
        );
      })}
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
  const [canManage, setCanManage] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmRoleChange, setConfirmRoleChange] = useState<{ userId: string; newRole: TeamRole } | null>(null);
  const [roleChanging, setRoleChanging] = useState(false);

  const teamAction = useApiAction<Team>();
  const membersAction = useApiAction<TeamMember[]>();
  const addAction = useApiAction<TeamMember>();
  const deleteAction = useApiAction<void>();

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
      const isWorkspaceAdmin = res.data.some((m) => m.userId === currentUser?.id && m.role === 'ADMIN');
      if (isWorkspaceAdmin) setCanManage(true);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, workspaceId]);

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!teamId || !newUserId.trim()) return;
    const data = await addAction.run(teamsApi.addMember(teamId, newUserId.trim()));
    if (data) {
      setMembers((prev) => [...prev, data]);
      setNewUserId('');
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
    setRoleChanging(true);
    setConfirmRoleChange(null);
    try {
      const updated = await teamsApi.updateMemberRole(teamId, confirmRoleChange.userId, confirmRoleChange.newRole);
      setMembers((prev) => prev.map((m) => m.userId === confirmRoleChange.userId ? { ...m, role: updated.data.role } : m));
    } catch {
      // ignore
    } finally {
      setRoleChanging(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!teamId) return;
    await deleteAction.run(teamsApi.delete(teamId));
    navigate(`/workspaces/${workspaceId}/teams`);
  };

  const userMap = useUserMap(members.map((m) => m.userId));
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

            {/* Add member form */}
            {showAddMember && (
              <div className="mb-4 p-4 bg-gray-50/70 rounded-xl animate-fade-in">
                {addAction.error && (
                  <Alert type="error" message={addAction.error} onClose={addAction.reset} />
                )}
                <form onSubmit={handleAddMember} className="flex gap-2">
                  <Input
                    placeholder={t('teams.detail.userIdPlaceholder')}
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button type="submit" loading={addAction.loading}>
                    {t('common.add')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setShowAddMember(false); setNewUserId(''); addAction.reset(); }}
                  >
                    {t('common.cancel')}
                  </Button>
                </form>
              </div>
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
                canManage={canManage}
                onRemove={(userId) => setConfirmRemoveId(userId)}
                onChangeRole={(userId, newRole) => setConfirmRoleChange({ userId, newRole })}
                removingId={removingId}
              />
            )}
          </div>
        </div>
      ) : null}

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
              dangerouslySetInnerHTML={{ __html: t('teams.detail.confirmRemove.message', { name: confirmRemoveId ? getDisplayName(confirmRemoveId) : '' }) }}
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmRoleChange(null)} />
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
              className="text-sm text-gray-500 mb-5"
              dangerouslySetInnerHTML={{
                __html: confirmRoleChange.newRole === 'ADMIN'
                  ? t('teams.detail.confirmRoleChange.messageToAdmin', { name: getDisplayName(confirmRoleChange.userId) })
                  : t('teams.detail.confirmRoleChange.messageToMember', { name: getDisplayName(confirmRoleChange.userId) }),
              }}
            />
            <div className="flex gap-3">
              <Button loading={roleChanging} onClick={handleRoleChange} className="flex-1">
                {t('teams.detail.confirmRoleChange.submit')}
              </Button>
              <Button variant="secondary" onClick={() => setConfirmRoleChange(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}