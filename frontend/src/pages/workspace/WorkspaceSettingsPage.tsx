import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Workspace } from '../../types';
import { workspacesApi } from '../../api/workspaces';
import Alert from '../../components/ui/Alert';

export default function WorkspaceSettingsPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
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

  useEffect(() => {
    if (!workspaceId) return;
    workspacesApi
      .getById(workspaceId)
      .then((res) => {
        setWorkspace(res.data);
        setName(res.data.name);
        setDescription(res.data.description ?? '');
      })
      .catch(() => setError(t('workspace.settings.loadError')))
      .finally(() => setLoading(false));
  }, [workspaceId, t]);

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

      {/* ── General info ─────────────────────────────────────────────────────── */}
      <section className="glass-card-strong p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">{t('workspace.settings.general')}</h2>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Name */}
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

          {/* Description */}
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

      {/* ── Workspace ID (info) ───────────────────────────────────────────────── */}
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

      {/* ── Danger zone ──────────────────────────────────────────────────────── */}
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
    </div>
  );
}
