import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, ChevronDown, ChevronRight, LayoutGrid, X, Filter, Lock, MoreHorizontal } from 'lucide-react';
import { projectsApi } from '../../api/projects';
import { categoriesApi } from '../../api/categories';
import { teamsApi } from '../../api/teams';
import { useApiAction } from '../../hooks/useApiAction';
import { useAuthStore } from '../../store/authStore';
import { useUserMap } from '../../hooks/useUserMap';
import { buildAvatarSrc } from '../../utils/avatarUrl';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import PageTitle from '../../components/motion/PageTitle';
import type { Project, Category, ProjectVisibility, TeamMember, Team } from '../../types';

interface ProjectGroup {
  category: Category | null;
  projects: Project[];
}

function groupByCategory(projects: Project[], categories: Category[]): ProjectGroup[] {
  const sorted = [...projects].sort((a, b) => a.name.localeCompare(b.name));
  const groups = new Map<string | null, Project[]>();
  for (const p of sorted) {
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

const ICON_COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2', '#6366f1'];

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6d28d9', '#475569', '#1e293b',
];

const ROLE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  ADMIN: { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  MEMBER: { bg: '#dbeafe', color: '#2563eb', border: '#bfdbfe' },
};

function timeAgo(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('workspace.dashboard.justNow');
  if (mins < 60) return t('workspace.dashboard.timeAgo.minutes', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('workspace.dashboard.timeAgo.hours', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('workspace.dashboard.timeAgo.days', { count: days });
  const weeks = Math.floor(days / 7);
  return t('workspace.dashboard.timeAgo.weeks', { count: weeks });
}

function MemberAvatars({ members, userMap }: { members: TeamMember[]; userMap: Map<string, { fullName?: string; username?: string; avatarUrl?: string }> }) {
  const maxShow = 2;
  const shown = members.slice(0, maxShow);
  const extra = members.length - maxShow;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((m, i) => {
        const u = userMap.get(m.userId);
        const name = u?.fullName || u?.username || '?';
        const src = buildAvatarSrc(u?.avatarUrl);
        return (
          <div key={m.id} style={{
            width: 26, height: 26, borderRadius: '50%', overflow: 'hidden',
            border: '2px solid var(--bg-elevated)',
            marginLeft: i > 0 ? -8 : 0, flexShrink: 0,
          }}>
            {src ? (
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
            ) : (
              <div style={{
                width: '100%', height: '100%', background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent-fg)', fontSize: 10, fontWeight: 700,
              }}>
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        );
      })}
      {extra > 0 && (
        <span style={{ marginLeft: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-faint)' }}>
          +{extra}
        </span>
      )}
    </div>
  );
}

function ProjectCard({ project, to, colorIdx, myRole, members, userMap }: {
  project: Project; to: string; colorIdx: number;
  myRole?: string; members: TeamMember[];
  userMap: Map<string, { fullName?: string; username?: string; avatarUrl?: string }>;
}) {
  const { t } = useTranslation();
  const bgColor = project.color || ICON_COLORS[colorIdx % ICON_COLORS.length];
  const roleStyle = myRole ? ROLE_STYLES[myRole] || ROLE_STYLES.MEMBER : null;
  const isPrivate = project.visibility === 'PRIVATE';

  return (
    <Link
      to={to}
      style={{
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '20px',
        textDecoration: 'none',
        transition: 'border-color 150ms, box-shadow 150ms',
        minHeight: 170,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Top row: icon + role badge + visibility */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, flexShrink: 0,
          background: bgColor, borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 17, fontWeight: 700,
        }}>
          {project.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {roleStyle && myRole && (
            <span style={{
              display: 'inline-block', padding: '2px 10px',
              fontSize: 11, fontWeight: 600,
              color: roleStyle.color, background: roleStyle.bg,
              border: `1px solid ${roleStyle.border}`,
              borderRadius: 'var(--radius-pill)',
            }}>
              {t(`workspace.dashboard.roles.${myRole}`)}
            </span>
          )}
          {isPrivate && (
            <Lock size={14} strokeWidth={2} style={{ color: 'var(--text-faint)' }} />
          )}
        </div>
      </div>

      {/* Project info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{
          margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: 'var(--text)',
          letterSpacing: '-0.01em',
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {project.name}
        </h3>
        {project.description && (
          <p style={{
            margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {project.description}
          </p>
        )}
      </div>

      {/* Bottom: avatars + updated ago */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <MemberAvatars members={members} userMap={userMap} />
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          {t('workspace.dashboard.updated', { time: timeAgo(project.updatedAt, t) })}
        </span>
      </div>
    </Link>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  fontSize: 14,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--text-muted)',
  marginBottom: 6,
};

export default function WorkspaceDashboardPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const currentUser = useAuthStore((s) => s.user);

  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projectMembers, setProjectMembers] = useState<Record<string, TeamMember[]>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectCategoryId, setProjectCategoryId] = useState('');
  const [projectColor, setProjectColor] = useState('#6366f1');
  const [projectTeamId, setProjectTeamId] = useState('');
  const [projectVisibility, setProjectVisibility] = useState<ProjectVisibility>('PRIVATE');
  const [teams, setTeams] = useState<Team[]>([]);

  const [showInlineCatForm, setShowInlineCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#f97316');
  const [creatingCat, setCreatingCat] = useState(false);
  const [inlineCatError, setInlineCatError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const projectsAction = useApiAction<Project[]>();
  const categoriesAction = useApiAction<Category[]>();
  const createAction = useApiAction<Project>();

  const loadData = () => {
    if (!workspaceId) return;
    projectsAction.run(projectsApi.list(workspaceId)).then((data) => {
      if (data) {
        setProjects(data);
        // Fetch members for each project
        Promise.all(data.map(async (p) => {
          try {
            const res = await projectsApi.getTeamMembers(p.id);
            return { projectId: p.id, members: res.data };
          } catch { return { projectId: p.id, members: [] }; }
        })).then((results) => {
          const map: Record<string, TeamMember[]> = {};
          results.forEach((r) => { map[r.projectId] = r.members; });
          setProjectMembers(map);
        });
      }
    });
    categoriesAction.run(categoriesApi.list(workspaceId)).then((data) => { if (data) setCategories(data); });
    teamsApi.list(workspaceId).then((res) => setTeams(res.data)).catch(() => {});
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [workspaceId]);

  // Collect all user IDs from project members for avatar resolution
  const allMemberUserIds = Object.values(projectMembers).flat().map((m) => m.userId);
  const userMap = useUserMap(allMemberUserIds);

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !projectTeamId) return;
    const data = await createAction.run(
      projectsApi.create(workspaceId, {
        name: projectName,
        description: projectDescription || undefined,
        categoryId: projectCategoryId || undefined,
        teamId: projectTeamId,
        color: projectColor,
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
    setProjectColor('#6366f1');
    setProjectTeamId('');
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

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const loading = projectsAction.loading || categoriesAction.loading;
  const allGroups = groupByCategory(projects, categories);
  const groups = activeFilter
    ? allGroups.filter((g) => {
        if (activeFilter === '__uncategorized__') return g.category === null;
        return g.category?.id === activeFilter;
      })
    : allGroups;

  const filterTabs = [
    { id: null, label: t('workspace.dashboard.allCategories', { defaultValue: 'All Categories' }) },
    ...categories.filter((c) => allGroups.some((g) => g.category?.id === c.id)).map((c) => ({ id: c.id, label: c.name })),
    ...(allGroups.some((g) => g.category === null) ? [{ id: '__uncategorized__', label: t('workspace.dashboard.uncategorized') }] : []),
  ];

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <PageTitle>
            {t('workspace.dashboard.title')}
          </PageTitle>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-faint)' }}>
            {t('workspace.dashboard.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', fontSize: 13, fontWeight: 600,
              background: 'var(--accent)', color: 'var(--accent-fg)',
              border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            <Plus size={15} strokeWidth={2.5} />
            {t('workspace.dashboard.newProject')}
          </button>
        </div>
      </div>

      {(projectsAction.error || categoriesAction.error) && (
        <Alert type="error" message={projectsAction.error ?? categoriesAction.error!} onClose={() => { projectsAction.reset(); categoriesAction.reset(); }} />
      )}

      {/* Category filter tabs */}
      {!loading && allGroups.length > 0 && filterTabs.length > 2 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 4 }}>
            {t('workspace.dashboard.view')}:
          </span>
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id ?? '__all__'}
                onClick={() => setActiveFilter(isActive ? null : tab.id)}
                style={{
                  padding: '6px 14px', fontSize: 13, fontWeight: 500,
                  background: isActive ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: isActive ? 'var(--accent-fg)' : 'var(--text-muted)',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                  transition: 'all 150ms',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--accent-text)',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : groups.length === 0 && projects.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 24px',
          background: 'var(--bg-elevated)', border: '2px dashed var(--border)',
          borderRadius: 'var(--radius-card)',
        }}>
          <div style={{
            width: 56, height: 56, margin: '0 auto 16px',
            background: 'var(--accent-muted)', borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LayoutGrid size={24} strokeWidth={1.5} style={{ color: 'var(--accent-text)' }} />
          </div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
            {t('workspace.dashboard.noProjects')}
          </p>
          <p style={{ margin: '6px 0 20px', fontSize: 14, color: 'var(--text-muted)' }}>
            {t('workspace.dashboard.noProjectsSubtitle')}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', fontSize: 14, fontWeight: 600,
              background: 'var(--accent)', color: 'var(--accent-fg)',
              border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            {t('workspace.dashboard.newProject')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {groups.map((group) => {
            const groupKey = group.category?.id ?? '__uncategorized__';
            const isCollapsed = collapsedGroups.has(groupKey);
            return (
              <div key={groupKey}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroupCollapse(groupKey)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: isCollapsed ? 0 : 14,
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
                    width: '100%', textAlign: 'left',
                  }}
                >
                  {isCollapsed
                    ? <ChevronRight size={16} strokeWidth={2} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                    : <ChevronDown size={16} strokeWidth={2} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                  }
                  {group.category?.color && (
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: group.category.color, flexShrink: 0,
                    }} />
                  )}
                  <h2 style={{
                    margin: 0, fontSize: 14, fontWeight: 600,
                    color: group.category ? 'var(--text)' : 'var(--text-muted)',
                  }}>
                    {group.category ? group.category.name : t('workspace.dashboard.uncategorized')}
                  </h2>
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--text-faint)',
                    background: 'var(--bg-hover)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '1px 8px',
                    fontFamily: 'var(--font-mono)', flexShrink: 0,
                  }}>
                    {group.projects.length}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 4 }} />
                </button>

                {/* Projects grid */}
                {!isCollapsed && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 14,
                  }}>
                    {group.projects.map((p, pIdx) => {
                      const pMembers = projectMembers[p.id] || [];
                      const myMembership = pMembers.find((m) => m.userId === currentUser?.id);
                      return (
                        <ProjectCard
                          key={p.id}
                          project={p}
                          to={`/workspaces/${workspaceId}/projects/${p.id}`}
                          colorIdx={pIdx}
                          myRole={myMembership?.role}
                          members={pMembers}
                          userMap={userMap}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create project modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
            backgroundColor: 'var(--bg-overlay)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            animation: 'fade-in 200ms ease both',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{
            width: '100%', maxWidth: 480,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 24px', borderBottom: '1px solid var(--border)',
            }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                {t('workspace.dashboard.modal.title')}
              </h2>
              <button onClick={closeModal} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, border: 'none', background: 'transparent',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-faint)',
              }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateProject}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {createAction.error && (
                  <div style={{
                    fontSize: 13, color: 'var(--danger-text)',
                    background: 'var(--danger-bg)',
                    borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                  }}>
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
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  />
                </div>

                {/* Color picker */}
                <div>
                  <label style={labelStyle}>{t('workspace.dashboard.modal.color')}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setProjectColor(c)}
                        style={{
                          width: 24, height: 24,
                          borderRadius: 'var(--radius-sm)',
                          background: c,
                          border: projectColor === c ? '2px solid var(--text)' : '2px solid transparent',
                          cursor: 'pointer',
                          padding: 0,
                          outline: projectColor === c ? '2px solid var(--bg-elevated)' : 'none',
                          outlineOffset: -4,
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-md)',
                      background: projectColor, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700,
                    }}>
                      {projectName.trim() ? projectName.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                      {projectColor}
                    </span>
                  </div>
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
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  />
                </div>

                {/* Team (required) */}
                <div>
                  <label style={labelStyle}>{t('workspace.dashboard.modal.team', { defaultValue: 'Team' })}</label>
                  <select
                    value={projectTeamId}
                    onChange={(e) => setProjectTeamId(e.target.value)}
                    required
                    style={inputStyle}
                  >
                    <option value="">{t('workspace.dashboard.modal.selectTeam', { defaultValue: 'Select a team…' })}</option>
                    {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>
                      {t('workspace.dashboard.modal.category')}{' '}
                      <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>({t('common.optional')})</span>
                    </label>
                    {!showInlineCatForm ? (
                      <button type="button" onClick={() => setShowInlineCatForm(true)} style={{
                        fontSize: 13, fontWeight: 500, color: 'var(--accent-text)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      }}>
                        + {t('workspace.dashboard.modal.newCategory')}
                      </button>
                    ) : (
                      <button type="button" onClick={() => { setShowInlineCatForm(false); setInlineCatError(null); }} style={{
                        fontSize: 13, color: 'var(--text-faint)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      }}>
                        {t('common.cancel')}
                      </button>
                    )}
                  </div>
                  <select
                    value={projectCategoryId}
                    onChange={(e) => setProjectCategoryId(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">{t('workspace.dashboard.modal.noCategory')}</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>

                  {showInlineCatForm && (
                    <div style={{
                      marginTop: 8, padding: '10px 12px',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-hover)',
                      display: 'flex', flexDirection: 'column', gap: 8,
                    }}>
                      {inlineCatError && <p style={{ margin: 0, fontSize: 13, color: 'var(--danger-text)' }}>{inlineCatError}</p>}
                      <div style={{ display: 'flex', gap: 8 }}>
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
                          style={{
                            width: 38, height: 38, border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                            padding: 2, background: 'var(--bg-elevated)', flexShrink: 0,
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleCreateInlineCategory}
                          disabled={creatingCat || !newCatName.trim()}
                          style={{
                            padding: '0 14px', fontSize: 13, fontWeight: 600,
                            background: 'var(--accent)', color: 'var(--accent-fg)',
                            border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                            opacity: creatingCat || !newCatName.trim() ? 0.5 : 1, flexShrink: 0,
                          }}
                        >
                          {creatingCat ? '...' : t('workspace.dashboard.modal.createCategory')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Visibility */}
                <div>
                  <label style={labelStyle}>{t('projects.settings.visibilityLabel')}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {(['PRIVATE', 'WORKSPACE'] as ProjectVisibility[]).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setProjectVisibility(v)}
                        style={{
                          padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
                          border: `1px solid ${projectVisibility === v ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-md)',
                          background: projectVisibility === v ? 'var(--accent-muted)' : 'var(--bg)',
                          transition: 'border-color 150ms, background 150ms',
                        }}
                      >
                        <p style={{
                          margin: 0, fontSize: 13, fontWeight: 600,
                          color: projectVisibility === v ? 'var(--accent-text)' : 'var(--text-muted)',
                        }}>
                          {t(`projects.settings.visibility.${v}`)}
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.3 }}>
                          {t(`projects.settings.visibility.${v}_desc`)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex', justifyContent: 'flex-end', gap: 8,
                padding: '14px 24px', borderTop: '1px solid var(--border)',
              }}>
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