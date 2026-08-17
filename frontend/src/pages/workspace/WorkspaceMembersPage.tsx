import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, UserMinus, UserPlus, Search, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { workspacesApi } from '../../api/workspaces';
import { teamsApi } from '../../api/teams';
import { usersApi } from '../../api/users';
import { useApiAction } from '../../hooks/useApiAction';
import { useAuthStore } from '../../store/authStore';
import { useUserMap } from '../../hooks/useUserMap';
import { buildAvatarSrc } from '../../utils/avatarUrl';
import Alert from '../../components/ui/Alert';
import PageTitle from '../../components/motion/PageTitle';
import type { WorkspaceMember, WorkspaceRole, Team, UserLookup } from '../../types';

const PAGE_SIZE = 5;

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-faint)',
  textAlign: 'left',
  borderBottom: '1px solid var(--border)',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: 13,
  color: 'var(--text)',
  borderBottom: '1px solid var(--border)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  fontSize: 13,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  background: 'rgba(0,0,0,0.5)',
};

const modalCard: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-card)', padding: 24,
  width: '100%', maxWidth: 480,
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 20px', fontSize: 13, fontWeight: 600,
  background: 'var(--accent)', color: 'var(--accent-fg)',
  border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '8px 16px', fontSize: 13, fontWeight: 500,
  background: 'transparent', color: 'var(--text-muted)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
};

function Avatar({ name, avatarUrl, size = 36 }: { name: string; avatarUrl?: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const src = buildAvatarSrc(avatarUrl);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
      {src && !imgError ? (
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" onError={() => setImgError(true)} />
      ) : (
        <div style={{
          width: '100%', height: '100%', background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent-fg)', fontSize: size * 0.38, fontWeight: 700,
        }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function TeamBadge({ name, color }: { name: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px',
      fontSize: 11, fontWeight: 600,
      color, background: `${color}18`,
      border: `1px solid ${color}30`,
      borderRadius: 'var(--radius-pill)',
      whiteSpace: 'nowrap',
    }}>
      {name}
    </span>
  );
}

export default function WorkspaceMembersPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const currentUser = useAuthStore((s) => s.user);

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userTeams, setUserTeams] = useState<Record<string, string[]>>({});
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');

  const [showInviteModal, setShowInviteModal] = useState(false);
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
    if (!workspaceId) return;
    loadMembers();

    // Load teams and build user→teams mapping
    teamsApi.list(workspaceId).then(async (res) => {
      const teamsList = res.data;
      setTeams(teamsList);
      const mapping: Record<string, string[]> = {};
      await Promise.all(
        teamsList.map(async (team) => {
          try {
            const membersRes = await teamsApi.getMembers(team.id);
            membersRes.data.forEach((m) => {
              if (!mapping[m.userId]) mapping[m.userId] = [];
              mapping[m.userId].push(team.id);
            });
          } catch { /* ignore */ }
        }),
      );
      setUserTeams(mapping);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const userMap = useUserMap(members.map((m) => m.userId));
  const isAdmin = members.some((m) => m.userId === currentUser?.id && m.role === 'ADMIN');

  // Build team color map from persisted team color
  const teamColorMap = new Map<string, string>();
  teams.forEach((t) => teamColorMap.set(t.id, t.color || '#6366f1'));

  // Filter members
  const filtered = members.filter((m) => {
    const u = userMap.get(m.userId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = u?.fullName?.toLowerCase().includes(q) || u?.username?.toLowerCase().includes(q) || u?.email?.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (teamFilter !== 'all') {
      const memberTeamIds = userTeams[m.userId] || [];
      if (!memberTeamIds.includes(teamFilter)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageMembers = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const to = Math.min((safePage + 1) * PAGE_SIZE, filtered.length);

  // Reset page when filters change
  useEffect(() => setPage(0), [searchQuery, teamFilter]);

  // Invite handlers
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
      setTimeout(() => {
        setInviteSuccess(false);
        closeInviteModal();
        loadMembers();
      }, 1500);
    }
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
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

  const getDisplayName = (userId: string) => {
    const u = userMap.get(userId);
    return u?.fullName || u?.username || t('common.unknownUser');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <PageTitle>{t('workspace.members.title')}</PageTitle>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-faint)' }}>
            {t('workspace.members.subtitle')}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', fontSize: 13, fontWeight: 600,
              background: 'var(--accent)', color: 'var(--accent-fg)',
              border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              transition: 'background 150ms', flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            <UserPlus size={15} strokeWidth={2.5} />
            {t('workspace.members.inviteToWorkspace')}
          </button>
        )}
      </div>

      {listAction.error && <Alert type="error" message={listAction.error} onClose={listAction.reset} />}
      {actionError && <Alert type="error" message={actionError} onClose={() => setActionError(null)} />}

      {/* Search & filter bar */}
      {!listAction.loading && members.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)', padding: '12px 16px',
        }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <Search size={15} strokeWidth={2} style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-faint)',
            }} />
            <input
              type="text"
              placeholder={t('workspace.members.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 34 }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              style={{
                padding: '8px 12px', fontSize: 13,
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', color: 'var(--text)',
                cursor: 'pointer', outline: 'none',
                fontFamily: 'inherit',
              }}
            >
              <option value="all">{t('workspace.members.allTeams')}</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
            <button
              onClick={() => { setSearchQuery(''); setTeamFilter('all'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 14px', fontSize: 12, fontWeight: 500,
                background: 'var(--bg)', color: 'var(--text-muted)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                cursor: 'pointer', transition: 'background 150ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
            >
              <Filter size={13} strokeWidth={2} />
              {t('workspace.members.filter')}
            </button>
          </div>
        </div>
      )}

      {/* Members table */}
      {listAction.loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--accent-text)',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite',
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: '35%' }}>{t('workspace.members.tableHeader.name')}</th>
                  <th style={{ ...thStyle, width: '25%' }}>{t('workspace.members.tableHeader.team')}</th>
                  <th style={{ ...thStyle, width: '20%' }}>{t('workspace.members.tableHeader.role')}</th>
                  <th style={{ ...thStyle, width: '12%' }}>{t('workspace.members.tableHeader.memberSince')}</th>
                  {isAdmin && <th style={{ ...thStyle, width: '8%', textAlign: 'center' }}>{t('workspace.members.tableHeader.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {pageMembers.map((m) => {
                  const u = userMap.get(m.userId);
                  const displayName = u?.fullName || u?.username || t('common.unknownUser');
                  const email = u?.email || '';
                  const isSelf = m.userId === currentUser?.id;
                  const memberTeamIds = userTeams[m.userId] || [];
                  const otherRole: WorkspaceRole = m.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
                  const isUpdating = updatingId === m.userId;
                  const isRemoving = removingId === m.userId;

                  return (
                    <tr
                      key={m.id}
                      style={{ transition: 'background 150ms' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Name */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar name={displayName} avatarUrl={u?.avatarUrl} size={38} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {displayName}
                              </span>
                              {isSelf && (
                                <span style={{
                                  fontSize: 10, color: 'var(--text-faint)',
                                  background: 'var(--bg-hover)', border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius-sm)', padding: '0 5px',
                                }}>
                                  {t('common.you')}
                                </span>
                              )}
                            </div>
                            {email && (
                              <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Team badges */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {memberTeamIds.length === 0 ? (
                            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>—</span>
                          ) : (
                            memberTeamIds.map((tid) => {
                              const team = teams.find((t) => t.id === tid);
                              if (!team) return null;
                              return <TeamBadge key={tid} name={team.name} color={teamColorMap.get(tid) || '#6366f1'} />;
                            })
                          )}
                        </div>
                      </td>

                      {/* Role */}
                      <td style={tdStyle}>
                        <span style={{ fontSize: 13, color: 'var(--text)' }}>
                          {m.role === 'ADMIN'
                            ? t('workspace.members.roles.ADMIN_FULL')
                            : t('workspace.members.roles.MEMBER')}
                        </span>
                      </td>

                      {/* Member since */}
                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(m.joinedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>

                      {/* Actions */}
                      {isAdmin && (
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <button
                              title={m.role === 'ADMIN'
                                ? t('workspace.members.demoteToMember')
                                : t('workspace.members.promoteToAdmin')}
                              onClick={() => setConfirmRoleChange({ userId: m.userId, role: otherRole })}
                              disabled={isUpdating || isRemoving}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 30, height: 30, background: 'none', border: 'none',
                                borderRadius: 'var(--radius-sm)', cursor: isUpdating || isRemoving ? 'not-allowed' : 'pointer',
                                color: 'var(--text-faint)', opacity: isUpdating || isRemoving ? 0.4 : 1,
                                transition: 'background 150ms, color 150ms',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-faint)'; }}
                            >
                              <ArrowLeftRight size={15} strokeWidth={2} />
                            </button>
                            {!isSelf && (
                              <button
                                title={t('workspace.members.removeMember')}
                                onClick={() => setConfirmRemoveId(m.userId)}
                                disabled={isUpdating || isRemoving}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  width: 30, height: 30, background: 'none', border: 'none',
                                  borderRadius: 'var(--radius-sm)', cursor: isUpdating || isRemoving ? 'not-allowed' : 'pointer',
                                  color: 'var(--text-faint)', opacity: isUpdating || isRemoving ? 0.4 : 1,
                                  transition: 'background 150ms, color 150ms',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger-text)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-faint)'; }}
                              >
                                <UserMinus size={15} strokeWidth={2} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
              {t('workspace.members.showing', { from, to, total: filtered.length })}
            </span>
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)',
                    color: 'var(--text-faint)', cursor: safePage === 0 ? 'not-allowed' : 'pointer',
                    opacity: safePage === 0 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => {
                  // Show first, last, current, and neighbors
                  if (i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 1) {
                    return (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        style={{
                          width: 32, height: 32, fontSize: 12, fontWeight: i === safePage ? 600 : 400,
                          border: i === safePage ? '1px solid var(--accent)' : '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          background: i === safePage ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                          color: i === safePage ? 'var(--accent-text)' : 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        {i + 1}
                      </button>
                    );
                  }
                  // Show ellipsis
                  if (i === 1 && safePage > 2) return <span key="el1" style={{ padding: '0 4px', color: 'var(--text-faint)', fontSize: 12 }}>...</span>;
                  if (i === totalPages - 2 && safePage < totalPages - 3) return <span key="el2" style={{ padding: '0 4px', color: 'var(--text-faint)', fontSize: 12 }}>...</span>;
                  return null;
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)',
                    color: 'var(--text-faint)', cursor: safePage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                    opacity: safePage >= totalPages - 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <div style={modalOverlay} onClick={e => { if (e.target === e.currentTarget) closeInviteModal(); }}>
          <div style={modalCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <UserPlus size={18} strokeWidth={2} style={{ color: 'var(--accent-text)' }} />
                </div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                  {t('workspace.members.invite.title')}
                </h2>
              </div>
              <button onClick={closeInviteModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                {t('workspace.members.invite.growTitle')}
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-faint)' }}>
                {t('workspace.members.invite.growSubtitle')}
              </p>
            </div>

            {inviteAction.error && <div style={{ marginBottom: 12 }}><Alert type="error" message={inviteAction.error} onClose={inviteAction.reset} /></div>}
            {inviteSuccess && <div style={{ marginBottom: 12 }}><Alert type="success" message={t('workspace.members.invite.success')} /></div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                  {t('workspace.members.invite.emailLabel')}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    placeholder={t('workspace.members.invite.emailPlaceholder')}
                    value={inviteEmail}
                    onChange={(e) => { setInviteEmail(e.target.value); setLookedUpUser(null); setLookupError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(); } }}
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  />
                </div>
              </div>

              {lookupError && <p style={{ margin: 0, fontSize: 12, color: 'var(--danger-text)' }}>{lookupError}</p>}

              {lookedUpUser && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', background: 'var(--green-soft)',
                  border: '1px solid var(--green)', borderRadius: 'var(--radius-md)',
                }}>
                  <Avatar name={lookedUpUser.fullName || lookedUpUser.username} avatarUrl={lookedUpUser.avatarUrl} size={36} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                      {lookedUpUser.fullName || lookedUpUser.username}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)' }}>{lookedUpUser.email}</p>
                  </div>
                </div>
              )}

              <button
                onClick={lookedUpUser ? handleInvite : handleLookup}
                disabled={inviteAction.loading || lookupLoading || !inviteEmail.trim()}
                style={{
                  ...btnPrimary, width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: inviteAction.loading || lookupLoading || !inviteEmail.trim() ? 0.5 : 1,
                  cursor: inviteAction.loading || lookupLoading || !inviteEmail.trim() ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={e => { if (!inviteAction.loading && !lookupLoading && inviteEmail.trim()) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
              >
                {(inviteAction.loading || lookupLoading) && (
                  <div style={{
                    width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: 'var(--accent-fg)', borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                )}
                {lookedUpUser
                  ? t('workspace.members.invite.sendInvitation')
                  : t('workspace.members.invite.searchUser')}
              </button>
            </div>

            {/* Member count footer */}
            <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                {t('workspace.members.invite.alreadyInWorkspace', { count: members.length })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Confirm role change modal */}
      {confirmRoleChange && (
        <div style={modalOverlay} onClick={e => { if (e.target === e.currentTarget) { setConfirmRoleChange(null); setActionError(null); } }}>
          <div style={modalCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 40, height: 40, background: 'var(--accent-muted)', borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <ArrowLeftRight size={18} strokeWidth={2} style={{ color: 'var(--accent-text)' }} />
              </div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                {t('workspace.members.confirmRoleChange.title')}
              </h2>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}
              dangerouslySetInnerHTML={{
                __html: t('workspace.members.confirmRoleChange.subtitle', {
                  name: getDisplayName(confirmRoleChange.userId),
                  role: t(`workspace.members.roles.${confirmRoleChange.role}`),
                }),
              }}
            />
            {actionError && <div style={{ marginBottom: 12 }}><Alert type="error" message={actionError} onClose={() => setActionError(null)} /></div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btnSecondary} onClick={() => { setConfirmRoleChange(null); setActionError(null); }}>
                {t('common.cancel')}
              </button>
              <button
                style={{ ...btnPrimary, opacity: updatingId === confirmRoleChange.userId ? 0.7 : 1 }}
                disabled={updatingId === confirmRoleChange.userId}
                onClick={() => handleRoleChange(confirmRoleChange.userId, confirmRoleChange.role)}
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm remove modal */}
      {confirmRemoveId && (
        <div style={modalOverlay} onClick={e => { if (e.target === e.currentTarget) setConfirmRemoveId(null); }}>
          <div style={modalCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 40, height: 40, background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <UserMinus size={18} strokeWidth={2} style={{ color: 'var(--danger-text)' }} />
              </div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                {t('workspace.members.confirmRemove.title')}
              </h2>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}
              dangerouslySetInnerHTML={{
                __html: t('workspace.members.confirmRemove.subtitle', { name: getDisplayName(confirmRemoveId) }),
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btnSecondary} onClick={() => setConfirmRemoveId(null)}>
                {t('common.cancel')}
              </button>
              <button
                style={{ ...btnPrimary, background: 'var(--danger)', opacity: removingId === confirmRemoveId ? 0.7 : 1 }}
                disabled={removingId === confirmRemoveId}
                onClick={() => handleRemove(confirmRemoveId)}
              >
                {t('workspace.members.confirmRemove.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}