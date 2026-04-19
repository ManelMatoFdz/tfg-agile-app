import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { workspacesApi } from '../../api/workspaces';
import { useApiAction } from '../../hooks/useApiAction';
import { useAuthStore } from '../../store/authStore';
import { useUserMap } from '../../hooks/useUserMap';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import type { WorkspaceMember, WorkspaceRole } from '../../types';

const ROLE_COLORS: Record<WorkspaceRole, string> = {
  ADMIN: 'bg-primary-100 text-primary-700',
  MEMBER: 'bg-gray-100 text-gray-600',
};

function MemberRow({
  member,
  isSelf,
  displayName,
  avatarUrl,
  onRoleChange,
  onRemove,
  updatingId,
  removingId,
}: {
  member: WorkspaceMember;
  isSelf: boolean;
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
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
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

        {!isSelf && (
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

export default function WorkspaceMembersPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const currentUser = useAuthStore((s) => s.user);

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState<WorkspaceRole>('MEMBER');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const listAction = useApiAction<WorkspaceMember[]>();
  const addAction = useApiAction<WorkspaceMember>();

  const loadMembers = () => {
    if (!workspaceId) return;
    listAction.run(workspacesApi.getMembers(workspaceId)).then((data) => {
      if (data) setMembers(data);
    });
  };

  useEffect(() => {
    loadMembers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !newUserId.trim()) return;
    const data = await addAction.run(
      workspacesApi.addMember(workspaceId, { userId: newUserId.trim(), role: newRole }),
    );
    if (data) {
      setMembers((prev) => [...prev, data]);
      setNewUserId('');
      setNewRole('MEMBER');
      setShowAddForm(false);
      addAction.reset();
    }
  };

  const handleRoleChange = async (userId: string, role: WorkspaceRole) => {
    if (!workspaceId) return;
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
        {!showAddForm && (
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

      {/* Add member form */}
      {showAddForm && (
        <div className="glass-card-strong p-6 mb-6 animate-fade-in">
          <h3 className="text-base font-semibold text-gray-900 mb-4">{t('workspace.members.form.title')}</h3>
          {addAction.error && (
            <Alert type="error" message={addAction.error} onClose={addAction.reset} />
          )}
          <form onSubmit={handleAdd} className="space-y-4">
            <Input
              label={t('workspace.members.form.userId')}
              placeholder={t('workspace.members.form.userIdPlaceholder')}
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('workspace.members.form.role')}</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as WorkspaceRole)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
              >
                <option value="MEMBER">{t('workspace.members.roles.MEMBER')}</option>
                <option value="ADMIN">{t('workspace.members.roles.ADMIN')}</option>
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="submit" loading={addAction.loading} className="flex-1">
                {t('workspace.members.form.submit')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setShowAddForm(false); setNewUserId(''); setNewRole('MEMBER'); addAction.reset(); }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
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
                      displayName={u?.fullName || u?.username || m.userId}
                      avatarUrl={u?.avatarUrl}
                      onRoleChange={handleRoleChange}
                      onRemove={handleRemove}
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
                      displayName={u?.fullName || u?.username || m.userId}
                      avatarUrl={u?.avatarUrl}
                      onRoleChange={handleRoleChange}
                      onRemove={handleRemove}
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
    </div>
  );
}