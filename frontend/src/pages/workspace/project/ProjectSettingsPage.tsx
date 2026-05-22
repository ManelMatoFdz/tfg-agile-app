import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { projectsApi } from '../../../api/projects';
import { categoriesApi } from '../../../api/categories';
import { useAuthStore } from '../../../store/authStore';
import Alert from '../../../components/ui/Alert';
import type { Category, Project, ProjectMember, ProjectVisibility } from '../../../types';

export default function ProjectSettingsPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [project, setProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [visibility, setVisibility] = useState<ProjectVisibility>('PRIVATE');
  const [saving, setSaving] = useState(false);

  // Danger zone
  const [showDeleteZone, setShowDeleteZone] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!projectId || !workspaceId) return;
    Promise.all([
      projectsApi.getById(projectId),
      projectsApi.getMembers(projectId),
      categoriesApi.list(workspaceId),
    ])
      .then(([projRes, membersRes, catRes]) => {
        setProject(projRes.data);
        setName(projRes.data.name);
        setDescription(projRes.data.description ?? '');
        setCategoryId(projRes.data.categoryId ?? '');
        setVisibility(projRes.data.visibility ?? 'PRIVATE');
        setCategories(catRes.data);
        const admin = membersRes.data.some(
          (m: ProjectMember) => m.userId === currentUser?.id && m.role === 'ADMIN',
        );
        setIsAdmin(admin);
      })
      .catch(() => setError(t('projects.settings.loadError')))
      .finally(() => setLoading(false));
  }, [projectId, workspaceId, currentUser?.id, t]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectId || !name.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await projectsApi.update(projectId, {
        name: name.trim(),
        description: description.trim() || undefined,
        categoryId: categoryId || undefined,
        visibility,
      });
      setProject(res.data);
      setSuccess(t('projects.settings.saveSuccess'));
    } catch {
      setError(t('projects.settings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!projectId || deleteConfirmName !== project?.name) return;
    setDeleting(true);
    try {
      await projectsApi.delete(projectId);
      navigate(`/workspaces/${workspaceId}`);
    } catch {
      setError(t('projects.settings.deleteError'));
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

      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t('projects.settings.title')}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{t('projects.settings.subtitle')}</p>
      </div>

      {isAdmin ? (
        <>
          {/* General */}
          <section className="glass-card-strong p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">{t('projects.settings.general')}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('projects.settings.nameLabel')}
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
                  {t('projects.settings.descriptionLabel')}{' '}
                  <span className="text-gray-400 font-normal">({t('common.optional')})</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 bg-white/60 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('projects.settings.categoryLabel')}{' '}
                  <span className="text-gray-400 font-normal">({t('common.optional')})</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 bg-white/60"
                >
                  <option value="">{t('projects.settings.noCategory')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('projects.settings.visibilityLabel')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['PRIVATE', 'WORKSPACE'] as ProjectVisibility[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVisibility(v)}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        visibility === v
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 bg-white/60 hover:border-gray-300'
                      }`}
                    >
                      <p className={`text-sm font-semibold ${visibility === v ? 'text-primary-700' : 'text-gray-700'}`}>
                        {t(`projects.settings.visibility.${v}`)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t(`projects.settings.visibility.${v}_desc`)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {saving ? t('projects.settings.saving') : t('projects.settings.save')}
                </button>
              </div>
            </form>
          </section>

          {/* Danger zone */}
          <section className="border border-red-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-red-50/50">
              <div>
                <h2 className="text-sm font-semibold text-red-700">{t('projects.settings.dangerZone')}</h2>
                <p className="text-xs text-red-400 mt-0.5">{t('projects.settings.dangerSubtitle')}</p>
              </div>
              <button
                onClick={() => setShowDeleteZone((v) => !v)}
                className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors cursor-pointer"
              >
                {showDeleteZone ? t('common.cancel') : t('projects.settings.deleteProject')}
              </button>
            </div>

            {showDeleteZone && (
              <div className="px-6 py-5 bg-white space-y-4 border-t border-red-100">
                <p
                  className="text-sm text-gray-600"
                  dangerouslySetInnerHTML={{ __html: t('projects.settings.deleteWarning', { name: project?.name ?? '' }) }}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('projects.settings.deleteConfirmLabel', { name: project?.name })}
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder={project?.name}
                    className="w-full px-3 py-2 text-sm border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300/50 focus:border-red-300 bg-white"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleDelete}
                    disabled={deleting || deleteConfirmName !== project?.name}
                    className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {deleting ? t('projects.settings.deleting') : t('projects.settings.deleteConfirmBtn')}
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="glass-card-strong p-6 space-y-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">{t('projects.settings.nameLabel')}</p>
              <p className="text-sm text-gray-900 font-medium">{project?.name}</p>
            </div>
            {project?.description && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{t('projects.settings.descriptionLabel')}</p>
                <p className="text-sm text-gray-600">{project.description}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 pt-2">{t('projects.settings.adminOnly')}</p>
        </section>
      )}
    </div>
  );
}