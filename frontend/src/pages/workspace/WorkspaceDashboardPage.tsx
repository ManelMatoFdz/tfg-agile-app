import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, ChevronRight, LayoutGrid, X } from 'lucide-react';
import { projectsApi } from '../../api/projects';
import { categoriesApi } from '../../api/categories';
import { useApiAction } from '../../hooks/useApiAction';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import type { Project, Category, ProjectVisibility } from '../../types';

interface ProjectGroup {
  category: Category | null;
  projects: Project[];
}

function groupByCategory(projects: Project[], categories: Category[]): ProjectGroup[] {
  const groups = new Map<string | null, Project[]>();
  for (const p of projects) {
    const key = p.categoryId ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  const result: ProjectGroup[] = [];
  for (const cat of categories) {
    const ps = groups.get(cat.id) ?? [];
    if (ps.length > 0) result.push({ category: cat, projects: ps });
  }
  const uncategorized = groups.get(null) ?? [];
  if (uncategorized.length > 0) result.push({ category: null, projects: uncategorized });
  return result;
}

function ProjectCard({ project, categoryColor, to }: { project: Project; categoryColor?: string; to: string }) {
  const { t } = useTranslation();
  return (
    <Link
      to={to}
      style={{
        display: 'block',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderLeft: categoryColor ? `0.125rem solid ${categoryColor}` : '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '0.875rem 1rem',
        textDecoration: 'none',
        transition: `background var(--duration), border-color var(--duration)`,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; (e.currentTarget as HTMLElement).style.borderColor = categoryColor ? 'var(--border)' : 'var(--border)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.625rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: '0 0 0.1875rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {project.name}
          </h3>
          {project.description && (
            <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-faint)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {project.description}
            </p>
          )}
        </div>
        <ChevronRight size={13} strokeWidth={1.75} style={{ color: 'var(--text-faint)', flexShrink: 0, marginTop: '0.125rem' }} />
      </div>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.625rem', color: 'var(--text-faint)' }}>
        {t('common.createdAt', { date: new Date(project.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) })}
      </p>
    </Link>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.375rem 0.625rem',
  fontSize: '0.75rem',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.6875rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: '0.25rem',
};

export default function WorkspaceDashboardPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectCategoryId, setProjectCategoryId] = useState('');
  const [projectVisibility, setProjectVisibility] = useState<ProjectVisibility>('PRIVATE');

  const [showInlineCatForm, setShowInlineCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#f97316');
  const [creatingCat, setCreatingCat] = useState(false);
  const [inlineCatError, setInlineCatError] = useState<string | null>(null);

  const projectsAction = useApiAction<Project[]>();
  const categoriesAction = useApiAction<Category[]>();
  const createAction = useApiAction<Project>();

  const loadData = () => {
    if (!workspaceId) return;
    projectsAction.run(projectsApi.list(workspaceId)).then((data) => { if (data) setProjects(data); });
    categoriesAction.run(categoriesApi.list(workspaceId)).then((data) => { if (data) setCategories(data); });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [workspaceId]);

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    const data = await createAction.run(
      projectsApi.create(workspaceId, {
        name: projectName,
        description: projectDescription || undefined,
        categoryId: projectCategoryId || undefined,
        visibility: projectVisibility,
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
    setProjectVisibility('PRIVATE');
    setShowInlineCatForm(false);
    setNewCatName('');
    setNewCatColor('#f97316');
    setInlineCatError(null);
    createAction.reset();
  };

  const handleCreateInlineCategory = async () => {
    if (!workspaceId || !newCatName.trim()) return;
    setCreatingCat(true);
    setInlineCatError(null);
    try {
      const res = await categoriesApi.create(workspaceId, { name: newCatName.trim(), color: newCatColor, position: categories.length });
      setCategories((prev) => [...prev, res.data]);
      setProjectCategoryId(res.data.id);
      setShowInlineCatForm(false);
      setNewCatName('');
      setNewCatColor('#f97316');
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { errorCode?: string } } })?.response?.data?.errorCode;
      setInlineCatError(code ? t(`errors.${code}`) : t('workspace.settings.categories.createError'));
    } finally {
      setCreatingCat(false);
    }
  };

  const loading = projectsAction.loading || categoriesAction.loading;
  const groups = groupByCategory(projects, categories);

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.025em' }}>
            {t('workspace.dashboard.title')}
          </h1>
          <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--text-faint)' }}>
            {projects.length === 0
              ? t('workspace.dashboard.noProjectsYet')
              : t('workspace.dashboard.count', { count: projects.length })}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3125rem',
            padding: '0.3125rem 0.75rem', fontSize: '0.75rem', fontWeight: 500,
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            transition: `background var(--duration)`,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
        >
          <Plus size={12} strokeWidth={2.5} />
          {t('workspace.dashboard.newProject')}
        </button>
      </div>

      {(projectsAction.error || categoriesAction.error) && (
        <Alert type="error" message={projectsAction.error ?? categoriesAction.error!} onClose={() => { projectsAction.reset(); categoriesAction.reset(); }} />
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
          <div style={{ width: '1.5rem', height: '1.5rem', border: '0.125rem solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 0' }}>
          <div style={{ width: '3rem', height: '3rem', margin: '0 auto 0.875rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LayoutGrid size={20} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
          </div>
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)' }}>{t('workspace.dashboard.noProjects')}</p>
          <p style={{ margin: '0.25rem 0 1rem', fontSize: '0.75rem', color: 'var(--text-faint)' }}>{t('workspace.dashboard.noProjectsSubtitle')}</p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3125rem', padding: '0.3125rem 0.875rem', fontSize: '0.75rem', fontWeight: 500, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
          >
            <Plus size={12} strokeWidth={2.5} />
            {t('workspace.dashboard.newProject')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {groups.map((group) => (
            <div key={group.category?.id ?? '__uncategorized__'}>
              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                {group.category?.color && (
                  <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: group.category.color, flexShrink: 0 }} />
                )}
                {!group.category?.color && (
                  <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'var(--border-strong)', flexShrink: 0 }} />
                )}
                <h2 style={{ margin: 0, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: group.category ? 'var(--text-muted)' : 'var(--text-faint)' }}>
                  {group.category ? group.category.name : t('workspace.dashboard.uncategorized')}
                </h2>
                <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--text-faint)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 0.25rem', fontFamily: 'var(--font-mono)' }}>
                  {group.projects.length}
                </span>
              </div>

              {/* Projects grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(16.25rem, 1fr))', gap: '0.5rem' }}>
                {group.projects.map((p) => (
                  <ProjectCard key={p.id} project={p} categoryColor={group.category?.color} to={`/workspaces/${workspaceId}/projects/${p.id}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create project modal */}
      {showCreateModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'var(--bg-overlay)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{ width: '100%', maxWidth: '27.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.125rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                {t('workspace.dashboard.modal.title')}
              </h2>
              <button onClick={closeModal} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '1.5rem', height: '1.5rem', border: 'none', background: 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-faint)' }}>
                <X size={13} />
              </button>
            </div>

            <form onSubmit={handleCreateProject}>
              <div style={{ padding: '0.875rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {createAction.error && (
                  <div style={{ fontSize: '0.6875rem', color: 'var(--danger)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', padding: '0.375rem 0.625rem' }}>
                    {createAction.error}
                  </div>
                )}

                <div>
                  <label style={labelStyle}>{t('workspace.dashboard.modal.name')}</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder={t('workspace.dashboard.modal.namePlaceholder')}
                    required
                    autoFocus
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    {t('workspace.dashboard.modal.description')}{' '}
                    <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>({t('common.optional')})</span>
                  </label>
                  <input
                    type="text"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder={t('workspace.dashboard.modal.descriptionPlaceholder')}
                    style={inputStyle}
                  />
                </div>

                {/* Category */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <label style={labelStyle}>
                      {t('workspace.dashboard.modal.category')}{' '}
                      <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>({t('common.optional')})</span>
                    </label>
                    {!showInlineCatForm ? (
                      <button type="button" onClick={() => setShowInlineCatForm(true)} style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        + {t('workspace.dashboard.modal.newCategory')}
                      </button>
                    ) : (
                      <button type="button" onClick={() => { setShowInlineCatForm(false); setInlineCatError(null); }} style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        {t('common.cancel')}
                      </button>
                    )}
                  </div>
                  <select
                    value={projectCategoryId}
                    onChange={(e) => setProjectCategoryId(e.target.value)}
                    style={{ ...inputStyle }}
                  >
                    <option value="">{t('workspace.dashboard.modal.noCategory')}</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>

                  {showInlineCatForm && (
                    <div style={{ marginTop: '0.375rem', padding: '0.5rem 0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-hover)', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {inlineCatError && <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--danger)' }}>{inlineCatError}</p>}
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <input
                          type="text"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          placeholder={t('workspace.settings.categories.modal.namePlaceholder')}
                          autoFocus
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <input
                          type="color"
                          value={newCatColor}
                          onChange={(e) => setNewCatColor(e.target.value)}
                          style={{ width: '2.125rem', height: '2.125rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: '0.125rem', background: 'var(--bg-elevated)', flexShrink: 0 }}
                        />
                        <button
                          type="button"
                          onClick={handleCreateInlineCategory}
                          disabled={creatingCat || !newCatName.trim()}
                          style={{ padding: '0 0.625rem', fontSize: '0.6875rem', fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', opacity: creatingCat || !newCatName.trim() ? 0.5 : 1, flexShrink: 0 }}
                        >
                          {creatingCat ? '…' : t('workspace.dashboard.modal.createCategory')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Visibility */}
                <div>
                  <label style={labelStyle}>{t('projects.settings.visibilityLabel')}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
                    {(['PRIVATE', 'WORKSPACE'] as ProjectVisibility[]).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setProjectVisibility(v)}
                        style={{
                          padding: '0.5rem 0.625rem', textAlign: 'left', cursor: 'pointer',
                          border: `1px solid ${projectVisibility === v ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-md)',
                          background: projectVisibility === v ? 'var(--accent-muted)' : 'var(--bg)',
                          transition: `border-color var(--duration), background var(--duration)`,
                        }}
                      >
                        <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 600, color: projectVisibility === v ? 'var(--accent)' : 'var(--text-muted)' }}>
                          {t(`projects.settings.visibility.${v}`)}
                        </p>
                        <p style={{ margin: '0.125rem 0 0', fontSize: '0.625rem', color: 'var(--text-faint)', lineHeight: 1.3 }}>
                          {t(`projects.settings.visibility.${v}_desc`)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem', padding: '0.625rem 1.125rem 0.875rem', borderTop: '1px solid var(--border)' }}>
                <Button type="button" variant="secondary" onClick={closeModal}>{t('common.cancel')}</Button>
                <Button type="submit" loading={createAction.loading}>{t('workspace.dashboard.modal.submit')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}