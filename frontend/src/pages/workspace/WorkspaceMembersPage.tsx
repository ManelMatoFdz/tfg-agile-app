import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, UserMinus, UserPlus } from 'lucide-react';
import { workspacesApi } from '../../api/workspaces';
import { usersApi } from '../../api/users';
import { useApiAction } from '../../hooks/useApiAction';
import { useAuthStore } from '../../store/authStore';
import { useUserMap } from '../../hooks/useUserMap';
import Alert from '../../components/ui/Alert';
import type { WorkspaceMember, WorkspaceRole, UserLookup } from '../../types';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.375rem 0.625rem',
  fontSize: '0.75rem',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const card: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '0.25rem 0',
};

const ROLE_STYLE: Record<WorkspaceRole, { color: string; bg: string }> = {
  ADMIN:  { color: 'var(--accent)',    bg: 'var(--accent-muted)' },
  MEMBER: { color: '#16a34a',          bg: 'rgba(22,163,74,0.08)' },
};

function Avatar({ name, avatarUrl, size = 32 }: { name: string; avatarUrl?: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = name.charAt(0).toUpperCase();
  const sizeRem = `${size / 16}rem`;
  const fontSizeRem = `${(size * 0.38) / 16}rem`;
  return (
    <div style={{
      width: sizeRem,
      height: sizeRem,
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
          width: '100%',
          height: '100%',
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: fontSizeRem,
          fontWeight: 700,
        }}>
          {initials}
        </div>
      )}
    </div>
  );
}

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
  const [hovered, setHovered] = useState(false);
  const otherRole: WorkspaceRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
  const isUpdating = updatingId === member.userId;
  const isRemoving = removingId === member.userId;
  const roleStyle = ROLE_STYLE[member.role];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 0.75rem',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
        transition: `background var(--duration)`,
        borderRadius: 'var(--radius-sm)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <Avatar name={displayName} avatarUrl={avatarUrl} size={32} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text)' }}>{displayName}</span>
            {isSelf && (
              <span style={{
                fontSize: '0.625rem',
                color: 'var(--text-faint)',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0 0.3125rem',
              }}>
                {t('common.you')}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-faint)' }}>
            {t('common.since', {
              date: new Date(member.joinedAt).toLocaleDateString(undefined, {
                day: 'numeric', month: 'short', year: 'numeric',
              }),
            })}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <span style={{
          fontSize: '0.625rem',
          fontWeight: 600,
          color: roleStyle.color,
          background: roleStyle.bg,
          borderRadius: 'var(--radius-sm)',
          padding: '0.125rem 0.4375rem',
          letterSpacing: '0.03em',
        }}>
          {t(`workspace.members.roles.${member.role}`)}
        </span>

        {isAdmin && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.125rem',
            opacity: hovered ? 1 : 0,
            transition: `opacity var(--duration)`,
          }}>
            <button
              onClick={() => onRoleChange(member.userId, otherRole)}
              disabled={isUpdating || isRemoving}
              title={t('workspace.members.changeRoleTitle', { role: t(`workspace.members.roles.${otherRole}`) })}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '1.625rem',
                height: '1.625rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                color: 'var(--text-faint)',
                cursor: isUpdating || isRemoving ? 'not-allowed' : 'pointer',
                transition: `background var(--duration), color var(--duration)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent-muted)';
                e.currentTarget.style.color = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-faint)';
              }}
            >
              {isUpdating ? (
                <div style={{
                  width: '0.75rem', height: '0.75rem',
                  border: '0.125rem solid var(--border)',
                  borderTopColor: 'var(--accent)',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
              ) : (
                <ArrowLeftRight size={12} strokeWidth={2} />
              )}
            </button>

            {!isSelf && (
              <button
                onClick={() => onRemove(member.userId)}
                disabled={isUpdating || isRemoving}
                title={t('workspace.members.removeMember')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '1.625rem',
                  height: '1.625rem',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  background: 'transparent',
                  color: 'var(--text-faint)',
                  cursor: isUpdating || isRemoving ? 'not-allowed' : 'pointer',
                  transition: `background var(--duration), color var(--duration)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--danger-bg)';
                  e.currentTarget.style.color = 'var(--danger)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-faint)';
                }}
              >
                {isRemoving ? (
                  <div style={{
                    width: '0.75rem', height: '0.75rem',
                    border: '0.125rem solid var(--border)',
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
    </div>
  );
}

function LookedUpAvatar({ user }: { user: UserLookup }) {
  const label = user.fullName || user.username;
  return <Avatar name={label} avatarUrl={user.avatarUrl} size={32} />;
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
    if (!workspaceId || !inviteEmail.trim() || !lookedUpUser) return;
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
    setUpdatingId(userId);
    setActionError(null);
    try {
      const { data: updated } = await workspacesApi.updateMemberRole(workspaceId, userId, role);
      setMembers((prev) => prev.map((m) => (m.userId === userId ? updated : m)));
      setConfirmRoleChange(null);
    } catch (err) {
      const axiosErr = err as import('axios').AxiosError<{ errorCode?: string }>;
      const code = axiosErr.response?.data?.errorCode;
      setActionError(code ? t(`errors.${code}`, t('workspace.members.errors.changeRole')) : t('workspace.members.errors.changeRole'));
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

  const sectionLabel: React.CSSProperties = {
    fontSize: '0.625rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--text-faint)',
    padding: '0.375rem 0.75rem 0.125rem',
  };

  const modalOverlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  };

  const modalBg: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'var(--bg-overlay)',
  };

  const modalCard: React.CSSProperties = {
    position: 'relative',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    width: '100%',
    maxWidth: '22.5rem',
    boxShadow: '0 1.25rem 3.75rem rgba(0,0,0,0.15)',
  };

  const btnPrimary: React.CSSProperties = {
    flex: 1,
    padding: '0.4375rem 0.875rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
  };

  const btnSecondary: React.CSSProperties = {
    flex: 1,
    padding: '0.4375rem 0.875rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    background: 'var(--bg-hover)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.015em' }}>
            {t('workspace.members.title')}
          </h1>
          <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--text-faint)' }}>
            {members.length === 0
              ? '…'
              : t('workspace.members.count', { count: members.length })}
          </p>
        </div>
        {!showAddForm && isAdmin && (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3125rem',
              padding: '0.3125rem 0.625rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: `background var(--duration)`,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
          >
            <UserPlus size={12} strokeWidth={2.5} />
            {t('workspace.members.addMember')}
          </button>
        )}
      </div>

      {listAction.error && (
        <Alert type="error" message={listAction.error} onClose={listAction.reset} />
      )}
      {actionError && (
        <Alert type="error" message={actionError} onClose={() => setActionError(null)} />
      )}

      {/* Invite form */}
      {showAddForm && isAdmin && (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1rem',
        }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)' }}>
            {t('workspace.members.invite.title')}
          </h3>
          {inviteAction.error && (
            <Alert type="error" message={inviteAction.error} onClose={inviteAction.reset} />
          )}
          {inviteSuccess && (
            <Alert type="success" message={t('workspace.members.invite.success')} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.6875rem',
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  marginBottom: '0.25rem',
                }}>
                  {t('workspace.members.invite.emailLabel')}
                </label>
                <input
                  type="email"
                  placeholder={t('workspace.members.invite.emailPlaceholder')}
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setLookedUpUser(null);
                    setLookupError(null);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(); } }}
                  style={inputStyle}
                />
              </div>
              <button
                type="button"
                onClick={handleLookup}
                disabled={lookupLoading}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  background: 'var(--bg-hover)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: lookupLoading ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                {lookupLoading && (
                  <div style={{
                    width: '0.625rem', height: '0.625rem',
                    border: '0.125rem solid var(--border)',
                    borderTopColor: 'var(--accent)',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                )}
                {t('workspace.members.invite.searchUser')}
              </button>
            </div>

            {lookupError && (
              <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--danger)' }}>{lookupError}</p>
            )}

            {lookedUpUser && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.5rem 0.625rem',
                background: 'rgba(34,197,94,0.06)',
                border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: 'var(--radius-md)',
              }}>
                <LookedUpAvatar user={lookedUpUser} />
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 500, color: 'var(--text)' }}>
                    {lookedUpUser.fullName || lookedUpUser.username}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-faint)' }}>{lookedUpUser.email}</p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                disabled={inviteAction.loading || !lookedUpUser}
                onClick={handleInvite}
                style={{
                  padding: '0.375rem 0.875rem',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: inviteAction.loading || !lookedUpUser ? 'not-allowed' : 'pointer',
                  opacity: inviteAction.loading || !lookedUpUser ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                {inviteAction.loading && (
                  <div style={{
                    width: '0.625rem', height: '0.625rem',
                    border: '0.125rem solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                )}
                {t('workspace.members.invite.sendInvitation')}
              </button>
              <button
                type="button"
                onClick={closeAddForm}
                style={{
                  padding: '0.375rem 0.875rem',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  background: 'var(--bg-hover)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members list */}
      {listAction.loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
          <div style={{
            width: '1.5rem', height: '1.5rem',
            border: '0.125rem solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : members.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.75rem 0' }}>
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)' }}>
            {t('workspace.members.count', { count: 0 })}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {admins.length > 0 && (
            <div style={card}>
              <p style={sectionLabel}>{t('workspace.members.admins')}</p>
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
          )}

          {regularMembers.length > 0 && (
            <div style={card}>
              <p style={sectionLabel}>{t('workspace.members.membersGroup')}</p>
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
          )}
        </div>
      )}

      {/* Confirm role change modal */}
      {confirmRoleChange && (() => {
        const u = userMap.get(confirmRoleChange.userId);
        const displayName = u?.fullName || u?.username || t('common.unknownUser');
        const newRoleLabel = t(`workspace.members.roles.${confirmRoleChange.role}`);
        return (
          <div style={modalOverlay}>
            <div style={modalBg} onClick={() => { setConfirmRoleChange(null); setActionError(null); }} />
            <div style={modalCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '2.25rem', height: '2.25rem',
                  background: 'var(--accent-muted)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <ArrowLeftRight size={16} strokeWidth={2} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>
                    {t('workspace.members.confirmRoleChange.title')}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-faint)' }}>
                    {t('workspace.members.confirmRoleChange.subtitle', { name: displayName, role: newRoleLabel })}
                  </p>
                </div>
              </div>
              <p style={{ margin: '0 0 0.875rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {t('workspace.members.confirmRoleChange.description', { role: newRoleLabel })}
              </p>
              {actionError && (
                <Alert type="error" message={actionError} onClose={() => setActionError(null)} />
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  style={btnSecondary}
                  onClick={() => { setConfirmRoleChange(null); setActionError(null); }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  style={{
                    ...btnPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem',
                    opacity: updatingId === confirmRoleChange.userId ? 0.7 : 1,
                    cursor: updatingId === confirmRoleChange.userId ? 'not-allowed' : 'pointer',
                  }}
                  disabled={updatingId === confirmRoleChange.userId}
                  onClick={() => handleRoleChange(confirmRoleChange.userId, confirmRoleChange.role)}
                >
                  {updatingId === confirmRoleChange.userId && (
                    <div style={{
                        width: '0.625rem', height: '0.625rem',
                        border: '0.125rem solid rgba(255,255,255,0.4)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                  )}
                  {t('common.confirm')}
                </button>
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
          <div style={modalOverlay}>
            <div style={modalBg} onClick={() => setConfirmRemoveId(null)} />
            <div style={modalCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '2.25rem', height: '2.25rem',
                  background: 'var(--danger-bg)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <UserMinus size={16} strokeWidth={2} style={{ color: 'var(--danger)' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>
                    {t('workspace.members.confirmRemove.title')}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-faint)' }}>
                    {t('workspace.members.confirmRemove.subtitle', { name: displayName })}
                  </p>
                </div>
              </div>
              <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {t('workspace.members.confirmRemove.description')}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button style={btnSecondary} onClick={() => setConfirmRemoveId(null)}>
                  {t('common.cancel')}
                </button>
                <button
                  style={{
                    ...btnPrimary,
                    background: 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem',
                    opacity: removingId === confirmRemoveId ? 0.7 : 1,
                    cursor: removingId === confirmRemoveId ? 'not-allowed' : 'pointer',
                  }}
                  disabled={removingId === confirmRemoveId}
                  onClick={() => handleRemove(confirmRemoveId)}
                >
                  {removingId === confirmRemoveId ? (
                    <>
                      <div style={{
                        width: '0.625rem', height: '0.625rem',
                        border: '0.125rem solid rgba(255,255,255,0.4)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }} />
                      {t('workspace.members.confirmRemove.removing')}
                    </>
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