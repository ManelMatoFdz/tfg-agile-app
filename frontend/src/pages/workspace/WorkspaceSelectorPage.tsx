import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, ArrowRight, LayoutGrid, X, Users } from 'lucide-react';
import { workspacesApi } from '../../api/workspaces';
import { invitationsApi } from '../../api/invitations';
import { useApiAction } from '../../hooks/useApiAction';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useAuthStore } from '../../store/authStore';
import Alert from '../../components/ui/Alert';
import TopBar from '../../components/ui/TopBar';
import type { Workspace, WorkspaceInvitation, WorkspaceRole } from '../../types';

export default function WorkspaceSelectorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const { user: currentUser } = useAuthStore();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [workspaceMeta, setWorkspaceMeta] = useState<Record<string, { memberCount: number; myRole: WorkspaceRole }>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [actingInvitationId, setActingInvitationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');


  const listAction = useApiAction<Workspace[]>();
  const createAction = useApiAction<Workspace>();

  const loadWorkspaceMeta = (wsList: Workspace[]) => {
    wsList.forEach((ws) => {
      workspacesApi.getMembers(ws.id).then((res) => {
        const members = res.data;
        const me = members.find((m) => m.userId === currentUser?.id);
        setWorkspaceMeta((prev) => ({
          ...prev,
          [ws.id]: { memberCount: members.length, myRole: me?.role ?? 'MEMBER' },
        }));
      }).catch(() => {});
    });
  };

  useEffect(() => {
    listAction.run(workspacesApi.list()).then((data) => {
      if (data) {
        setWorkspaces(data);
        loadWorkspaceMeta(data);
      } else {
        setLoadError(t('workspace.selector.loadError'));
      }
    });
    invitationsApi.getPending().then((res) => {
      setInvitations(res.data);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (workspace: Workspace) => {
    setWorkspace(workspace.id);
    navigate(`/workspaces/${workspace.id}`);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const data = await createAction.run(workspacesApi.create({ name, description: description || undefined }));
    if (data) {
      setWorkspace(data.id);
      navigate(`/workspaces/${data.id}`);
    }
  };

  const handleInvitationAction = async (invitationId: string, action: 'accept' | 'reject') => {
    setActingInvitationId(invitationId);
    try {
      if (action === 'accept') {
        await invitationsApi.accept(invitationId);
        const updated = await workspacesApi.list();
        setWorkspaces(updated.data);
        loadWorkspaceMeta(updated.data);
      } else {
        await invitationsApi.reject(invitationId);
      }
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch {
      // silently ignore
    } finally {
      setActingInvitationId(null);
    }
  };

  const filteredWorkspaces = workspaces.filter((ws) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return ws.name.toLowerCase().includes(q) || ws.description?.toLowerCase().includes(q);
  });

  const COLORS = ['#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706', '#0891B2'];
  const getColor = (idx: number) => COLORS[idx % COLORS.length];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopBar />

      {/* Main content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{
              margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--text)',
              letterSpacing: '-0.03em', fontFamily: 'var(--font-display)',
            }}>
              {t('workspace.selector.title')}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>
              {t('workspace.selector.subtitle')}
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', fontSize: 13, fontWeight: 600,
              background: 'var(--accent)', color: 'var(--accent-fg)',
              border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            <Plus size={15} strokeWidth={2.5} />
            {t('workspace.selector.createNew')}
          </button>
        </div>

        {loadError && <Alert type="error" message={loadError} onClose={() => setLoadError(null)} />}

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <Search size={16} strokeWidth={2} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-faint)',
          }} />
          <input
            type="text"
            placeholder={t('workspace.selector.searchPlaceholder', { defaultValue: 'Search workspaces...' })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 38px',
              fontSize: 14, background: 'var(--bg-elevated)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 150ms',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{
              margin: '0 0 10px', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)',
            }}>
              {t('workspace.selector.pendingInvitations')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {invitations.map((inv) => (
                <div key={inv.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-card)', padding: '14px 18px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 40, height: 40, flexShrink: 0,
                      background: 'var(--accent)', borderRadius: 'var(--radius-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--accent-fg)', fontSize: 16, fontWeight: 700,
                    }}>
                      {inv.workspaceName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                        {inv.workspaceName}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
                        {t('workspace.selector.invitedToJoin')}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => handleInvitationAction(inv.id, 'accept')}
                      disabled={actingInvitationId === inv.id}
                      style={{
                        padding: '6px 14px', fontSize: 12, fontWeight: 600,
                        color: 'var(--accent-fg)', background: 'var(--success)',
                        border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        opacity: actingInvitationId === inv.id ? 0.5 : 1,
                        transition: 'opacity 150ms',
                      }}
                    >
                      {actingInvitationId === inv.id ? '...' : t('workspace.members.invite.accept')}
                    </button>
                    <button
                      onClick={() => handleInvitationAction(inv.id, 'reject')}
                      disabled={actingInvitationId === inv.id}
                      style={{
                        padding: '6px 14px', fontSize: 12, fontWeight: 500,
                        color: 'var(--text-muted)', background: 'var(--bg)',
                        border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        opacity: actingInvitationId === inv.id ? 0.5 : 1,
                      }}
                    >
                      {t('workspace.members.invite.reject')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workspace list */}
        {listAction.loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
            <div style={{
              width: 28, height: 28,
              border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
              borderRadius: '50%', animation: 'spin 0.7s linear infinite',
            }} />
          </div>
        ) : filteredWorkspaces.length > 0 ? (
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)', overflow: 'hidden',
          }}>
            {filteredWorkspaces.map((ws, idx) => (
              <div
                key={ws.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', gap: 16,
                  borderBottom: idx < filteredWorkspaces.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 150ms',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => handleSelect(ws)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: 42, height: 42, flexShrink: 0,
                    background: getColor(idx), borderRadius: 'var(--radius-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 17, fontWeight: 700,
                  }}>
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                      {ws.name}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3 }}>
                      {workspaceMeta[ws.id] && (
                        <>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                            <Users size={12} strokeWidth={2} />
                            {workspaceMeta[ws.id].memberCount} {workspaceMeta[ws.id].memberCount === 1
                              ? t('workspace.selector.member', { defaultValue: 'member' })
                              : t('workspace.selector.members', { defaultValue: 'members' })}
                          </span>
                          <span style={{
                            fontSize: 11, fontWeight: 600, letterSpacing: '0.03em',
                            padding: '1px 8px', borderRadius: 'var(--radius-pill)',
                            background: workspaceMeta[ws.id].myRole === 'ADMIN' ? 'var(--accent-muted)' : 'var(--bg-hover)',
                            color: workspaceMeta[ws.id].myRole === 'ADMIN' ? 'var(--accent)' : 'var(--text-muted)',
                          }}>
                            {workspaceMeta[ws.id].myRole === 'ADMIN'
                              ? t('workspace.selector.roleAdmin', { defaultValue: 'Admin' })
                              : t('workspace.selector.roleMember', { defaultValue: 'Member' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSelect(ws); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 16px', fontSize: 13, fontWeight: 600,
                      background: 'var(--accent)', color: 'var(--accent-fg)',
                      border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={e => { e.stopPropagation(); (e.currentTarget.style.background = 'var(--accent-hover)'); }}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
                  >
                    {t('workspace.selector.launch', { defaultValue: 'Launch' })}
                    <ArrowRight size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : workspaces.length > 0 && filteredWorkspaces.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
          }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
              {t('workspace.selector.noSearchResults', { defaultValue: 'No workspaces match your search.' })}
            </p>
          </div>
        ) : (
          !listAction.loading && (
            <div style={{
              background: 'var(--bg-elevated)', border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-card)', padding: '48px 32px',
              textAlign: 'center',
            }}>
              <div style={{
                width: 56, height: 56, margin: '0 auto 16px',
                background: 'var(--accent-muted)', borderRadius: 'var(--radius-lg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LayoutGrid size={24} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
              </div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                {t('workspace.selector.noWorkspaces')}
              </p>
              <p style={{ margin: '6px 0 20px', fontSize: 14, color: 'var(--text-muted)' }}>
                {t('workspace.selector.noWorkspacesSubtitle')}
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 20px', fontSize: 14, fontWeight: 600,
                  background: 'var(--accent)', color: 'var(--accent-fg)',
                  border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                }}
              >
                <Plus size={16} strokeWidth={2.5} />
                {t('workspace.selector.createNew')}
              </button>
            </div>
          )
        )}

      </div>

      {/* Create workspace modal */}
      {showCreateForm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
            backgroundColor: 'var(--bg-overlay)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            animation: 'fade-in 200ms ease both',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowCreateForm(false); createAction.reset(); } }}
        >
          <div style={{
            width: '100%', maxWidth: 440,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 24px', borderBottom: '1px solid var(--border)',
            }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                {t('workspace.selector.form.title')}
              </h2>
              <button
                onClick={() => { setShowCreateForm(false); createAction.reset(); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, border: 'none', background: 'transparent',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-faint)',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {createAction.error && (
                  <Alert type="error" message={createAction.error} onClose={createAction.reset} />
                )}
                <div>
                  <label style={{
                    display: 'block', fontSize: 13, fontWeight: 500,
                    color: 'var(--text-muted)', marginBottom: 6,
                  }}>
                    {t('workspace.selector.form.name')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('workspace.selector.form.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                    style={{
                      width: '100%', padding: '9px 12px', fontSize: 14,
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text)',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block', fontSize: 13, fontWeight: 500,
                    color: 'var(--text-muted)', marginBottom: 6,
                  }}>
                    {t('workspace.selector.form.description', { optional: t('common.optional') })}
                  </label>
                  <input
                    type="text"
                    placeholder={t('workspace.selector.form.descriptionPlaceholder')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{
                      width: '100%', padding: '9px 12px', fontSize: 14,
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text)',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  />
                </div>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'flex-end', gap: 8,
                padding: '14px 24px', borderTop: '1px solid var(--border)',
              }}>
                <button
                  type="button"
                  onClick={() => { setShowCreateForm(false); createAction.reset(); }}
                  style={{
                    padding: '8px 16px', fontSize: 13, fontWeight: 500,
                    background: 'var(--bg)', color: 'var(--text-muted)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createAction.loading || !name.trim()}
                  style={{
                    padding: '8px 20px', fontSize: 13, fontWeight: 600,
                    background: 'var(--accent)', color: 'var(--accent-fg)',
                    border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    opacity: createAction.loading || !name.trim() ? 0.5 : 1,
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => { if (!createAction.loading && name.trim()) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
                >
                  {createAction.loading ? '...' : t('workspace.selector.form.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}