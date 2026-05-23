import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { projectsApi } from '../../../api/projects';
import { categoriesApi } from '../../../api/categories';
import { useAuthStore } from '../../../store/authStore';
import Alert from '../../../components/ui/Alert';
import type { Category, Project, ProjectMember, ProjectVisibility } from '../../../types';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  fontSize: 12,
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
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--text-muted)',
  marginBottom: 4,
};

const card: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: 20,
};

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

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [visibility, setVisibility] = useState<ProjectVisibility>('PRIVATE');
  const [saving, setSaving] = useState(false);

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
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{
          width: 24,
          height: 24,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <div>
        <h1 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.015em' }}>
          {t('projects.settings.title')}
        </h1>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
          {t('projects.settings.subtitle')}
        </p>
      </div>

      {isAdmin ? (
        <>
          {/* General */}
          <section style={card}>
            <h2 style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              {t('projects.settings.general')}
            </h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>{t('projects.settings.nameLabel')}</label>
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
                  {t('projects.settings.descriptionLabel')}{' '}
                  <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>({t('common.optional')})</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  {t('projects.settings.categoryLabel')}{' '}
                  <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>({t('common.optional')})</span>
                </label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inputStyle}>
                  <option value="">{t('projects.settings.noCategory')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ ...labelStyle, marginBottom: 8 }}>{t('projects.settings.visibilityLabel')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(['PRIVATE', 'WORKSPACE'] as ProjectVisibility[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVisibility(v)}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        background: visibility === v ? 'var(--accent-muted)' : 'var(--bg)',
                        border: `1px solid ${visibility === v ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: `border-color var(--duration), background var(--duration)`,
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: visibility === v ? 'var(--accent)' : 'var(--text)' }}>
                        {t(`projects.settings.visibility.${v}`)}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-faint)' }}>
                        {t(`projects.settings.visibility.${v}_desc`)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  style={{
                    padding: '6px 14px',
                    fontSize: 12,
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
                  {saving ? t('projects.settings.saving') : t('projects.settings.save')}
                </button>
              </div>
            </form>
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
              padding: '12px 20px',
              background: 'var(--danger-bg)',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--danger)' }}>
                  {t('projects.settings.dangerZone')}
                </h2>
                <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--danger)', opacity: 0.7 }}>
                  {t('projects.settings.dangerSubtitle')}
                </p>
              </div>
              <button
                onClick={() => setShowDeleteZone((v) => !v)}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--danger)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                {showDeleteZone ? t('common.cancel') : t('projects.settings.deleteProject')}
              </button>
            </div>

            {showDeleteZone && (
              <div style={{
                padding: '16px 20px',
                background: 'var(--bg-elevated)',
                borderTop: '1px solid var(--danger)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                <p
                  style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}
                  dangerouslySetInnerHTML={{ __html: t('projects.settings.deleteWarning', { name: project?.name ?? '' }) }}
                />
                <div>
                  <label style={labelStyle}>
                    {t('projects.settings.deleteConfirmLabel', { name: project?.name })}
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder={project?.name}
                    style={{ ...inputStyle, borderColor: 'var(--danger)' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleDelete}
                    disabled={deleting || deleteConfirmName !== project?.name}
                    style={{
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 500,
                      background: 'var(--danger)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      cursor: deleting || deleteConfirmName !== project?.name ? 'not-allowed' : 'pointer',
                      opacity: deleting || deleteConfirmName !== project?.name ? 0.4 : 1,
                    }}
                  >
                    {deleting ? t('projects.settings.deleting') : t('projects.settings.deleteConfirmBtn')}
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      ) : (
        <section style={card}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <p style={{ ...labelStyle, marginBottom: 2 }}>{t('projects.settings.nameLabel')}</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{project?.name}</p>
            </div>
            {project?.description && (
              <div>
                <p style={{ ...labelStyle, marginBottom: 2 }}>{t('projects.settings.descriptionLabel')}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{project.description}</p>
              </div>
            )}
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 11, color: 'var(--text-faint)' }}>
            {t('projects.settings.adminOnly')}
          </p>
        </section>
      )}
    </div>
  );
}