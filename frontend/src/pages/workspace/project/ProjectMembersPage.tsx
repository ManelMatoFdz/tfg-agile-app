import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { projectsApi } from '../../../api/projects';
import { workspacesApi } from '../../../api/workspaces';
import { useApiAction } from '../../../hooks/useApiAction';
import { useUserMap } from '../../../hooks/useUserMap';
import { useAuthStore } from '../../../store/authStore';
import Alert from '../../../components/ui/Alert';
import type { ProjectMember, ProjectRole, ScrumRole, WorkspaceMember } from '../../../types';

const PROJECT_ROLES: ProjectRole[] = ['ADMIN', 'MEMBER', 'VIEWER'];
const SCRUM_ROLES: (ScrumRole | null)[] = [null, 'PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER'];

const ROLE_COLORS: Record<ProjectRole, string> = {
  ADMIN: 'bg-primary-100 text-primary-700',
  MEMBER: 'bg-emerald-100 text-emerald-700',
  VIEWER: 'bg-gray-100 text-gray-600',
};

function MemberRow({
  member, name, avatarUrl, isSelf, isAdmin,
  isUpdatingRole, isUpdatingScrum, isRemoving,
  onRoleChange, onScrumRoleChange, onRemove,
}: {
  member: ProjectMember;
  name: string;
  avatarUrl?: string;
  isSelf: boolean;
  isAdmin: boolean;
  isUpdatingRole: boolean;
  isUpdatingScrum: boolean;
  isRemoving: boolean;
  onRoleChange: (role: ProjectRole) => void;
  onScrumRoleChange: (role: ScrumRole | null) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex items-center justify-between py-3 px-2 gap-3 hover:bg-gray-50/70 rounded-xl transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
          {avatarUrl && !imgError ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={() => setImgError(true)} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
            {isSelf && (
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">{t('common.you')}</span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {t('common.since', { date: new Date(member.joinedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isAdmin ? (
          <select
            value={member.scrumRole ?? ''}
            disabled={isUpdatingScrum}
            onChange={(e) => onScrumRoleChange((e.target.value as ScrumRole) || null)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-300 disabled:opacity-50 cursor-pointer"
          >
            <option value="">{t('projects.members.scrumRoles.none')}</option>
            {SCRUM_ROLES.filter(Boolean).map((r) => (
              <option key={r!} value={r!}>{t(`projects.members.scrumRoles.${r}`)}</option>
            ))}
          </select>
        ) : member.scrumRole ? (
          <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
            {t(`projects.members.scrumRoles.${member.scrumRole}`)}
          </span>
        ) : null}

        {isAdmin ? (
          <select
            value={member.role}
            disabled={isUpdatingRole}
            onChange={(e) => onRoleChange(e.target.value as ProjectRole)}
            className={`text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-300 disabled:opacity-50 cursor-pointer ${ROLE_COLORS[member.role]}`}
          >
            {PROJECT_ROLES.map((r) => (
              <option key={r} value={r}>{t(`projects.members.roles.${r}`)}</option>
            ))}
          </select>
        ) : (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[member.role]}`}>
            {t(`projects.members.roles.${member.role}`)}
          </span>
        )}

        {isAdmin && !isSelf && (
          <button
            onClick={onRemove}
            disabled={isRemoving}
            title={t('projects.members.removeMember')}
            className="p-1.5 text-gray-300 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-40 rounded-lg hover:bg-red-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

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

  // Add member modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [wsMembersLoading, setWsMembersLoading] = useState(false);
  const [wsMembers, setWsMembers] = useState<WorkspaceMember[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('MEMBER');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const membersAction = useApiAction<ProjectMember[]>();

  useEffect(() => {
    if (!projectId) return;
    membersAction.run(projectsApi.getMembers(projectId)).then((data) => {
      if (!data) return;
      setMembers(data);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const allUserIds = [
    ...members.map((m) => m.userId),
    ...wsMembers.map((m) => m.userId),
  ];
  const userMap = useUserMap(allUserIds);
  const isAdmin = members.some((m) => m.userId === currentUser?.id && m.role === 'ADMIN');

  const displayName = (userId: string) => {
    const u = userMap.get(userId);
    return u?.fullName || u?.username || t('common.unknownUser');
  };

  // ── Add member ──────────────────────────────────────────────────────────

  const openAddModal = async () => {
    setShowAddModal(true);
    setSearch('');
    setSelectedUserId('');
    setSelectedRole('MEMBER');
    setAddError(null);
    if (!workspaceId) return;
    setWsMembersLoading(true);
    try {
      const res = await workspacesApi.getMembers(workspaceId);
      setWsMembers(res.data);
    } catch {
      setAddError(t('projects.members.add.error'));
    } finally {
      setWsMembersLoading(false);
    }
  };

  const candidateMembers = wsMembers.filter(
    (wm) =>
      !members.some((pm) => pm.userId === wm.userId) &&
      (search.trim() === '' ||
        displayName(wm.userId).toLowerCase().includes(search.toLowerCase())),
  );

  const handleAddMember = async () => {
    if (!projectId || !selectedUserId) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await projectsApi.addMember(projectId, { userId: selectedUserId, role: selectedRole });
      setMembers((prev) => [...prev, res.data]);
      setShowAddModal(false);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { errorCode?: string } } })?.response?.data?.errorCode;
      setAddError(code ? t(`errors.${code}`) : t('projects.members.add.error'));
    } finally {
      setAdding(false);
    }
  };

  // ── Change role ─────────────────────────────────────────────────────────

  const handleRoleChange = async (userId: string, role: ProjectRole) => {
    if (!projectId) return;
    setUpdatingRoleId(userId);
    setActionError(null);
    try {
      const res = await projectsApi.updateMemberRole(projectId, userId, role);
      setMembers((prev) => prev.map((m) => (m.userId === userId ? res.data : m)));
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { errorCode?: string } } })?.response?.data?.errorCode;
      setActionError(code ? t(`errors.${code}`) : t('projects.members.errors.changeRole'));
    } finally {
      setUpdatingRoleId(null);
    }
  };

  // ── Change scrum role ───────────────────────────────────────────────────

  const handleScrumRoleChange = async (userId: string, scrumRole: ScrumRole | null) => {
    if (!projectId) return;
    setUpdatingScrumId(userId);
    setActionError(null);
    try {
      const res = await projectsApi.updateScrumRole(projectId, userId, scrumRole);
      setMembers((prev) => prev.map((m) => (m.userId === userId ? res.data : m)));
    } catch {
      setActionError(t('projects.members.errors.changeScrumRole'));
    } finally {
      setUpdatingScrumId(null);
    }
  };

  // ── Remove member ───────────────────────────────────────────────────────

  const handleRemove = async () => {
    if (!projectId || !confirmRemove) return;
    setRemovingId(confirmRemove.userId);
    setRemoveError(null);
    try {
      await projectsApi.removeMember(projectId, confirmRemove.userId);
      setMembers((prev) => prev.filter((m) => m.userId !== confirmRemove.userId));
      setConfirmRemove(null);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { errorCode?: string } } })?.response?.data?.errorCode;
      setRemoveError(code ? t(`errors.${code}`) : t('projects.members.errors.remove'));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="glass-card-strong p-6">
      {(membersAction.error || actionError) && (
        <Alert
          type="error"
          message={membersAction.error ?? actionError!}
          onClose={() => { membersAction.reset(); setActionError(null); }}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          {t('projects.members.title')}
          {members.length > 0 && (
            <span className="ml-2 text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {members.length}
            </span>
          )}
        </h2>
        {isAdmin && (
          <button
            onClick={openAddModal}
            className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors cursor-pointer"
          >
            + {t('projects.members.addMember')}
          </button>
        )}
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
                name={displayName(m.userId)}
                avatarUrl={u?.avatarUrl}
                isSelf={m.userId === currentUser?.id}
                isAdmin={isAdmin}
                isUpdatingRole={updatingRoleId === m.userId}
                isUpdatingScrum={updatingScrumId === m.userId}
                isRemoving={removingId === m.userId}
                onRoleChange={(role) => handleRoleChange(m.userId, role)}
                onScrumRoleChange={(role) => handleScrumRoleChange(m.userId, role)}
                onRemove={() => setConfirmRemove(m)}
              />
            );
          })}
        </div>
      )}

      {/* Add member modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative glass-card-strong rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
            <h3 className="text-base font-semibold text-gray-900 mb-4">{t('projects.members.add.title')}</h3>

            {addError && <Alert type="error" message={addError} onClose={() => setAddError(null)} />}

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('projects.members.add.searchPlaceholder')}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 bg-white/60 mb-3"
            />

            {wsMembersLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : candidateMembers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">{t('projects.members.add.noResults')}</p>
            ) : (
              <ul className="max-h-52 overflow-y-auto divide-y divide-gray-100 mb-4 border border-gray-100 rounded-xl">
                {candidateMembers.map((wm) => {
                  const n = displayName(wm.userId);
                  return (
                    <li
                      key={wm.userId}
                      onClick={() => setSelectedUserId(wm.userId)}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                        selectedUserId === wm.userId ? 'bg-primary-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {n.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-800">{n}</span>
                      {selectedUserId === wm.userId && (
                        <svg className="w-4 h-4 text-primary-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('projects.members.add.roleLabel')}
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 bg-white/60"
              >
                {PROJECT_ROLES.map((r) => (
                  <option key={r} value={r}>{t(`projects.members.roles.${r}`)}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddMember}
                disabled={adding || !selectedUserId}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {adding ? t('projects.members.add.adding') : t('projects.members.add.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove confirm modal */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setConfirmRemove(null); setRemoveError(null); }} />
          <div className="relative glass-card-strong rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
            <h3 className="text-base font-semibold text-gray-900 mb-2">{t('projects.members.confirmRemove.title')}</h3>
            <p
              className="text-sm text-gray-600 mb-4"
              dangerouslySetInnerHTML={{ __html: t('projects.members.confirmRemove.message', { name: displayName(confirmRemove.userId) }) }}
            />
            {removeError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4">{removeError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmRemove(null); setRemoveError(null); }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleRemove}
                disabled={removingId === confirmRemove.userId}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {removingId === confirmRemove.userId
                  ? t('projects.members.confirmRemove.removing')
                  : t('projects.members.confirmRemove.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}