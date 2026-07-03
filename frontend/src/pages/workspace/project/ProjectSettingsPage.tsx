import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings, AlertTriangle } from 'lucide-react';
import { projectsApi } from '../../../api/projects';
import { categoriesApi } from '../../../api/categories';
import { useAuthStore } from '../../../store/authStore';
import Alert from '../../../components/ui/Alert';
import PageTitle from '../../../components/motion/PageTitle';
import type { Category, Project, ProjectMember, ProjectVisibility } from '../../../types';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: 13,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 150ms, box-shadow 150ms',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 6,
};

const card: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)',
  overflow: 'hidden',
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
          width: 28,
          height: 28,
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <div>
        <PageTitle style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {t('projects.settings.title')}
        </PageTitle>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          {t('projects.settings.subtitle')}
        </p>
      </div>

      {isAdmin ? (
        <>
          {/* General settings */}
          <section style={card}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                {t('projects.settings.general')}
              </h2>
            </div>
            <form onSubmit={handleSave} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>{t('projects.settings.nameLabel')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-muted)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  {t('projects.settings.descriptionLabel')}{' '}
                  <span style={{ color: 'var(--text-faint)', fontWeight: 400, textTransform: 'none', letterSpacing: '0', fontSize: 12 }}>({t('common.optional')})</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'none' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-muted)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  {t('projects.settings.categoryLabel')}{' '}
                  <span style={{ color: 'var(--text-faint)', fontWeight: 400, textTransform: 'none', letterSpacing: '0', fontSize: 12 }}>({t('common.optional')})</span>
                </label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inputStyle}>
                  <option value="">{t('projects.settings.noCategory')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ ...labelStyle, marginBottom: 10 }}>{t('projects.settings.visibilityLabel')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {(['PRIVATE', 'WORKSPACE'] as ProjectVisibility[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVisibility(v)}
                      style={{
                        padding: '14px 16px',
                        textAlign: 'left',
                        background: visibility === v ? 'var(--accent-muted)' : 'var(--bg)',
                        border: `1.5px solid ${visibility === v ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'border-color 150ms, background 150ms',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: visibility === v ? 'var(--accent)' : 'var(--text)' }}>
                        {t(`projects.settings.visibility.${v}`)}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
                        {t(`projects.settings.visibility.${v}_desc`)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  style={{
                    padding: '9px 20px',
                    fontSize: 13,
                    fontWeight: 600,
                    background: 'var(--accent)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
                    opacity: saving || !name.trim() ? 0.5 : 1,
                    transition: 'background 150ms',
                    boxShadow: 'var(--shadow-sm)',
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
            border: '1px solid #DC2626',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              background: 'rgba(220,38,38,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={18} strokeWidth={2} style={{ color: '#DC2626' }} />
                <div>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#DC2626' }}>
                    {t('projects.settings.dangerZone')}
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#DC2626', opacity: 0.7 }}>
                    {t('projects.settings.dangerSubtitle')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteZone((v) => !v)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#DC2626',
                  background: 'none',
                  border: '1px solid #DC2626',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  padding: '6px 14px',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {showDeleteZone ? t('common.cancel') : t('projects.settings.deleteProject')}
              </button>
            </div>

            {showDeleteZone && (
              <div style={{
                padding: '20px 24px',
                background: 'var(--bg-elevated)',
                borderTop: '1px solid #DC2626',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}>
                <p
                  style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}
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
                    style={{ ...inputStyle, borderColor: '#DC2626' }}
                    onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.12)'; }}
                    onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleDelete}
                    disabled={deleting || deleteConfirmName !== project?.name}
                    style={{
                      padding: '9px 20px',
                      fontSize: 13,
                      fontWeight: 600,
                      background: '#DC2626',
                      color: '#FFFFFF',
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
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <p style={{ ...labelStyle, marginBottom: 4 }}>{t('projects.settings.nameLabel')}</p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{project?.name}</p>
            </div>
            {project?.description && (
              <div>
                <p style={{ ...labelStyle, marginBottom: 4 }}>{t('projects.settings.descriptionLabel')}</p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{project.description}</p>
              </div>
            )}
          </div>
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)' }}>
              {t('projects.settings.adminOnly')}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}