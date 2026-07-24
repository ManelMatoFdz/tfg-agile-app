import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckSquare, ExternalLink, BookOpen, Bug, Filter, CornerDownRight } from 'lucide-react';
import type { Task, TaskPriority, TaskType, Project } from '../types';
import { tasksApi } from '../api/tasks';
import { projectsApi } from '../api/projects';
import Alert from '../components/ui/Alert';
import PageTitle from '../components/motion/PageTitle';
import TaskModal from '../components/kanban/TaskModal';
import SubtaskModal from '../components/kanban/SubtaskModal';
import { getStatusLabel, getStatusColor, useBoardColumns } from '../hooks/useBoardColumns';

const STATUS_ORDER: string[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

const PRIORITY_ORDER: Record<TaskPriority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; bg: string }> = {
  CRITICAL: { color: 'var(--danger)',     bg: 'var(--danger-bg)' },
  HIGH:     { color: 'var(--ochre)',      bg: 'var(--warning-bg)' },
  MEDIUM:   { color: 'var(--ink-blue)',   bg: 'var(--info-bg)' },
  LOW:      { color: 'var(--text-faint)', bg: 'var(--bg-hover)' },
};

const TYPE_ICON: Record<TaskType, { icon: typeof BookOpen; color: string }> = {
  STORY: { icon: BookOpen,    color: '#7C3AED' },
  TASK:  { icon: CheckSquare, color: '#2563EB' },
  BUG:   { icon: Bug,         color: '#DC2626' },
};

export default function MyTasksPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterProject, setFilterProject] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  // Active tab
  const [activeTab, setActiveTab] = useState<string>('TODO');

  // Task modal (regular task)
  const [viewTask, setViewTask] = useState<Task | null | undefined>(undefined);
  const viewTaskColumns = useBoardColumns(viewTask?.projectId);

  // Subtask modal
  const [viewSubtask, setViewSubtask] = useState<Task | null>(null);
  const subtaskColumns = useBoardColumns(viewSubtask?.projectId);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      tasksApi.myTasks(),
      projectsApi.list(workspaceId).then((r) => r.data),
    ])
      .then(([allTasks, p]) => {
        setProjects(p);
        // Filter tasks to only those belonging to projects in this workspace
        const wsProjectIds = new Set(p.map((proj) => proj.id));
        const wsTasks = allTasks.filter((task) => wsProjectIds.has(task.projectId));
        setTasks(wsTasks);
        // Set initial tab to first status that has tasks
        const statuses = [...new Set(wsTasks.map((task) => task.status))];
        const firstActive = STATUS_ORDER.find((s) => statuses.includes(s));
        if (firstActive) setActiveTab(firstActive);
      })
      .catch(() => setError(t('myTasks.loadError')))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const projectMap = useMemo(() => {
    const map: Record<string, Project> = {};
    for (const p of projects) map[p.id] = p;
    return map;
  }, [projects]);

  // All statuses present in tasks
  const allStatuses = useMemo(() => {
    const set = new Set(tasks.map((t) => t.status));
    return [
      ...STATUS_ORDER.filter((s) => set.has(s)),
      ...[...set].filter((s) => !STATUS_ORDER.includes(s)),
    ];
  }, [tasks]);

  // Filtered tasks
  const filtered = useMemo(() => {
    let result = tasks;
    if (filterProject !== 'ALL') result = result.filter((t) => t.projectId === filterProject);
    if (filterPriority !== 'ALL') result = result.filter((t) => t.priority === filterPriority);
    return result;
  }, [tasks, filterProject, filterPriority]);

  // Count per status (from filtered)
  const countByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of filtered) map[t.status] = (map[t.status] ?? 0) + 1;
    return map;
  }, [filtered]);

  // Tasks for active tab
  const tabTasks = useMemo(
    () =>
      filtered
        .filter((t) => t.status === activeTab)
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
    [filtered, activeTab],
  );

  // Unique project ids in tasks (for filter)
  const taskProjectIds = useMemo(() => [...new Set(tasks.map((t) => t.projectId))], [tasks]);

  const handleOpenTask = async (task: Task) => {
    try {
      const fresh = await tasksApi.getById(task.id);
      if (task.parentId) {
        if (!fresh.parentId) fresh.parentId = task.parentId;
        setViewSubtask(fresh);
      } else {
        setViewTask(fresh);
      }
    } catch {
      if (task.parentId) {
        setViewSubtask(task);
      } else {
        setViewTask(task);
      }
    }
  };

  const goToProject = (task: Task) => {
    navigate(`/workspaces/${workspaceId}/projects/${task.projectId}/board`);
  };

  const selectStyle: React.CSSProperties = {
    appearance: 'none',
    padding: '6px 28px 6px 10px',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
  };

  return (
    <div style={{ maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Header */}
      <div>
        <PageTitle>{t('myTasks.title')}</PageTitle>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-faint)' }}>
          {t('myTasks.subtitle')}
        </p>
      </div>

      {/* Filters */}
      {!loading && tasks.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Filter size={14} strokeWidth={2} style={{ color: 'var(--text-faint)' }} />

          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            style={selectStyle}
          >
            <option value="ALL">{t('myTasks.allProjects')}</option>
            {taskProjectIds.map((pid) => (
              <option key={pid} value={pid}>{projectMap[pid]?.name ?? pid}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            style={selectStyle}
          >
            <option value="ALL">{t('myTasks.anyPriority')}</option>
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as TaskPriority[]).map((p) => (
              <option key={p} value={p}>{t(`tasks.priority.${p}`)}</option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: 24, height: 24,
            border: '2px solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : tasks.length === 0 ? (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 44, height: 44,
            background: 'var(--accent-muted)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <CheckSquare size={20} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>{t('myTasks.empty')}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>{t('myTasks.emptySubtitle')}</p>
        </div>
      ) : (
        <>
          {/* Status tabs */}
          <div style={{
            display: 'flex',
            gap: 0,
            borderBottom: '2px solid var(--border)',
          }}>
            {allStatuses.map((status) => {
              const count = countByStatus[status] ?? 0;
              const active = activeTab === status;
              const statusColor = getStatusColor(status, []);
              return (
                <button
                  key={status}
                  onClick={() => setActiveTab(status)}
                  style={{
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    color: active ? 'var(--text)' : 'var(--text-muted)',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: active ? `2px solid ${statusColor}` : '2px solid transparent',
                    marginBottom: -2,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'color 150ms, border-color 150ms',
                  }}
                >
                  {getStatusLabel(status, [], t)}
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: active ? statusColor : 'var(--text-faint)',
                    background: active ? `${statusColor}14` : 'var(--bg-hover)',
                    borderRadius: 'var(--radius-pill)',
                    padding: '1px 7px',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Task cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tabTasks.length === 0 ? (
              <p style={{
                textAlign: 'center', padding: '32px 0',
                fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic',
              }}>
                {t('myTasks.noTasksInTab')}
              </p>
            ) : (
              tabTasks.map((task) => {
                const project = projectMap[task.projectId];
                const priorityCfg = PRIORITY_CONFIG[task.priority];
                const isSubtask = !!task.parentId;
                const typeConfig = TYPE_ICON[task.type ?? 'TASK'];
                const TypeIcon = typeConfig.icon;

                return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: isSubtask ? '12px 16px 12px 24px' : '14px 16px',
                      background: isSubtask ? 'var(--bg)' : 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderLeft: isSubtask ? '2px dashed var(--border-strong)' : '1px solid var(--border)',
                      borderRadius: 'var(--radius-card)',
                      cursor: 'pointer',
                      transition: 'border-color 150ms, box-shadow 150ms, transform 150ms',
                    }}
                    onClick={() => handleOpenTask(task)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-strong)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.borderLeftColor = isSubtask ? 'var(--border-strong)' : 'var(--border)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Icon: subtask arrow vs type icon */}
                    {isSubtask ? (
                      <CornerDownRight size={15} strokeWidth={2} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                    ) : (
                      <TypeIcon size={16} strokeWidth={2} style={{ color: typeConfig.color, flexShrink: 0 }} />
                    )}

                    {/* Main content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        {isSubtask && (
                          <span style={{
                            flexShrink: 0,
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: 'var(--text-faint)',
                            background: 'var(--bg-hover)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '1px 5px',
                          }}>
                            {t('myTasks.subtask')}
                          </span>
                        )}
                        <p style={{
                          margin: 0, fontSize: 13, fontWeight: 500,
                          color: isSubtask ? 'var(--text-muted)' : 'var(--text)',
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        }}>
                          {task.title}
                        </p>
                        {!isSubtask && (
                          <span style={{
                            flexShrink: 0,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: priorityCfg.color,
                            background: priorityCfg.bg,
                            borderRadius: 'var(--radius-sm)',
                            padding: '1px 6px',
                          }}>
                            {t(`tasks.priority.${task.priority}`)}
                          </span>
                        )}
                      </div>

                      {/* Meta row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-faint)' }}>
                        {project && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            {project.color && (
                              <span style={{
                                width: 7, height: 7, borderRadius: '50%',
                                background: project.color, flexShrink: 0,
                              }} />
                            )}
                            {project.name}
                          </span>
                        )}
                        {isSubtask && task.parentTitle && (
                          <>
                            <span style={{ width: 1, height: 10, background: 'var(--border)' }} />
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              {'↳'} {task.parentTitle}
                            </span>
                          </>
                        )}
                        {!isSubtask && task.subtaskCount > 0 && (
                          <>
                            <span style={{ width: 1, height: 10, background: 'var(--border)' }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                              {task.completedSubtaskCount}/{task.subtaskCount}
                            </span>
                          </>
                        )}
                        {task.labels && task.labels.length > 0 && (
                          <>
                            <span style={{ width: 1, height: 10, background: 'var(--border)' }} />
                            <div style={{ display: 'flex', gap: 3 }}>
                              {task.labels.slice(0, 2).map((lbl) => (
                                <span key={lbl.id} style={{
                                  fontSize: 9, fontWeight: 700,
                                  letterSpacing: '0.04em', textTransform: 'uppercase',
                                  color: lbl.color,
                                  background: `${lbl.color}14`,
                                  border: `1px solid ${lbl.color}40`,
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '0px 5px',
                                  lineHeight: '16px',
                                }}>
                                  {lbl.name}
                                </span>
                              ))}
                              {task.labels.length > 2 && (
                                <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-faint)' }}>
                                  +{task.labels.length - 2}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Story points (only for regular tasks) */}
                    {!isSubtask && task.storyPoints != null && (
                      <span style={{
                        flexShrink: 0,
                        fontWeight: 700,
                        color: 'var(--accent)',
                        background: 'var(--accent-muted)',
                        borderRadius: 'var(--radius-pill)',
                        width: 26,
                        height: 26,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {task.storyPoints}
                      </span>
                    )}

                    {/* Go to project button */}
                    <button
                      title={t('myTasks.goToProject')}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToProject(task);
                      }}
                      style={{
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: 'var(--bg)',
                        color: 'var(--text-faint)',
                        cursor: 'pointer',
                        transition: 'color 150ms, border-color 150ms, background 150ms',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--accent)';
                        e.currentTarget.style.borderColor = 'var(--accent)';
                        e.currentTarget.style.background = 'var(--accent-muted)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-faint)';
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.background = 'var(--bg)';
                      }}
                    >
                      <ExternalLink size={13} strokeWidth={2} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Task modal (read-only) */}
      {viewTask !== undefined && (
        <TaskModal
          task={viewTask}
          projectId={viewTask?.projectId}
          columns={viewTaskColumns}
          readOnly
          onClose={() => setViewTask(undefined)}
        />
      )}

      {/* Subtask modal (read-only) */}
      {viewSubtask && (
        <SubtaskModal
          subtask={viewSubtask}
          columns={subtaskColumns}
          readOnly
          onClose={() => setViewSubtask(null)}
        />
      )}
    </div>
  );
}
