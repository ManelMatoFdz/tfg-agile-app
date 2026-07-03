import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, LogOut } from 'lucide-react';
import type { Workspace, Category } from '../../types';
import { workspacesApi } from '../../api/workspaces';
import { categoriesApi } from '../../api/categories';
import { useAuthStore } from '../../store/authStore';
import Alert from '../../components/ui/Alert';
import PageTitle from '../../components/motion/PageTitle';

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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-muted)',
  marginBottom: 4,
};

const card: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-card)',
  padding: 24,
};

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
};

const modalBg: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundColor: 'var(--bg-overlay)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  animation: 'fade-in 200ms ease both',
};

const modalCard: React.CSSProperties = {
  position: 'relative',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 24,
  width: '100%',
  maxWidth: 420,
  boxShadow: 'var(--shadow-lg)',
};

const btnPrimary: React.CSSProperties = {
  flex: 1,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  background: 'var(--accent)',
  color: 'var(--accent-fg)',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  flex: 1,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 500,
  background: 'var(--bg)',
  color: 'var(--text-muted)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
};

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

export default function WorkspaceSettingsPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCount, setAdminCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteZone, setShowDeleteZone] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#6366f1');
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<Category | null>(null);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([
      workspacesApi.getById(workspaceId),
      workspacesApi.getMembers(workspaceId),
      categoriesApi.list(workspaceId),
    ])
      .then(([wsRes, membersRes, catRes]) => {
        setWorkspace(wsRes.data);
        setName(wsRes.data.name);
        setDescription(wsRes.data.description ?? '');
        const admin = membersRes.data.some(
          (m) => m.userId === currentUser?.id && m.role === 'ADMIN',
        );
        setIsAdmin(admin);
        setAdminCount(membersRes.data.filter((m) => m.role === 'ADMIN').length);
        setCategories(catRes.data);
      })
      .catch(() => setError(t('workspace.settings.loadError')))
      .finally(() => setLoading(false));
  }, [workspaceId, currentUser?.id, t]);

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryColor('#6366f1');
    setCategoryError(null);
    setShowCategoryModal(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryColor(cat.color ?? '#6366f1');
    setCategoryError(null);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !categoryName.trim()) return;
    setSavingCategory(true);
    setCategoryError(null);
    try {
      if (editingCategory) {
        const res = await categoriesApi.update(workspaceId, editingCategory.id, {
          name: categoryName.trim(),
          color: categoryColor,
          position: editingCategory.position,
        });
        setCategories((prev) => prev.map((c) => (c.id === editingCategory.id ? res.data : c)));
      } else {
        const res = await categoriesApi.create(workspaceId, {
          name: categoryName.trim(),
          color: categoryColor,
          position: categories.length,
        });
        setCategories((prev) => [...prev, res.data]);
      }
      setShowCategoryModal(false);
    } catch {
      setCategoryError(
        editingCategory
          ? t('workspace.settings.categories.updateError')
          : t('workspace.settings.categories.createError'),
      );
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!workspaceId || !confirmDeleteCategory) return;
    setDeletingCategoryId(confirmDeleteCategory.id);
    try {
      await categoriesApi.delete(workspaceId, confirmDeleteCategory.id);
      setCategories((prev) => prev.filter((c) => c.id !== confirmDeleteCategory.id));
      setConfirmDeleteCategory(null);
    } catch {
      setError(t('workspace.settings.categories.deleteError'));
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !name.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await workspacesApi.update(workspaceId, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setWorkspace(res.data);
      setSuccess(t('workspace.settings.saveSuccess'));
    } catch {
      setError(t('workspace.settings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleLeave = async () => {
    if (!workspaceId) return;
    setLeaving(true);
    setLeaveError(null);
    try {
      await workspacesApi.leave(workspaceId);
      navigate('/workspaces');
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { errorCode?: string } } })?.response?.data?.errorCode;
      setLeaveError(
        code === 'LAST_WORKSPACE_ADMIN'
          ? t('workspace.settings.leaveLastAdminError')
          : t('workspace.settings.leaveError'),
      );
    } finally {
      setLeaving(false);
      setShowLeaveModal(false);
    }
  };

  const handleDelete = async () => {
    if (!workspaceId || deleteConfirmName !== workspace?.name) return;
    setDeleting(true);
    setError(null);
    try {
      await workspacesApi.delete(workspaceId);
      navigate('/workspaces');
    } catch {
      setError(t('workspace.settings.deleteError'));
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
        <div style={{
          width: 24, height: 24,
          border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
          borderRadius: '50%', animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`
        .ws-settings-grid{display:flex;flex-direction:column;gap:20px}
        @media(min-width:900px){.ws-settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start}}
      `}</style>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <div>
        <PageTitle>{t('workspace.settings.title')}</PageTitle>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-faint)' }}>
          {t('workspace.settings.subtitle')}
        </p>
      </div>

      {isAdmin ? (
        <>
          {/* Two-column grid: General + Info */}
          <div className="ws-settings-grid">
            {/* General */}
            <section style={card}>
              <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {t('workspace.settings.general')}
              </h2>
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>{t('workspace.settings.nameLabel')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    {t('workspace.settings.descriptionLabel')}{' '}
                    <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>({t('common.optional')})</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    style={{ ...inputStyle, resize: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={saving || !name.trim()}
                    style={{
                      padding: '8px 18px', fontSize: 13, fontWeight: 600,
                      background: 'var(--accent)', color: 'var(--accent-fg)',
                      border: 'none', borderRadius: 'var(--radius-md)',
                      cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
                      opacity: saving || !name.trim() ? 0.5 : 1,
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={(e) => { if (!saving && name.trim()) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
                  >
                    {saving ? t('workspace.settings.saving') : t('workspace.settings.save')}
                  </button>
                </div>
              </form>
            </section>

            {/* Info */}
            <section style={card}>
              <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {t('workspace.settings.info')}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{t('workspace.settings.workspaceId')}</span>
                  <code style={{
                    fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
                    background: 'var(--bg-hover)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '2px 8px',
                  }}>
                    {workspace?.id}
                  </code>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{t('workspace.settings.createdAt')}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {workspace?.createdAt
                      ? new Date(workspace.createdAt).toLocaleDateString(undefined, {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })
                      : '—'}
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Categories — full-width table like mockup */}
          <section style={card}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  {t('workspace.settings.categories.title')}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-faint)', maxWidth: 480 }}>
                  {t('workspace.settings.categories.subtitle')}
                </p>
              </div>
              <button
                onClick={openCreateCategory}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 18px', fontSize: 13, fontWeight: 600,
                  background: 'var(--accent)', color: 'var(--accent-fg)',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', transition: 'background 150ms',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
              >
                <Plus size={14} strokeWidth={2.5} />
                {t('workspace.settings.categories.newCategory')}
              </button>
            </div>

            {categories.length === 0 ? (
              <div style={{
                padding: '40px 20px', textAlign: 'center',
                border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)',
              }}>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>
                  {t('workspace.settings.categories.noCategories')}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
                  {t('workspace.settings.categories.subtitle')}
                </p>
              </div>
            ) : (
              <div style={{
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)' }}>
                      <th style={thStyle}>{t('workspace.settings.categories.modal.nameLabel')}</th>
                      <th style={{ ...thStyle, width: 100 }}>{t('workspace.settings.categories.modal.colorLabel')}</th>
                      <th style={{ ...thStyle, width: 160 }}>{t('workspace.settings.createdAt')}</th>
                      <th style={{ ...thStyle, width: 100, textAlign: 'right' }}>{t('workspace.settings.categories.actions', { defaultValue: 'Actions' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat, idx) => (
                      <tr
                        key={cat.id}
                        style={{ transition: 'background 150ms' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ ...tdStyle, borderBottom: idx < categories.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{
                              width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                              background: cat.color ?? '#6366f1',
                            }} />
                            <span style={{ fontWeight: 500 }}>{cat.name}</span>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, borderBottom: idx < categories.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              display: 'inline-block', width: 20, height: 20, borderRadius: 'var(--radius-sm)',
                              background: cat.color ?? '#6366f1', border: '1px solid var(--border)',
                            }} />
                            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                              {cat.color ?? '#6366f1'}
                            </span>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, borderBottom: idx < categories.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {cat.createdAt
                            ? new Date(cat.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td style={{ ...tdStyle, borderBottom: idx < categories.length - 1 ? '1px solid var(--border)' : 'none', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                            <button
                              onClick={() => openEditCategory(cat)}
                              title={t('workspace.settings.categories.modal.titleEdit')}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 30, height: 30, background: 'none', border: 'none',
                                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                color: 'var(--text-faint)', transition: 'color 150ms, background 150ms',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-muted)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'none'; }}
                            >
                              <Pencil size={14} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteCategory(cat)}
                              disabled={deletingCategoryId === cat.id}
                              title={t('workspace.settings.categories.deleteConfirm.title')}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 30, height: 30, background: 'none', border: 'none',
                                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                color: 'var(--text-faint)',
                                opacity: deletingCategoryId === cat.id ? 0.4 : 1,
                                transition: 'color 150ms, background 150ms',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-bg)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'none'; }}
                            >
                              <Trash2 size={14} strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Footer */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', background: 'var(--bg)',
                  borderTop: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                    {t('workspace.settings.categories.count', {
                      count: categories.length,
                      defaultValue: `${categories.length} ${categories.length === 1 ? 'category' : 'categories'}`,
                    })}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Danger zone */}
          <section style={{
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-card)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 24px', background: 'var(--danger-bg)',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--danger)' }}>
                  {t('workspace.settings.dangerZone')}
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--danger)', opacity: 0.7 }}>
                  {t('workspace.settings.dangerSubtitle')}
                </p>
              </div>
              <button
                onClick={() => setShowDeleteZone((v) => !v)}
                style={{
                  fontSize: 12, fontWeight: 500, color: 'var(--danger)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 10px',
                }}
              >
                {showDeleteZone ? t('common.cancel') : t('workspace.settings.deleteWorkspace')}
              </button>
            </div>

            {showDeleteZone && (
              <div style={{
                padding: '20px 24px', background: 'var(--bg-elevated)',
                borderTop: '1px solid var(--danger)',
                display: 'flex', flexDirection: 'column', gap: 14,
              }}>
                <p
                  style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}
                  dangerouslySetInnerHTML={{ __html: t('workspace.settings.deleteWarning', { name: workspace?.name ?? '' }) }}
                />
                <div>
                  <label style={labelStyle}>
                    {t('workspace.settings.deleteConfirmLabel', { name: workspace?.name })}
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder={workspace?.name}
                    style={{ ...inputStyle, borderColor: 'var(--danger)' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleDelete}
                    disabled={deleting || deleteConfirmName !== workspace?.name}
                    style={{
                      padding: '8px 18px', fontSize: 13, fontWeight: 600,
                      background: 'var(--danger)', color: 'var(--accent-fg)', border: 'none',
                      borderRadius: 'var(--radius-md)',
                      cursor: deleting || deleteConfirmName !== workspace?.name ? 'not-allowed' : 'pointer',
                      opacity: deleting || deleteConfirmName !== workspace?.name ? 0.4 : 1,
                    }}
                  >
                    {deleting ? t('workspace.settings.deleting') : t('workspace.settings.deleteConfirmBtn')}
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      ) : (
        /* Read-only */
        <section style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              {t('workspace.settings.general')}
            </h2>
            <span style={{
              fontSize: 11, fontWeight: 500, color: 'var(--text-faint)',
              background: 'var(--bg-hover)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '1px 8px',
            }}>
              {t('workspace.settings.readOnly')}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <p style={{ ...labelStyle, marginBottom: 2 }}>{t('workspace.settings.nameLabel')}</p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{workspace?.name}</p>
            </div>
            {workspace?.description && (
              <div>
                <p style={{ ...labelStyle, marginBottom: 2 }}>{t('workspace.settings.descriptionLabel')}</p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{workspace.description}</p>
              </div>
            )}
            <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{t('workspace.settings.createdAt')}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {workspace?.createdAt
                    ? new Date(workspace.createdAt).toLocaleDateString(undefined, {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
            </div>
          </div>
          <p style={{ margin: '16px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
            {t('workspace.settings.adminOnlyHint')}
          </p>
        </section>
      )}

      {/* Leave workspace */}
      {leaveError && <Alert type="error" message={leaveError} onClose={() => setLeaveError(null)} />}
      <section style={{
        border: '1px solid var(--ochre-soft)',
        borderRadius: 'var(--radius-card)',
        padding: '16px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ochre)' }}>
              {t('workspace.settings.leaveTitle')}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ochre)', opacity: 0.8 }}>
              {isAdmin && adminCount <= 1
                ? t('workspace.settings.leaveLastAdminHint')
                : t('workspace.settings.leaveSubtitle')}
            </p>
          </div>
          <button
            onClick={() => setShowLeaveModal(true)}
            disabled={isAdmin && adminCount <= 1}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', fontSize: 12, fontWeight: 500,
              color: 'var(--ochre)', background: 'none',
              border: '1px solid var(--ochre-soft)',
              borderRadius: 'var(--radius-md)',
              cursor: isAdmin && adminCount <= 1 ? 'not-allowed' : 'pointer',
              opacity: isAdmin && adminCount <= 1 ? 0.4 : 1,
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => { if (!(isAdmin && adminCount <= 1)) e.currentTarget.style.background = 'var(--ochre-soft)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
          >
            <LogOut size={12} strokeWidth={2} />
            {t('workspace.settings.leaveBtn')}
          </button>
        </div>
      </section>

      {/* Category create/edit modal */}
      {showCategoryModal && (
        <div style={modalOverlay}>
          <div style={modalBg} onClick={() => setShowCategoryModal(false)} />
          <div style={modalCard}>
            <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
              {editingCategory
                ? t('workspace.settings.categories.modal.titleEdit')
                : t('workspace.settings.categories.modal.titleCreate')}
            </h3>

            {categoryError && (
              <Alert type="error" message={categoryError} onClose={() => setCategoryError(null)} />
            )}

            <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>{t('workspace.settings.categories.modal.nameLabel')}</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder={t('workspace.settings.categories.modal.namePlaceholder')}
                  required
                  autoFocus
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>

              <div>
                <label style={labelStyle}>{t('workspace.settings.categories.modal.colorLabel')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="color"
                    value={categoryColor}
                    onChange={(e) => setCategoryColor(e.target.value)}
                    style={{
                      width: 40, height: 40, padding: 2,
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', background: 'var(--bg)',
                    }}
                  />
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {categoryColor}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  style={btnSecondary}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingCategory || !categoryName.trim()}
                  style={{
                    ...btnPrimary,
                    opacity: savingCategory || !categoryName.trim() ? 0.5 : 1,
                    cursor: savingCategory || !categoryName.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingCategory
                    ? t('workspace.settings.saving')
                    : editingCategory
                      ? t('workspace.settings.categories.modal.submitEdit')
                      : t('workspace.settings.categories.modal.submitCreate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category delete confirmation modal */}
      {confirmDeleteCategory && (
        <div style={modalOverlay}>
          <div style={modalBg} onClick={() => setConfirmDeleteCategory(null)} />
          <div style={modalCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, background: 'var(--danger-bg)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Trash2 size={18} strokeWidth={2} style={{ color: 'var(--danger)' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                {t('workspace.settings.categories.deleteConfirm.title')}
              </h3>
            </div>
            <p
              style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}
              dangerouslySetInnerHTML={{
                __html: t('workspace.settings.categories.deleteConfirm.message', {
                  name: confirmDeleteCategory.name,
                }),
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnSecondary} onClick={() => setConfirmDeleteCategory(null)}>
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteCategory}
                disabled={deletingCategoryId === confirmDeleteCategory.id}
                style={{
                  ...btnPrimary,
                  background: 'var(--danger)',
                  opacity: deletingCategoryId === confirmDeleteCategory.id ? 0.5 : 1,
                  cursor: deletingCategoryId === confirmDeleteCategory.id ? 'not-allowed' : 'pointer',
                }}
              >
                {t('workspace.settings.categories.deleteConfirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave workspace confirmation modal */}
      {showLeaveModal && (
        <div style={modalOverlay}>
          <div style={modalBg} onClick={() => setShowLeaveModal(false)} />
          <div style={modalCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40,
                background: 'var(--ochre-soft)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <LogOut size={18} strokeWidth={2} style={{ color: 'var(--ochre)' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                  {t('workspace.settings.leaveTitle')}
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)' }}>{workspace?.name}</p>
              </div>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>
              {t('workspace.settings.leaveDescription')}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnSecondary} onClick={() => setShowLeaveModal(false)}>
                {t('common.cancel')}
              </button>
              <button
                onClick={handleLeave}
                disabled={leaving}
                style={{
                  ...btnPrimary,
                  background: 'var(--ochre)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: leaving ? 0.7 : 1,
                  cursor: leaving ? 'not-allowed' : 'pointer',
                }}
              >
                {leaving && (
                  <div style={{
                    width: 12, height: 12,
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: 'var(--accent-fg)',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                  }} />
                )}
                {leaving ? t('workspace.settings.leaving') : t('workspace.settings.leaveConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}