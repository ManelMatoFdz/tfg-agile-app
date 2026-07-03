import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, UserMinus, UserPlus, Search, MoreHorizontal } from 'lucide-react';
import { workspacesApi } from '../../api/workspaces';
import { usersApi } from '../../api/users';
import { useApiAction } from '../../hooks/useApiAction';
import { useAuthStore } from '../../store/authStore';
import { useUserMap } from '../../hooks/useUserMap';
import Alert from '../../components/ui/Alert';
import PageTitle from '../../components/motion/PageTitle';
import type { WorkspaceMember, WorkspaceRole, UserLookup } from '../../types';

const ROLE_STYLE: Record<WorkspaceRole, { color: string; bg: string }> = {
  ADMIN:  { color: 'var(--accent)',  bg: 'var(--accent-muted)' },
  MEMBER: { color: 'var(--success)', bg: 'var(--success-bg)' },
};

function Avatar({ name, avatarUrl, size = 36 }: { name: string; avatarUrl?: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = name.charAt(0).toUpperCase();
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {avatarUrl && !imgError ? (
        <img
          src={avatarUrl} alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent-fg)', fontSize: size * 0.4, fontWeight: 600,
        }}>
          {initials}
        </div>
      )}
    </div>
  );
}

function LookedUpAvatar({ user }: { user: UserLookup }) {
  const label = user.fullName || user.username;
  return <Avatar name={label} avatarUrl={user.avatarUrl} size={36} />;
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const u = userMap.get(m.userId);
    const q = searchQuery.toLowerCase();
    return (
      u?.fullName?.toLowerCase().includes(q) ||
      u?.username?.toLowerCase().includes(q) ||
      u?.email?.toLowerCase().includes(q)
    );
  });

  const modalOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  };
  const modalBgStyle: React.CSSProperties = {
    position: 'absolute', inset: 0,
    backgroundColor: 'var(--bg-overlay)',
    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
    animation: 'fade-in 200ms ease both',
  };
  const modalCardStyle: React.CSSProperties = {
    position: 'relative',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '24px',
    width: '100%', maxWidth: 400,
    boxShadow: 'var(--shadow-lg)',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <PageTitle>
            {t('workspace.members.title')}
          </PageTitle>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>
            {members.length === 0
              ? '...'
              : t('workspace.members.count', { count: members.length })}
          </p>
        </div>
        {!showAddForm && isAdmin && (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', fontSize: 13, fontWeight: 600,
              background: 'var(--accent)', color: 'var(--accent-fg)',
              border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
          >
            <UserPlus size={15} strokeWidth={2.5} />
            {t('workspace.members.addMember')}
          </button>
        )}
      </div>

      {listAction.error && <Alert type="error" message={listAction.error} onClose={listAction.reset} />}
      {actionError && <Alert type="error" message={actionError} onClose={() => setActionError(null)} />}

      {/* Invite form */}
      {showAddForm && isAdmin && (
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)', padding: '20px 24px', marginBottom: 20,
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
            {t('workspace.members.invite.title')}
          </h3>
          {inviteAction.error && <Alert type="error" message={inviteAction.error} onClose={inviteAction.reset} />}
          {inviteSuccess && <Alert type="success" message={t('workspace.members.invite.success')} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
                  {t('workspace.members.invite.emailLabel')}
                </label>
                <input
                  type="email"
                  placeholder={t('workspace.members.invite.emailPlaceholder')}
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setLookedUpUser(null); setLookupError(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(); } }}
                  style={{
                    width: '100%', padding: '9px 12px', fontSize: 14,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text)',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <button
                type="button" onClick={handleLookup} disabled={lookupLoading}
                style={{
                  padding: '9px 16px', fontSize: 13, fontWeight: 500,
                  background: 'var(--bg-hover)', color: 'var(--text-muted)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                  cursor: lookupLoading ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {lookupLoading && (
                  <div style={{
                    width: 12, height: 12, border: '2px solid var(--border)',
                    borderTopColor: 'var(--accent)', borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                )}
                {t('workspace.members.invite.searchUser')}
              </button>
            </div>

            {lookupError && <p style={{ margin: 0, fontSize: 13, color: 'var(--danger)' }}>{lookupError}</p>}

            {lookedUpUser && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: 'var(--success-bg)',
                border: '1px solid var(--success)', borderRadius: 'var(--radius-md)',
              }}>
                <LookedUpAvatar user={lookedUpUser} />
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                    {lookedUpUser.fullName || lookedUpUser.username}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-faint)' }}>{lookedUpUser.email}</p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button" disabled={inviteAction.loading || !lookedUpUser} onClick={handleInvite}
                style={{
                  padding: '9px 18px', fontSize: 13, fontWeight: 600,
                  background: 'var(--accent)', color: 'var(--accent-fg)',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  cursor: inviteAction.loading || !lookedUpUser ? 'not-allowed' : 'pointer',
                  opacity: inviteAction.loading || !lookedUpUser ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {inviteAction.loading && (
                  <div style={{
                    width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: 'var(--accent-fg)', borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                )}
                {t('workspace.members.invite.sendInvitation')}
              </button>
              <button
                type="button" onClick={closeAddForm}
                style={{
                  padding: '9px 18px', fontSize: 13, fontWeight: 500,
                  background: 'var(--bg)', color: 'var(--text-muted)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search bar */}
      {!listAction.loading && members.length > 0 && (
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={16} strokeWidth={2} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-faint)',
          }} />
          <input
            type="text"
            placeholder={t('workspace.members.searchPlaceholder', { defaultValue: 'Search members...' })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 38px', fontSize: 14,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', color: 'var(--text)',
              outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>
      )}

      {/* Members table */}
      {listAction.loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: 28, height: 28, border: '3px solid var(--border)',
            borderTopColor: 'var(--accent)', borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : members.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--text-muted)' }}>
            {t('workspace.members.count', { count: 0 })}
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)', overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 120px 100px',
            padding: '10px 20px', borderBottom: '1px solid var(--border)',
            background: 'var(--bg)',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
              {t('workspace.members.tableHeader.name', { defaultValue: 'NAME' })}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
              {t('workspace.members.tableHeader.role', { defaultValue: 'ROLE' })}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)', textAlign: 'right' }}>
              {t('workspace.members.tableHeader.actions', { defaultValue: 'ACTIONS' })}
            </span>
          </div>

          {/* Table rows */}
          {filteredMembers.map((m, idx) => {
            const u = userMap.get(m.userId);
            const displayName = u?.fullName || u?.username || t('common.unknownUser');
            const isSelf = m.userId === currentUser?.id;
            const roleStyle = ROLE_STYLE[m.role];
            const otherRole: WorkspaceRole = m.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
            const isUpdating = updatingId === m.userId;
            const isRemoving = removingId === m.userId;

            return (
              <div
                key={m.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px 100px',
                  padding: '12px 20px', alignItems: 'center',
                  borderBottom: idx < filteredMembers.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Name + email */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <Avatar name={displayName} avatarUrl={u?.avatarUrl} size={36} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{displayName}</span>
                      {isSelf && (
                        <span style={{
                          fontSize: 11, color: 'var(--text-faint)',
                          background: 'var(--bg-hover)', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)', padding: '0 6px',
                        }}>
                          {t('common.you')}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)' }}>
                      {t('common.since', {
                        date: new Date(m.joinedAt).toLocaleDateString(undefined, {
                          day: 'numeric', month: 'short', year: 'numeric',
                        }),
                      })}
                    </p>
                  </div>
                </div>

                {/* Role badge */}
                <div>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: roleStyle.color, background: roleStyle.bg,
                    borderRadius: 'var(--radius-pill)', padding: '3px 10px',
                  }}>
                    {t(`workspace.members.roles.${m.role}`)}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => setConfirmRoleChange({ userId: m.userId, role: otherRole })}
                        disabled={isUpdating || isRemoving}
                        title={t('workspace.members.changeRoleTitle', { role: t(`workspace.members.roles.${otherRole}`) })}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 30, height: 30, border: 'none', borderRadius: 'var(--radius-sm)',
                          background: 'transparent', color: 'var(--text-faint)',
                          cursor: isUpdating || isRemoving ? 'not-allowed' : 'pointer',
                          transition: 'background 150ms, color 150ms',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-muted)'; e.currentTarget.style.color = 'var(--accent)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)'; }}
                      >
                        {isUpdating ? (
                          <div style={{
                            width: 14, height: 14, border: '2px solid var(--border)',
                            borderTopColor: 'var(--accent)', borderRadius: '50%',
                            animation: 'spin 0.7s linear infinite',
                          }} />
                        ) : (
                          <ArrowLeftRight size={14} strokeWidth={2} />
                        )}
                      </button>

                      {!isSelf && (
                        <button
                          onClick={() => setConfirmRemoveId(m.userId)}
                          disabled={isUpdating || isRemoving}
                          title={t('workspace.members.removeMember')}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 30, height: 30, border: 'none', borderRadius: 'var(--radius-sm)',
                            background: 'transparent', color: 'var(--text-faint)',
                            cursor: isUpdating || isRemoving ? 'not-allowed' : 'pointer',
                            transition: 'background 150ms, color 150ms',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)'; }}
                        >
                          {isRemoving ? (
                            <div style={{
                              width: 14, height: 14, border: '2px solid var(--border)',
                              borderTopColor: 'var(--danger)', borderRadius: '50%',
                              animation: 'spin 0.7s linear infinite',
                            }} />
                          ) : (
                            <UserMinus size={14} strokeWidth={2} />
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm role change modal */}
      {confirmRoleChange && (() => {
        const u = userMap.get(confirmRoleChange.userId);
        const displayName = u?.fullName || u?.username || t('common.unknownUser');
        const newRoleLabel = t(`workspace.members.roles.${confirmRoleChange.role}`);
        return (
          <div style={modalOverlay}>
            <div style={modalBgStyle} onClick={() => { setConfirmRoleChange(null); setActionError(null); }} />
            <div style={modalCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 40, height: 40,
                  background: 'var(--accent-muted)', borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <ArrowLeftRight size={18} strokeWidth={2} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                    {t('workspace.members.confirmRoleChange.title')}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-faint)' }}>
                    {t('workspace.members.confirmRoleChange.subtitle', { name: displayName, role: newRoleLabel })}
                  </p>
                </div>
              </div>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-muted)' }}>
                {t('workspace.members.confirmRoleChange.description', { role: newRoleLabel })}
              </p>
              {actionError && <Alert type="error" message={actionError} onClose={() => setActionError(null)} />}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  style={{
                    flex: 1, padding: '9px 16px', fontSize: 13, fontWeight: 500,
                    background: 'var(--bg)', color: 'var(--text-muted)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  }}
                  onClick={() => { setConfirmRoleChange(null); setActionError(null); }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  style={{
                    flex: 1, padding: '9px 16px', fontSize: 13, fontWeight: 600,
                    background: 'var(--accent)', color: 'var(--accent-fg)',
                    border: 'none', borderRadius: 'var(--radius-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: updatingId === confirmRoleChange.userId ? 0.7 : 1,
                    cursor: updatingId === confirmRoleChange.userId ? 'not-allowed' : 'pointer',
                  }}
                  disabled={updatingId === confirmRoleChange.userId}
                  onClick={() => handleRoleChange(confirmRoleChange.userId, confirmRoleChange.role)}
                >
                  {updatingId === confirmRoleChange.userId && (
                    <div style={{
                      width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: 'var(--accent-fg)', borderRadius: '50%',
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
            <div style={modalBgStyle} onClick={() => setConfirmRemoveId(null)} />
            <div style={modalCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 40, height: 40,
                  background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <UserMinus size={18} strokeWidth={2} style={{ color: 'var(--danger)' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                    {t('workspace.members.confirmRemove.title')}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-faint)' }}>
                    {t('workspace.members.confirmRemove.subtitle', { name: displayName })}
                  </p>
                </div>
              </div>
              <p style={{ margin: '0 0 18px', fontSize: 14, color: 'var(--text-muted)' }}>
                {t('workspace.members.confirmRemove.description')}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  style={{
                    flex: 1, padding: '9px 16px', fontSize: 13, fontWeight: 500,
                    background: 'var(--bg)', color: 'var(--text-muted)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  }}
                  onClick={() => setConfirmRemoveId(null)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  style={{
                    flex: 1, padding: '9px 16px', fontSize: 13, fontWeight: 600,
                    background: 'var(--danger)', color: 'var(--accent-fg)',
                    border: 'none', borderRadius: 'var(--radius-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: removingId === confirmRemoveId ? 0.7 : 1,
                    cursor: removingId === confirmRemoveId ? 'not-allowed' : 'pointer',
                  }}
                  disabled={removingId === confirmRemoveId}
                  onClick={() => handleRemove(confirmRemoveId)}
                >
                  {removingId === confirmRemoveId ? (
                    <>
                      <div style={{
                        width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)',
                        borderTopColor: 'var(--accent-fg)', borderRadius: '50%',
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