import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Workspace } from '../../types';
import { workspacesApi } from '../../api/workspaces';
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

  // Leave workspace
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([
      workspacesApi.getById(workspaceId),
      workspacesApi.getMembers(workspaceId),
    ])
      .then(([wsRes, membersRes]) => {
        setWorkspace(wsRes.data);
        setName(wsRes.data.name);
        setDescription(wsRes.data.description ?? '');
        const admin = membersRes.data.some(
          (m) => m.userId === currentUser?.id && m.role === 'ADMIN',
        );
        setIsAdmin(admin);
        setAdminCount(membersRes.data.filter((m) => m.role === 'ADMIN').length);
      })
      .catch(() => setError(t('workspace.settings.loadError')))
      .finally(() => setLoading(false));
  }, [workspaceId, currentUser?.id, t]);

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
                <p className="text-sm text-gray-600">
                  {t('workspace.settings.deleteWarning', { name: workspace?.name })}
                </p>
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