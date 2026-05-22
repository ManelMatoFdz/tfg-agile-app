import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Workspace, Category } from '../../types';
import { workspacesApi } from '../../api/workspaces';
import { categoriesApi } from '../../api/categories';
import { useAuthStore } from '../../store/authStore';
import Alert from '../../components/ui/Alert';

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

  // General form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Danger zone
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteZone, setShowDeleteZone] = useState(false);

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#6366f1');
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<Category | null>(null);

  // Leave workspace
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
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t('workspace.settings.title')}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{t('workspace.settings.subtitle')}</p>
      </div>

      {isAdmin ? (
        /* ── ADMIN: editable form ─────────────────────────────────────────── */
        <>
          <section className="glass-card-strong p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">{t('workspace.settings.general')}</h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('workspace.settings.nameLabel')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 bg-white/60"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('workspace.settings.descriptionLabel')}{' '}
                  <span className="text-gray-400 font-normal">({t('common.optional')})</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 bg-white/60 resize-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {saving ? t('workspace.settings.saving') : t('workspace.settings.save')}
                </button>
              </div>
            </form>
          </section>

          {/* ── Workspace ID (info) ─────────────────────────────────────────── */}
          <section className="glass-card-strong p-6 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">{t('workspace.settings.info')}</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-500">{t('workspace.settings.workspaceId')}</span>
                <code className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-0.5 rounded-lg">
                  {workspace?.id}
                </code>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-gray-500">{t('workspace.settings.createdAt')}</span>
                <span className="text-xs text-gray-600">
                  {workspace?.createdAt
                    ? new Date(workspace.createdAt).toLocaleDateString(undefined, {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
            </div>
          </section>

          {/* ── Categories ──────────────────────────────────────────────────── */}
          <section className="glass-card-strong p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">{t('workspace.settings.categories.title')}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{t('workspace.settings.categories.subtitle')}</p>
              </div>
              <button
                onClick={openCreateCategory}
                className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors cursor-pointer"
              >
                + {t('workspace.settings.categories.newCategory')}
              </button>
            </div>

            {categories.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">{t('workspace.settings.categories.noCategories')}</p>
            ) : (
              <ul className="space-y-2">
                {categories.map((cat) => (
                  <li key={cat.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-gray-50/60">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color ?? '#6366f1' }}
                    />
                    <span className="flex-1 text-sm text-gray-800 font-medium truncate">{cat.name}</span>
                    <button
                      onClick={() => openEditCategory(cat)}
                      className="text-xs text-gray-400 hover:text-gray-700 transition-colors cursor-pointer px-1"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteCategory(cat)}
                      disabled={deletingCategoryId === cat.id}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors cursor-pointer px-1 disabled:opacity-40"
                    >
                      {t('common.delete')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Danger zone ─────────────────────────────────────────────────── */}
          <section className="border border-red-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-red-50/50">
              <div>
                <h2 className="text-sm font-semibold text-red-700">{t('workspace.settings.dangerZone')}</h2>
                <p className="text-xs text-red-400 mt-0.5">{t('workspace.settings.dangerSubtitle')}</p>
              </div>
              <button
                onClick={() => setShowDeleteZone((v) => !v)}
                className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors cursor-pointer"
              >
                {showDeleteZone ? t('common.cancel') : t('workspace.settings.deleteWorkspace')}
              </button>
            </div>

            {showDeleteZone && (
              <div className="px-6 py-5 bg-white space-y-4 border-t border-red-100">
                <p
                  className="text-sm text-gray-600"
                  dangerouslySetInnerHTML={{ __html: t('workspace.settings.deleteWarning', { name: workspace?.name ?? '' }) }}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('workspace.settings.deleteConfirmLabel', { name: workspace?.name })}
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder={workspace?.name}
                    className="w-full px-3 py-2 text-sm border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300/50 focus:border-red-300 bg-white"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleDelete}
                    disabled={deleting || deleteConfirmName !== workspace?.name}
                    className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {deleting ? t('workspace.settings.deleting') : t('workspace.settings.deleteConfirmBtn')}
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      ) : (
        /* ── MEMBER: read-only view ───────────────────────────────────────── */
        <section className="glass-card-strong p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-semibold text-gray-900">{t('workspace.settings.general')}</h2>
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {t('workspace.settings.readOnly')}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">{t('workspace.settings.nameLabel')}</p>
              <p className="text-sm text-gray-900 font-medium">{workspace?.name}</p>
            </div>

            {workspace?.description && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{t('workspace.settings.descriptionLabel')}</p>
                <p className="text-sm text-gray-600">{workspace.description}</p>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{t('workspace.settings.createdAt')}</span>
                <span className="text-xs text-gray-600">
                  {workspace?.createdAt
                    ? new Date(workspace.createdAt).toLocaleDateString(undefined, {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 pt-2">
            {t('workspace.settings.adminOnlyHint')}
          </p>
        </section>
      )}

      {/* ── Leave workspace ─────────────────────────────────────────────────── */}
      {leaveError && <Alert type="error" message={leaveError} onClose={() => setLeaveError(null)} />}
      <section className="border border-orange-200 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-orange-700">{t('workspace.settings.leaveTitle')}</h2>
            <p className="text-xs text-orange-400 mt-0.5">
              {isAdmin && adminCount <= 1
                ? t('workspace.settings.leaveLastAdminHint')
                : t('workspace.settings.leaveSubtitle')}
            </p>
          </div>
          <button
            onClick={() => setShowLeaveModal(true)}
            disabled={isAdmin && adminCount <= 1}
            className="px-3 py-1.5 text-xs font-medium text-orange-600 border border-orange-300 rounded-xl hover:bg-orange-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('workspace.settings.leaveBtn')}
          </button>
        </div>
      </section>

      {/* Leave confirmation modal */}
      {/* Category create/edit modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)} />
          <div className="relative glass-card-strong rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {editingCategory
                ? t('workspace.settings.categories.modal.titleEdit')
                : t('workspace.settings.categories.modal.titleCreate')}
            </h3>

            {categoryError && (
              <Alert type="error" message={categoryError} onClose={() => setCategoryError(null)} />
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('workspace.settings.categories.modal.nameLabel')}
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder={t('workspace.settings.categories.modal.namePlaceholder')}
                  required
                  autoFocus
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 bg-white/60"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('workspace.settings.categories.modal.colorLabel')}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={categoryColor}
                    onChange={(e) => setCategoryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
                  />
                  <span className="text-sm font-mono text-gray-500">{categoryColor}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingCategory || !categoryName.trim()}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDeleteCategory(null)} />
          <div className="relative glass-card-strong rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              {t('workspace.settings.categories.deleteConfirm.title')}
            </h3>
            <p
              className="text-sm text-gray-600 mb-6"
              dangerouslySetInnerHTML={{
                __html: t('workspace.settings.categories.deleteConfirm.message', {
                  name: confirmDeleteCategory.name,
                }),
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteCategory(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteCategory}
                disabled={deletingCategoryId === confirmDeleteCategory.id}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {t('workspace.settings.categories.deleteConfirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLeaveModal(false)} />
          <div className="relative glass-card-strong rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{t('workspace.settings.leaveTitle')}</h3>
                <p className="text-sm text-gray-500">{workspace?.name}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">{t('workspace.settings.leaveDescription')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleLeave}
                disabled={leaving}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {leaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('workspace.settings.leaving')}
                  </span>
                ) : t('workspace.settings.leaveConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}