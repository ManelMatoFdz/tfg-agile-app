import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, LogOut } from 'lucide-react';
import type { Workspace, Category } from '../../types';
import { workspacesApi } from '../../api/workspaces';
import { categoriesApi } from '../../api/categories';
import { useAuthStore } from '../../store/authStore';
import Alert from '../../components/ui/Alert';

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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.6875rem',
  fontWeight: 500,
  color: 'var(--text-muted)',
  marginBottom: '0.25rem',
};

const card: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '1.25rem',
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
          width: '1.5rem',
          height: '1.5rem',
          border: '0.125rem solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '35rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <div>
        <h1 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.015em' }}>
          {t('workspace.settings.title')}
        </h1>
        <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--text-faint)' }}>
          {t('workspace.settings.subtitle')}
        </p>
      </div>

      {isAdmin ? (
        <>
          {/* General */}
          <section style={card}>
            <h2 style={{ margin: '0 0 0.875rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)' }}>
              {t('workspace.settings.general')}
            </h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>{t('workspace.settings.nameLabel')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={inputStyle}
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
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  style={{
                    padding: '0.375rem 0.875rem',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    background: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
                    opacity: saving || !name.trim() ? 0.5 : 1,
                    transition: `background var(--duration)`,
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
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)' }}>
              {t('workspace.settings.info')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.4375rem 0',
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-faint)' }}>{t('workspace.settings.workspaceId')}</span>
                <code style={{
                  fontSize: '0.6875rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.0625rem 0.375rem',
                }}>
                  {workspace?.id}
                </code>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.4375rem 0',
              }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-faint)' }}>{t('workspace.settings.createdAt')}</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {workspace?.createdAt
                    ? new Date(workspace.createdAt).toLocaleDateString(undefined, {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
            </div>
          </section>

          {/* Categories */}
          <section style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)' }}>
                  {t('workspace.settings.categories.title')}
                </h2>
                <p style={{ margin: '0.0625rem 0 0', fontSize: '0.6875rem', color: 'var(--text-faint)' }}>
                  {t('workspace.settings.categories.subtitle')}
                </p>
              </div>
              <button
                onClick={openCreateCategory}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.3125rem 0.625rem',
                  fontSize: '0.6875rem',
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
                <Plus size={11} strokeWidth={2.5} />
                {t('workspace.settings.categories.newCategory')}
              </button>
            </div>

            {categories.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                {t('workspace.settings.categories.noCategories')}
              </p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {categories.map((cat) => (
                  <li
                    key={cat.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.375rem 0.5rem',
                      background: 'var(--bg-hover)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <span style={{
                      width: '0.625rem',
                      height: '0.625rem',
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: cat.color ?? '#6366f1',
                    }} />
                    <span style={{ flex: 1, fontSize: '0.75rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cat.name}
                    </span>
                    <button
                      onClick={() => openEditCategory(cat)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '1.5rem', height: '1.5rem', background: 'none', border: 'none',
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        color: 'var(--text-faint)',
                        transition: `color var(--duration), background var(--duration)`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'none'; }}
                    >
                      <Pencil size={11} strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteCategory(cat)}
                      disabled={deletingCategoryId === cat.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '1.5rem', height: '1.5rem', background: 'none', border: 'none',
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        color: 'var(--text-faint)',
                        opacity: deletingCategoryId === cat.id ? 0.4 : 1,
                        transition: `color var(--duration), background var(--duration)`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-bg)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'none'; }}
                    >
                      <Trash2 size={11} strokeWidth={2} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Danger zone */}
          <section style={{
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1.25rem',
              background: 'var(--danger-bg)',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--danger)' }}>
                  {t('workspace.settings.dangerZone')}
                </h2>
                <p style={{ margin: '0.0625rem 0 0', fontSize: '0.6875rem', color: 'var(--danger)', opacity: 0.7 }}>
                  {t('workspace.settings.dangerSubtitle')}
                </p>
              </div>
              <button
                onClick={() => setShowDeleteZone((v) => !v)}
                style={{
                  fontSize: '0.6875rem', fontWeight: 500, color: 'var(--danger)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0.5rem',
                }}
              >
                {showDeleteZone ? t('common.cancel') : t('workspace.settings.deleteWorkspace')}
              </button>
            </div>

            {showDeleteZone && (
              <div style={{
                padding: '1rem 1.25rem',
                background: 'var(--bg-elevated)',
                borderTop: '1px solid var(--danger)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}>
                <p
                  style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}
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
                      padding: '0.375rem 0.875rem', fontSize: '0.75rem', fontWeight: 500,
                      background: 'var(--danger)', color: '#fff', border: 'none',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)' }}>
              {t('workspace.settings.general')}
            </h2>
            <span style={{
              fontSize: '0.625rem', fontWeight: 500, color: 'var(--text-faint)',
              background: 'var(--bg-hover)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '0.0625rem 0.375rem',
            }}>
              {t('workspace.settings.readOnly')}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <div>
              <p style={{ ...labelStyle, marginBottom: '0.125rem' }}>{t('workspace.settings.nameLabel')}</p>
              <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text)' }}>{workspace?.name}</p>
            </div>
            {workspace?.description && (
              <div>
                <p style={{ ...labelStyle, marginBottom: '0.125rem' }}>{t('workspace.settings.descriptionLabel')}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{workspace.description}</p>
              </div>
            )}
            <div style={{ paddingTop: '0.625rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-faint)' }}>{t('workspace.settings.createdAt')}</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {workspace?.createdAt
                    ? new Date(workspace.createdAt).toLocaleDateString(undefined, {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
            </div>
          </div>
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.6875rem', color: 'var(--text-faint)' }}>
            {t('workspace.settings.adminOnlyHint')}
          </p>
        </section>
      )}

      {/* Leave workspace */}
      {leaveError && <Alert type="error" message={leaveError} onClose={() => setLeaveError(null)} />}
      <section style={{
        border: '1px solid rgba(234,179,8,0.3)',
        borderRadius: 'var(--radius-md)',
        padding: '0.875rem 1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#a16207' }}>
              {t('workspace.settings.leaveTitle')}
            </h2>
            <p style={{ margin: '0.0625rem 0 0', fontSize: '0.6875rem', color: '#ca8a04', opacity: 0.8 }}>
              {isAdmin && adminCount <= 1
                ? t('workspace.settings.leaveLastAdminHint')
                : t('workspace.settings.leaveSubtitle')}
            </p>
          </div>
          <button
            onClick={() => setShowLeaveModal(true)}
            disabled={isAdmin && adminCount <= 1}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3125rem',
              padding: '0.3125rem 0.625rem', fontSize: '0.6875rem', fontWeight: 500,
              color: '#a16207', background: 'none',
              border: '1px solid rgba(234,179,8,0.4)',
              borderRadius: 'var(--radius-md)',
              cursor: isAdmin && adminCount <= 1 ? 'not-allowed' : 'pointer',
              opacity: isAdmin && adminCount <= 1 ? 0.4 : 1,
              transition: `background var(--duration)`,
            }}
            onMouseEnter={(e) => { if (!(isAdmin && adminCount <= 1)) e.currentTarget.style.background = 'rgba(234,179,8,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
          >
            <LogOut size={11} strokeWidth={2} />
            {t('workspace.settings.leaveBtn')}
          </button>
        </div>
      </section>

      {/* Category create/edit modal */}
      {showCategoryModal && (
        <div style={modalOverlay}>
          <div style={modalBg} onClick={() => setShowCategoryModal(false)} />
          <div style={modalCard}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>
              {editingCategory
                ? t('workspace.settings.categories.modal.titleEdit')
                : t('workspace.settings.categories.modal.titleCreate')}
            </h3>

            {categoryError && (
              <Alert type="error" message={categoryError} onClose={() => setCategoryError(null)} />
            )}

            <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                />
              </div>

              <div>
                <label style={labelStyle}>{t('workspace.settings.categories.modal.colorLabel')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <input
                    type="color"
                    value={categoryColor}
                    onChange={(e) => setCategoryColor(e.target.value)}
                    style={{
                      width: '2.25rem', height: '2.25rem',
                      padding: '0.125rem',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      background: 'var(--bg)',
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {categoryColor}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.25rem' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
              <div style={{
                width: '2.25rem', height: '2.25rem', background: 'var(--danger-bg)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Trash2 size={16} strokeWidth={2} style={{ color: 'var(--danger)' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>
                {t('workspace.settings.categories.deleteConfirm.title')}
              </h3>
            </div>
            <p
              style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}
              dangerouslySetInnerHTML={{
                __html: t('workspace.settings.categories.deleteConfirm.message', {
                  name: confirmDeleteCategory.name,
                }),
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: '2.25rem', height: '2.25rem',
                background: 'rgba(234,179,8,0.1)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <LogOut size={16} strokeWidth={2} style={{ color: '#ca8a04' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>
                  {t('workspace.settings.leaveTitle')}
                </h3>
                <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-faint)' }}>{workspace?.name}</p>
              </div>
            </div>
            <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {t('workspace.settings.leaveDescription')}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button style={btnSecondary} onClick={() => setShowLeaveModal(false)}>
                {t('common.cancel')}
              </button>
              <button
                onClick={handleLeave}
                disabled={leaving}
                style={{
                  ...btnPrimary,
                  background: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                  opacity: leaving ? 0.7 : 1,
                  cursor: leaving ? 'not-allowed' : 'pointer',
                }}
              >
                {leaving && (
                  <div style={{
                    width: '0.625rem', height: '0.625rem',
                    border: '0.125rem solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
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