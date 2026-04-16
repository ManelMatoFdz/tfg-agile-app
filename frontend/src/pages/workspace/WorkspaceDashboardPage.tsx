import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { projectsApi } from '../../api/projects';
import { categoriesApi } from '../../api/categories';
import { useApiAction } from '../../hooks/useApiAction';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import type { Project, Category } from '../../types';

interface ProjectGroup {
  category: Category | null;
  projects: Project[];
}

function groupByCategory(projects: Project[], categories: Category[]): ProjectGroup[] {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const groups = new Map<string | null, Project[]>();

  for (const p of projects) {
    const key = p.categoryId ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const result: ProjectGroup[] = [];

  // Categorized groups, ordered by category position
  for (const cat of categories) {
    const ps = groups.get(cat.id) ?? [];
    if (ps.length > 0) {
      result.push({ category: cat, projects: ps });
    }
  }

  // Uncategorized last
  const uncategorized = groups.get(null) ?? [];
  if (uncategorized.length > 0) {
    result.push({ category: null, projects: uncategorized });
  }

  return result;
}

function CategoryDot({ color }: { color?: string }) {
  if (!color) return null;
  return <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 inline-block" style={{ backgroundColor: color }} />;
}

function ProjectCard({ project, categoryColor, to }: { project: Project; categoryColor?: string; to: string }) {
  const { t } = useTranslation();
  return (
    <Link to={to} className="glass-card-strong p-5 hover:shadow-lg hover:shadow-primary-500/10 hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer block">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {categoryColor && <CategoryDot color={categoryColor} />}
            <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors truncate">
              {project.name}
            </h3>
          </div>
          {project.description && (
            <p className="text-sm text-gray-500 line-clamp-2">{project.description}</p>
          )}
        </div>
        <svg className="w-4.5 h-4.5 text-gray-300 group-hover:text-primary-400 transition-colors flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <p className="text-xs text-gray-400 mt-3">
        {t('common.createdAt', { date: new Date(project.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) })}
      </p>
    </Link>
  );
}

export default function WorkspaceDashboardPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectCategoryId, setProjectCategoryId] = useState('');

  const projectsAction = useApiAction<Project[]>();
  const categoriesAction = useApiAction<Category[]>();
  const createAction = useApiAction<Project>();

  const loadData = () => {
    if (!workspaceId) return;
    projectsAction.run(projectsApi.list(workspaceId)).then((data) => {
      if (data) setProjects(data);
    });
    categoriesAction.run(categoriesApi.list(workspaceId)).then((data) => {
      if (data) setCategories(data);
    });
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    const data = await createAction.run(
      projectsApi.create(workspaceId, {
        name: projectName,
        description: projectDescription || undefined,
        categoryId: projectCategoryId || undefined,
      }),
    );
    if (data) {
      setProjects((prev) => [...prev, data]);
      setShowCreateModal(false);
      setProjectName('');
      setProjectDescription('');
      setProjectCategoryId('');
      createAction.reset();
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setProjectName('');
    setProjectDescription('');
    setProjectCategoryId('');
    createAction.reset();
  };

  const loading = projectsAction.loading || categoriesAction.loading;
  const groups = groupByCategory(projects, categories);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('workspace.dashboard.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {projects.length === 0
              ? t('workspace.dashboard.noProjectsYet')
              : t('workspace.dashboard.count', { count: projects.length })}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('workspace.dashboard.newProject')}
        </Button>
      </div>

      {(projectsAction.error || categoriesAction.error) && (
        <Alert
          type="error"
          message={projectsAction.error ?? categoriesAction.error!}
          onClose={() => { projectsAction.reset(); categoriesAction.reset(); }}
        />
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 8a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2zm10-8a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2h-4a2 2 0 01-2-2V7zm0 8a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">{t('workspace.dashboard.noProjects')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('workspace.dashboard.noProjectsSubtitle')}</p>
          <Button className="mt-5" onClick={() => setShowCreateModal(true)}>
            {t('workspace.dashboard.newProject')}
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.category?.id ?? '__uncategorized__'}>
              {/* Group header */}
              <div className="flex items-center gap-2.5 mb-4">
                {group.category ? (
                  <>
                    <CategoryDot color={group.category.color} />
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      {group.category.name}
                    </h2>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0" />
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('workspace.dashboard.uncategorized')}</h2>
                  </>
                )}
                <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                  {group.projects.length}
                </span>
              </div>

              {/* Projects grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {group.projects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    categoryColor={group.category?.color}
                    to={`/workspaces/${workspaceId}/projects/${p.id}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create project modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-md glass-card-strong p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">{t('workspace.dashboard.modal.title')}</h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {createAction.error && (
              <Alert type="error" message={createAction.error} onClose={createAction.reset} />
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <Input
                label={t('workspace.dashboard.modal.name')}
                placeholder={t('workspace.dashboard.modal.namePlaceholder')}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
              <Input
                label={t('workspace.dashboard.modal.description', { optional: t('common.optional') })}
                placeholder={t('workspace.dashboard.modal.descriptionPlaceholder')}
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
              />
              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('workspace.dashboard.modal.category', { optional: t('common.optional') })}
                  </label>
                  <select
                    value={projectCategoryId}
                    onChange={(e) => setProjectCategoryId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
                  >
                    <option value="">{t('workspace.dashboard.modal.noCategory')}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <Button type="submit" loading={createAction.loading} className="flex-1">
                  {t('workspace.dashboard.modal.submit')}
                </Button>
                <Button type="button" variant="secondary" onClick={closeModal}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}