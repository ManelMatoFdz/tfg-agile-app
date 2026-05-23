import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, ChevronRight, LayoutGrid } from 'lucide-react';
import { workspacesApi } from '../../api/workspaces';
import { invitationsApi } from '../../api/invitations';
import { useApiAction } from '../../hooks/useApiAction';
import { useWorkspaceStore } from '../../store/workspaceStore';
import Alert from '../../components/ui/Alert';
import type { Workspace, WorkspaceInvitation } from '../../types';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  fontSize: 13,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 5,
};

export default function WorkspaceSelectorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [actingInvitationId, setActingInvitationId] = useState<string | null>(null);
  const [hoveredWorkspaceId, setHoveredWorkspaceId] = useState<string | null>(null);

  const listAction = useApiAction<Workspace[]>();
  const createAction = useApiAction<Workspace>();

  useEffect(() => {
    listAction.run(workspacesApi.list()).then((data) => {
      if (data) setWorkspaces(data);
      else setLoadError(t('workspace.selector.loadError'));
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '48px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, margin: '0 auto 14px',
            background: 'var(--accent)', borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LayoutGrid size={22} strokeWidth={1.75} style={{ color: '#fff' }} />
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {t('workspace.selector.title')}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-faint)' }}>
            {t('workspace.selector.subtitle')}
          </p>
        </div>

        {loadError && <Alert type="error" message={loadError} onClose={() => setLoadError(null)} />}

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
              {t('workspace.selector.pendingInvitations')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {invitations.map((inv) => (
                <div key={inv.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', padding: '10px 14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 32, height: 32, flexShrink: 0,
                      background: '#f97316', borderRadius: 'var(--radius-sm)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 12, fontWeight: 700,
                    }}>
                      {inv.workspaceName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {inv.workspaceName}
                      </p>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-faint)' }}>
                        {t('workspace.selector.invitedToJoin')}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => handleInvitationAction(inv.id, 'accept')}
                      disabled={actingInvitationId === inv.id}
                      style={{
                        padding: '4px 10px', fontSize: 11, fontWeight: 600,
                        color: '#fff', background: '#16a34a',
                        border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        opacity: actingInvitationId === inv.id ? 0.5 : 1,
                      }}
                      onMouseEnter={e => { if (actingInvitationId !== inv.id) (e.currentTarget as HTMLElement).style.background = '#15803d'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#16a34a'; }}
                    >
                      {actingInvitationId === inv.id ? '…' : t('workspace.members.invite.accept')}
                    </button>
                    <button
                      onClick={() => handleInvitationAction(inv.id, 'reject')}
                      disabled={actingInvitationId === inv.id}
                      style={{
                        padding: '4px 10px', fontSize: 11, fontWeight: 500,
                        color: 'var(--text-muted)', background: 'var(--bg-hover)',
                        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        opacity: actingInvitationId === inv.id ? 0.5 : 1,
                      }}
                      onMouseEnter={e => { if (actingInvitationId !== inv.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
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
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div style={{
              width: 24, height: 24,
              border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
              borderRadius: '50%', animation: 'spin 0.7s linear infinite',
            }} />
          </div>
        ) : workspaces.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {workspaces.map((ws) => {
              const hovered = hoveredWorkspaceId === ws.id;
              return (
                <button
                  key={ws.id}
                  onClick={() => handleSelect(ws)}
                  style={{
                    width: '100%', textAlign: 'left', cursor: 'pointer',
                    background: hovered ? 'var(--bg-hover)' : 'var(--bg-elevated)',
                    border: `1px solid ${hovered ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)', padding: '12px 14px',
                    transition: `border-color var(--duration), background var(--duration)`,
                  }}
                  onMouseEnter={() => setHoveredWorkspaceId(ws.id)}
                  onMouseLeave={() => setHoveredWorkspaceId(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, flexShrink: 0,
                      background: 'var(--accent)', borderRadius: 'var(--radius-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 15, fontWeight: 700,
                    }}>
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{ws.name}</p>
                      {ws.description && (
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-faint)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {ws.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={14} strokeWidth={2} style={{ color: hovered ? 'var(--accent)' : 'var(--text-faint)', flexShrink: 0, transition: `color var(--duration)` }} />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          !listAction.loading && (
            <div style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '32px 24px',
              textAlign: 'center', marginBottom: 16,
            }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
                {t('workspace.selector.noWorkspaces')}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
                {t('workspace.selector.noWorkspacesSubtitle')}
              </p>
            </div>
          )
        )}

        {/* Create workspace */}
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '11px 16px', fontSize: 12, fontWeight: 500,
              color: 'var(--text-muted)', background: 'transparent',
              border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              transition: `border-color var(--duration), color var(--duration)`,
              boxSizing: 'border-box',
            }}
            onMouseEnter={e => { (e.currentTarget.style.borderColor = 'var(--accent)'); (e.currentTarget.style.color = 'var(--accent)'); }}
            onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border)'); (e.currentTarget.style.color = 'var(--text-muted)'); }}
          >
            <Plus size={14} strokeWidth={2.5} />
            {t('workspace.selector.createNew')}
          </button>
        ) : (
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: 16,
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {t('workspace.selector.form.title')}
            </h3>
            {createAction.error && (
              <Alert type="error" message={createAction.error} onClose={createAction.reset} />
            )}
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>{t('workspace.selector.form.name')}</label>
                <input
                  type="text"
                  placeholder={t('workspace.selector.form.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  {t('workspace.selector.form.description', { optional: t('common.optional') })}
                </label>
                <input
                  type="text"
                  placeholder={t('workspace.selector.form.descriptionPlaceholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, paddingTop: 2 }}>
                <button
                  type="submit"
                  disabled={createAction.loading || !name.trim()}
                  style={{
                    flex: 1, padding: '7px 12px', fontSize: 12, fontWeight: 500,
                    background: 'var(--accent)', color: '#fff',
                    border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    opacity: createAction.loading || !name.trim() ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { if (!createAction.loading && name.trim()) (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; }}
                >
                  {createAction.loading ? '…' : t('workspace.selector.form.submit')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateForm(false); createAction.reset(); }}
                  style={{
                    padding: '7px 12px', fontSize: 12, fontWeight: 500,
                    background: 'transparent', color: 'var(--text-muted)',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}