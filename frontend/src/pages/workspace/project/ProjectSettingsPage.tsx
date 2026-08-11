import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Plus, Trash2, Tag, GitBranch, Copy, Check } from 'lucide-react';
import { projectsApi } from '../../../api/projects';
import { categoriesApi } from '../../../api/categories';
import { labelsApi } from '../../../api/labels';
import { gitApi } from '../../../api/git';
import { useAuthStore } from '../../../store/authStore';
import Alert from '../../../components/ui/Alert';
import PageTitle from '../../../components/motion/PageTitle';
import { workspacesApi } from '../../../api/workspaces';
import type { Category, GitIntegration, Label, Project, ProjectVisibility } from '../../../types';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6d28d9', '#475569', '#1e293b',
];

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
  const [color, setColor] = useState('#6366f1');
  const [visibility, setVisibility] = useState<ProjectVisibility>('PRIVATE');
  const [saving, setSaving] = useState(false);

  const [labels, setLabels] = useState<Label[]>([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366f1');
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editLabelName, setEditLabelName] = useState('');
  const [editLabelColor, setEditLabelColor] = useState('');

  const [showDeleteZone, setShowDeleteZone] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [gitIntegration, setGitIntegration] = useState<GitIntegration | null>(null);
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [freshSecret, setFreshSecret] = useState<string | null>(null);
  const [gitSaving, setGitSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !workspaceId) return;
    Promise.all([
      projectsApi.getById(projectId),
      projectsApi.getTeamMembers(projectId),
      categoriesApi.list(workspaceId),
      workspacesApi.getMembers(workspaceId),
      labelsApi.getByProject(projectId),
      gitApi.getConfig(projectId),
    ])
      .then(([projRes, teamMembersRes, catRes, wsMembersRes, labelsRes, gitRes]) => {
        setProject(projRes.data);
        setName(projRes.data.name);
        setDescription(projRes.data.description ?? '');
        setCategoryId(projRes.data.categoryId ?? '');
        setColor((projRes.data.color ?? '#6366f1').toLowerCase());
        setVisibility(projRes.data.visibility ?? 'PRIVATE');
        setCategories(catRes.data);
        setLabels(labelsRes);
        setGitIntegration(gitRes);
        setRepositoryUrl(gitRes?.repositoryUrl ?? '');
        const wsAdmin = wsMembersRes.data.some(
          (m) => m.userId === currentUser?.id && m.role === 'ADMIN',
        );
        const teamAdmin = teamMembersRes.data.some(
          (m) => m.userId === currentUser?.id && m.role === 'ADMIN',
        );
        setIsAdmin(wsAdmin || teamAdmin);
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
        color: color || undefined,
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

  const handleGitSetup = async () => {
    if (!projectId || !repositoryUrl.trim()) return;
    setGitSaving(true);
    setError(null);
    try {
      const created = await gitApi.setup(projectId, repositoryUrl.trim());
      setGitIntegration(created);
      setFreshSecret(created.webhookSecret ?? null);
      setSuccess(t('projects.settings.git.connected'));
    } catch {
      setError(t('projects.settings.git.saveError'));
    } finally {
      setGitSaving(false);
    }
  };

  const handleGitDisconnect = async () => {
    if (!projectId || !window.confirm(t('projects.settings.git.disconnectConfirm'))) return;
    try {
      await gitApi.disconnect(projectId);
      setGitIntegration(null);
      setRepositoryUrl('');
      setFreshSecret(null);
      setSuccess(t('projects.settings.git.disconnected'));
    } catch {
      setError(t('projects.settings.git.saveError'));
    }
  };

  const copyToClipboard = (field: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
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
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
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
          {/* Top row: General + Labels side by side on wide screens */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20, alignItems: 'start' }}>
            {/* General settings */}
            <section style={card}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  {t('projects.settings.general')}
                </h2>
              </div>
              <form onSubmit={handleSave} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Name + Color in a row on wide cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
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
                      {t('projects.settings.categoryLabel')}{' '}
                      <span style={{ color: 'var(--text-faint)', fontWeight: 400, fontSize: 12 }}>({t('common.optional')})</span>
                    </label>
                    <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inputStyle}>
                      <option value="">{t('projects.settings.noCategory')}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Color picker */}
                <div>
                  <label style={labelStyle}>{t('projects.settings.colorLabel')}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        style={{
                          width: 24, height: 24,
                          borderRadius: 'var(--radius-sm)',
                          background: c,
                          border: color === c ? '2px solid var(--text)' : '2px solid transparent',
                          cursor: 'pointer',
                          padding: 0,
                          outline: color === c ? '2px solid var(--bg-elevated)' : 'none',
                          outlineOffset: -4,
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-md)',
                      background: color, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700,
                    }}>
                      {name.trim() ? name.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                      {color}
                    </span>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>
                    {t('projects.settings.descriptionLabel')}{' '}
                    <span style={{ color: 'var(--text-faint)', fontWeight: 400, fontSize: 12 }}>({t('common.optional')})</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-muted)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>

                <div>
                  <label style={{ ...labelStyle, marginBottom: 10 }}>{t('projects.settings.visibilityLabel')}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
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

            {/* Labels */}
            <section style={card}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  {t('projects.settings.labels.title')}
                </h2>
              </div>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Add label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    type="color"
                    value={newLabelColor}
                    onChange={(e) => setNewLabelColor(e.target.value)}
                    style={{ width: 32, height: 32, padding: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'none' }}
                  />
                  <input
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder={t('projects.settings.labels.namePlaceholder')}
                    style={{ ...inputStyle, flex: 1, minWidth: 120 }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-muted)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && newLabelName.trim() && projectId) {
                        e.preventDefault();
                        const created = await labelsApi.create(projectId, { name: newLabelName.trim(), color: newLabelColor });
                        setLabels((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
                        setNewLabelName('');
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={!newLabelName.trim()}
                    onClick={async () => {
                      if (!newLabelName.trim() || !projectId) return;
                      const created = await labelsApi.create(projectId, { name: newLabelName.trim(), color: newLabelColor });
                      setLabels((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
                      setNewLabelName('');
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '8px 14px', fontSize: 13, fontWeight: 600,
                      background: 'var(--accent)', color: '#FFFFFF',
                      border: 'none', borderRadius: 'var(--radius-md)',
                      cursor: !newLabelName.trim() ? 'not-allowed' : 'pointer',
                      opacity: !newLabelName.trim() ? 0.5 : 1,
                      transition: 'background 150ms', boxShadow: 'var(--shadow-sm)',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => { if (newLabelName.trim()) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    {t('projects.settings.labels.add')}
                  </button>
                </div>

                {/* Labels list */}
                {labels.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: '16px 0' }}>
                    {t('projects.settings.labels.empty')}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {labels.map((label) => (
                      <div
                        key={label.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px',
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        {editingLabelId === label.id ? (
                          <>
                            <input
                              type="color"
                              value={editLabelColor}
                              onChange={(e) => setEditLabelColor(e.target.value)}
                              style={{ width: 28, height: 28, padding: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'none' }}
                            />
                            <input
                              type="text"
                              value={editLabelName}
                              onChange={(e) => setEditLabelName(e.target.value)}
                              style={{ ...inputStyle, flex: 1, padding: '6px 10px', minWidth: 0 }}
                              autoFocus
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && editLabelName.trim()) {
                                  const updated = await labelsApi.update(label.id, { name: editLabelName.trim(), color: editLabelColor });
                                  setLabels((prev) => prev.map((l) => l.id === label.id ? updated : l).sort((a, b) => a.name.localeCompare(b.name)));
                                  setEditingLabelId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingLabelId(null);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                if (!editLabelName.trim()) return;
                                const updated = await labelsApi.update(label.id, { name: editLabelName.trim(), color: editLabelColor });
                                setLabels((prev) => prev.map((l) => l.id === label.id ? updated : l).sort((a, b) => a.name.localeCompare(b.name)));
                                setEditingLabelId(null);
                              }}
                              style={{
                                padding: '5px 12px', fontSize: 12, fontWeight: 600,
                                background: 'var(--accent)', color: '#FFFFFF',
                                border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                              }}
                            >
                              {t('projects.settings.save')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingLabelId(null)}
                              style={{
                                padding: '5px 12px', fontSize: 12, fontWeight: 600,
                                background: 'transparent', color: 'var(--text-muted)',
                                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                              }}
                            >
                              {t('common.cancel')}
                            </button>
                          </>
                        ) : (
                          <>
                            <span style={{
                              display: 'inline-block', width: 12, height: 12, borderRadius: '50%',
                              background: label.color, flexShrink: 0,
                            }} />
                            <span
                              style={{
                                flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)', cursor: 'pointer', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
                              }}
                              onClick={() => {
                                setEditingLabelId(label.id);
                                setEditLabelName(label.name);
                                setEditLabelColor(label.color);
                              }}
                            >
                              {label.name}
                            </span>
                            <span style={{
                              fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', flexShrink: 0,
                            }}>
                              {label.color}
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                await labelsApi.delete(label.id);
                                setLabels((prev) => prev.filter((l) => l.id !== label.id));
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 28, height: 28, padding: 0, flexShrink: 0,
                                background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer', color: 'var(--text-faint)',
                                transition: 'color 150ms, background 150ms',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent'; }}
                            >
                              <Trash2 size={14} strokeWidth={2} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Git integration - full width */}
          <section style={card}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <GitBranch size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
              <div>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  {t('projects.settings.git.title')}
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  {t('projects.settings.git.subtitle')}
                </p>
              </div>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle} htmlFor="git-repo-url">
                  {t('projects.settings.git.repositoryUrl')}
                </label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    id="git-repo-url"
                    type="url"
                    value={repositoryUrl}
                    onChange={(e) => setRepositoryUrl(e.target.value)}
                    placeholder={t('projects.settings.git.repositoryUrlPlaceholder')}
                    style={{ ...inputStyle, flex: 1, minWidth: 240 }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-muted)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={handleGitSetup}
                    disabled={gitSaving || !repositoryUrl.trim()}
                    style={{
                      padding: '10px 16px', fontSize: 13, fontWeight: 600,
                      background: 'var(--accent)', color: '#FFFFFF',
                      border: 'none', borderRadius: 'var(--radius-md)',
                      cursor: gitSaving || !repositoryUrl.trim() ? 'not-allowed' : 'pointer',
                      opacity: gitSaving || !repositoryUrl.trim() ? 0.5 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {gitIntegration ? t('projects.settings.git.regenerate') : t('projects.settings.git.connect')}
                  </button>
                  {gitIntegration && (
                    <button
                      type="button"
                      onClick={handleGitDisconnect}
                      style={{
                        padding: '10px 16px', fontSize: 13, fontWeight: 600,
                        background: 'none', color: '#DC2626',
                        border: '1px solid #DC2626', borderRadius: 'var(--radius-md)',
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      {t('projects.settings.git.disconnect')}
                    </button>
                  )}
                </div>
              </div>

              {gitIntegration && (
                <>
                  <div>
                    <label style={labelStyle}>{t('projects.settings.git.webhookUrl')}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{
                        flex: 1, minWidth: 0, padding: '10px 14px',
                        fontSize: 12, fontFamily: 'var(--font-mono, monospace)',
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)', color: 'var(--text)',
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      }}>
                        {gitIntegration.webhookUrl}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('url', gitIntegration.webhookUrl)}
                        title={t('projects.settings.git.copy')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '9px 12px', fontSize: 12, fontWeight: 600,
                          background: 'var(--bg)', color: 'var(--text-muted)',
                          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                          cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        {copiedField === 'url' ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
                        {copiedField === 'url' ? t('projects.settings.git.copied') : t('projects.settings.git.copy')}
                      </button>
                    </div>
                  </div>

                  {freshSecret && (
                    <div>
                      <label style={labelStyle}>{t('projects.settings.git.webhookSecret')}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <code style={{
                          flex: 1, minWidth: 0, padding: '10px 14px',
                          fontSize: 12, fontFamily: 'var(--font-mono, monospace)',
                          background: 'var(--bg)', border: '1px solid var(--accent)',
                          borderRadius: 'var(--radius-md)', color: 'var(--text)',
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        }}>
                          {freshSecret}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('secret', freshSecret)}
                          title={t('projects.settings.git.copy')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '9px 12px', fontSize: 12, fontWeight: 600,
                            background: 'var(--bg)', color: 'var(--text-muted)',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                            cursor: 'pointer', whiteSpace: 'nowrap',
                          }}
                        >
                          {copiedField === 'secret' ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
                          {copiedField === 'secret' ? t('projects.settings.git.copied') : t('projects.settings.git.copy')}
                        </button>
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                        {t('projects.settings.git.secretOnce')}
                      </p>
                    </div>
                  )}

                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    {t('projects.settings.git.instructions')}
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Danger zone - full width */}
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
              padding: '14px 20px',
              background: 'rgba(220,38,38,0.04)',
              flexWrap: 'wrap',
              gap: 10,
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
                padding: '20px 20px',
                background: 'var(--bg-elevated)',
                borderTop: '1px solid #DC2626',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                maxWidth: 500,
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
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
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
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)' }}>
              {t('projects.settings.adminOnly')}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}