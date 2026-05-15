import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { workspacesApi } from '../../api/workspaces';
import { usersApi } from '../../api/users';
import { useApiAction } from '../../hooks/useApiAction';
import { useAuthStore } from '../../store/authStore';
import { useUserMap } from '../../hooks/useUserMap';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import type { WorkspaceMember, WorkspaceRole, UserLookup } from '../../types';

const ROLE_COLORS: Record<WorkspaceRole, string> = {
  ADMIN: 'bg-primary-100 text-primary-700',
  MEMBER: 'bg-gray-100 text-gray-600',
};

function MemberRow({
  member,
  isSelf,
  isAdmin,
  displayName,
  avatarUrl,
  onRoleChange,
  onRemove,
  updatingId,
  removingId,
}: {
  member: WorkspaceMember;
  isSelf: boolean;
  isAdmin: boolean;
  displayName: string;
  avatarUrl?: string;
  onRoleChange: (userId: string, role: WorkspaceRole) => void;
  onRemove: (userId: string) => void;
  updatingId: string | null;
  removingId: string | null;
}) {
  const { t } = useTranslation();
  const otherRole: WorkspaceRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
  const isUpdating = updatingId === member.userId;
  const isRemoving = removingId === member.userId;
  const [imgError, setImgError] = useState(false);

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
            {isSelf && (
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{t('common.you')}</span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {t('common.since', { date: new Date(member.joinedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[member.role]}`}>
          {t(`workspace.members.roles.${member.role}`)}
        </span>

        {isAdmin && !isSelf && (
          <>
            <button
              onClick={() => onRoleChange(member.userId, otherRole)}
              disabled={isUpdating || isRemoving}
              title={t('workspace.members.changeRoleTitle', { role: t(`workspace.members.roles.${otherRole}`) })}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
            >
              {isUpdating ? (
                <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              )}
            </button>

            <button
              onClick={() => onRemove(member.userId)}
              disabled={isUpdating || isRemoving}
              title={t('workspace.members.removeMember')}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
            >
              {isRemoving ? (
                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LookedUpAvatar({ user }: { user: UserLookup }) {
  const [imgError, setImgError] = useState(false);
  const initials = (user.fullName || user.username).charAt(0).toUpperCase();
  return (
    <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
      {user.avatarUrl && !imgError ? (
        <img
          src={user.avatarUrl}
          alt=""
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
          {initials}
        </div>
      )}
    </div>
  );
}

export default function WorkspaceMembersPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const currentUser = useAuthStore((s) => s.user);

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [lookedUpUser, setLookedUpUser] = useState<UserLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmRoleChange, setConfirmRoleChange] = useState<{ userId: string; role: WorkspaceRole } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const listAction = useApiAction<WorkspaceMember[]>();
  const inviteAction = useApiAction();

  const loadMembers = () => {
    if (!workspaceId) return;
    listAction.run(workspacesApi.getMembers(workspaceId)).then((data) => {
      if (data) setMembers(data);
    });
  };

  useEffect(() => {
    loadMembers();
  }, [workspaceId]);

  const handleLookup = async () => {
    if (!inviteEmail.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookedUpUser(null);
    try {
      const { data } = await usersApi.lookupByEmail(inviteEmail.trim());
      setLookedUpUser(data);
    } catch {
      setLookupError(t('workspace.members.invite.userNotFound'));
    } finally {
      setLookupLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!workspaceId || !inviteEmail.trim()) return;
    if (!lookedUpUser) return;
    const data = await inviteAction.run(workspacesApi.createInvitation(workspaceId, lookedUpUser.id, inviteEmail.trim()));
    if (data !== null) {
      setInviteSuccess(true);
      setInviteEmail('');
      setLookedUpUser(null);
      setTimeout(() => {
        setInviteSuccess(false);
        setShowAddForm(false);
        inviteAction.reset();
      }, 2000);
    }
  };

  const closeAddForm = () => {
    setShowAddForm(false);
    setInviteEmail('');
    setLookedUpUser(null);
    setLookupError(null);
    setInviteSuccess(false);
    inviteAction.reset();
  };

  const handleRoleChange = async (userId: string, role: WorkspaceRole) => {
    if (!workspaceId) return;
    setConfirmRoleChange(null);
    setUpdatingId(userId);
    setActionError(null);
    try {
      const { data: updated } = await workspacesApi.updateMemberRole(workspaceId, userId, role);
      setMembers((prev) => prev.map((m) => (m.userId === userId ? updated : m)));
    } catch {
      setActionError(t('workspace.members.errors.changeRole'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!workspaceId) return;
    setConfirmRemoveId(null);
    setRemovingId(userId);
    setActionError(null);
    try {
      await workspacesApi.removeMember(workspaceId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch {
      setActionError(t('workspace.members.errors.remove'));
    } finally {
      setRemovingId(null);
    }
  };

  const userMap = useUserMap(members.map((m) => m.userId));
  const isAdmin = members.some((m) => m.userId === currentUser?.id && m.role === 'ADMIN');
  const admins = members.filter((m) => m.role === 'ADMIN');
  const regularMembers = members.filter((m) => m.role === 'MEMBER');

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('workspace.members.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {members.length === 0
              ? '…'
              : t('workspace.members.count', { count: members.length })}
          </p>
        </div>
        {!showAddForm && isAdmin && (
          <Button onClick={() => setShowAddForm(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('workspace.members.addMember')}
          </Button>
        )}
      </div>

      {listAction.error && (
        <Alert type="error" message={listAction.error} onClose={listAction.reset} />
      )}
      {actionError && (
        <Alert type="error" message={actionError} onClose={() => setActionError(null)} />
      )}

      {/* Invite member form */}
      {showAddForm && isAdmin && (
        <div className="glass-card-strong p-6 mb-6 animate-fade-in">
          <h3 className="text-base font-semibold text-gray-900 mb-4">{t('workspace.members.invite.title')}</h3>
          {inviteAction.error && (
            <Alert type="error" message={inviteAction.error} onClose={inviteAction.reset} />
          )}
          {inviteSuccess && (
            <Alert type="success" message={t('workspace.members.invite.success')} />
          )}
          <div className="space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  label={t('workspace.members.invite.emailLabel')}
                  type="email"
                  placeholder={t('workspace.members.invite.emailPlaceholder')}
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setLookedUpUser(null);
                    setLookupError(null);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(); } }}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                loading={lookupLoading}
                onClick={handleLookup}
                className="mb-0.5"
              >
                {t('workspace.members.invite.searchUser')}
              </Button>
            </div>

            {lookupError && (
              <p className="text-sm text-red-500">{lookupError}</p>
            )}

            {lookedUpUser && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-100">
                <LookedUpAvatar user={lookedUpUser} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{lookedUpUser.fullName || lookedUpUser.username}</p>
                  <p className="text-xs text-gray-500">{lookedUpUser.email}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                loading={inviteAction.loading}
                disabled={!lookedUpUser}
                onClick={handleInvite}
              >
                {t('workspace.members.invite.sendInvitation')}
              </Button>
              <Button type="button" variant="secondary" onClick={closeAddForm}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Members list */}
      {listAction.loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 font-medium">{t('workspace.members.count', { count: 0 })}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {admins.length > 0 && (
            <div className="glass-card-strong p-4">
              <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                {t('workspace.members.admins')}
              </p>
              <div className="divide-y divide-gray-100/60">
                {admins.map((m) => {
                  const u = userMap.get(m.userId);
                  return (
                    <MemberRow
                      key={m.id}
                      member={m}
                      isSelf={m.userId === currentUser?.id}
                      isAdmin={isAdmin}
                      displayName={u?.fullName || u?.username || t('common.unknownUser')}
                      avatarUrl={u?.avatarUrl}
                      onRoleChange={(userId, role) => setConfirmRoleChange({ userId, role })}
                      onRemove={setConfirmRemoveId}
                      updatingId={updatingId}
                      removingId={removingId}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {regularMembers.length > 0 && (
            <div className="glass-card-strong p-4">
              <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                {t('workspace.members.membersGroup')}
              </p>
              <div className="divide-y divide-gray-100/60">
                {regularMembers.map((m) => {
                  const u = userMap.get(m.userId);
                  return (
                    <MemberRow
                      key={m.id}
                      member={m}
                      isSelf={m.userId === currentUser?.id}
                      isAdmin={isAdmin}
                      displayName={u?.fullName || u?.username || t('common.unknownUser')}
                      avatarUrl={u?.avatarUrl}
                      onRoleChange={(userId, role) => setConfirmRoleChange({ userId, role })}
                      onRemove={setConfirmRemoveId}
                      updatingId={updatingId}
                      removingId={removingId}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm role change modal */}
      {confirmRoleChange && (() => {
        const u = userMap.get(confirmRoleChange.userId);
        const displayName = u?.fullName || u?.username || t('common.unknownUser');
        const newRoleLabel = t(`workspace.members.roles.${confirmRoleChange.role}`);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmRoleChange(null)} />
            <div className="relative glass-card-strong rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{t('workspace.members.confirmRoleChange.title')}</h3>
                  <p className="text-sm text-gray-500">{t('workspace.members.confirmRoleChange.subtitle', { name: displayName, role: newRoleLabel })}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6">{t('workspace.members.confirmRoleChange.description', { role: newRoleLabel })}</p>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setConfirmRoleChange(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  className="flex-1"
                  loading={updatingId === confirmRoleChange.userId}
                  onClick={() => handleRoleChange(confirmRoleChange.userId, confirmRoleChange.role)}
                >
                  {t('common.confirm')}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Confirm remove modal */}
      {confirmRemoveId && (() => {
        const u = userMap.get(confirmRemoveId);
        const displayName = u?.fullName || u?.username || t('common.unknownUser');
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmRemoveId(null)} />
            <div className="relative glass-card-strong rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{t('workspace.members.confirmRemove.title')}</h3>
                  <p className="text-sm text-gray-500">{t('workspace.members.confirmRemove.subtitle', { name: displayName })}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6">{t('workspace.members.confirmRemove.description')}</p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setConfirmRemoveId(null)}
                >
                  {t('common.cancel')}
                </Button>
                <button
                  onClick={() => handleRemove(confirmRemoveId)}
                  disabled={removingId === confirmRemoveId}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {removingId === confirmRemoveId ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('workspace.members.confirmRemove.removing')}
                    </span>
                  ) : t('workspace.members.confirmRemove.confirm')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}