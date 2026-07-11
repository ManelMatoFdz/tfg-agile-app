import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, ClipboardList, Search, Filter as FilterIcon, BookOpen, CheckSquare, Bug, ChevronRight, ChevronDown } from 'lucide-react';
import type { Task, TaskPriority, TaskType, UserSummary } from '../../../types';
import { sprintsApi } from '../../../api/sprints';
import { tasksApi } from '../../../api/tasks';
import type { CreateTaskDto, UpdateTaskDto } from '../../../api/tasks';

const TYPE_ICON: Record<TaskType, { icon: typeof BookOpen; color: string }> = {
  STORY: { icon: BookOpen, color: '#7C3AED' },
  TASK:  { icon: CheckSquare, color: '#2563EB' },
  BUG:   { icon: Bug, color: '#DC2626' },
};
import { labelsApi } from '../../../api/labels';
import TaskModal from '../../../components/kanban/TaskModal';
import TaskFilterBar, { type TaskFilters, EMPTY_FILTERS, hasActiveFilters } from '../../../components/kanban/TaskFilterBar';
import Alert from '../../../components/ui/Alert';
import PageTitle from '../../../components/motion/PageTitle';
import { useProjectMember } from '../../../hooks/useProjectMember';
import { useProjectMembers } from '../../../hooks/useProjectMembers';
import type { Label } from '../../../types';

const PRIORITY_ORDER: TaskPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; bg: string; border: string }> = {
  CRITICAL: { color: '#DC2626', bg: 'rgba(220,38,38,0.06)', border: '#DC2626' },
  HIGH:     { color: '#D97706', bg: 'rgba(217,119,6,0.06)', border: '#D97706' },
  MEDIUM:   { color: '#2563EB', bg: 'rgba(37,99,235,0.06)', border: '#2563EB' },
  LOW:      { color: '#94A3B8', bg: 'var(--bg-hover)',       border: '#CBD5E1' },
};

const DEFAULT_STATUS_COLOR = '#94A3B8';
const STATUS_CONFIG: Record<string, { color: string; dot: string }> = {
  TODO:        { color: '#94A3B8', dot: '#94A3B8' },
  IN_PROGRESS: { color: '#2563EB', dot: '#2563EB' },
  IN_REVIEW:   { color: '#7C3AED', dot: '#7C3AED' },
  DONE:        { color: '#16A34A', dot: '#16A34A' },
};

const FILTER_STORAGE_KEY = (pid: string) => `filters_${pid}_backlog`;

function loadFilters(projectId: string): TaskFilters {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY(projectId));
    if (raw) return { ...EMPTY_FILTERS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...EMPTY_FILTERS };
}

export default function BacklogPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();

  const { canCreateTask, canEditBacklogTask, canDeleteBacklogTask } = useProjectMember(projectId);
  const { members, userMap } = useProjectMembers(projectId);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalTask, setModalTask] = useState<Task | null | undefined>(undefined);

  const [labels, setLabels] = useState<Label[]>([]);
  const [filters, setFilters] = useState<TaskFilters>(() => projectId ? loadFilters(projectId) : { ...EMPTY_FILTERS });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());
  const [storySubtasks, setStorySubtasks] = useState<Record<string, Task[]>>({});
  const [createType, setCreateType] = useState<TaskType>('TASK');

  const toggleStory = async (taskId: string) => {
    const next = new Set(expandedStories);
    if (next.has(taskId)) {
      next.delete(taskId);
    } else {
      next.add(taskId);
      if (!storySubtasks[taskId]) {
        try {
          const subs = await tasksApi.getSubtasks(taskId);
          setStorySubtasks((prev) => ({ ...prev, [taskId]: subs }));
        } catch { /* ignore */ }
      }
    }
    setExpandedStories(next);
  };

  // Load labels
  useEffect(() => {
    if (!projectId) return;
    labelsApi.getByProject(projectId).then(setLabels).catch(() => {});
  }, [projectId]);

  // Fetch tasks with filters
  const fetchTasks = useCallback(
    (f: TaskFilters) => {
      if (!projectId) return;
      setLoading(true);
      sprintsApi
        .getBacklog(projectId, f)
        .then(setTasks)
        .catch(() => setError(t('projects.backlog.loadError')))
        .finally(() => setLoading(false));
    },
    [projectId, t],
  );

  useEffect(() => {
    fetchTasks(filters);
  }, [fetchTasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = useCallback(
    (next: TaskFilters) => {
      setFilters(next);
      if (projectId) localStorage.setItem(FILTER_STORAGE_KEY(projectId), JSON.stringify(next));

      // Debounce search input, instant for dropdowns
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (next.search !== filters.search && next.search.length > 0) {
        debounceRef.current = setTimeout(() => fetchTasks(next), 300);
      } else {
        fetchTasks(next);
      }
    },
    [projectId, filters.search, fetchTasks],
  );

  const memberSummaries: UserSummary[] = members.map((m) => userMap[m.userId]).filter(Boolean) as UserSummary[];

  const STATUS_OPTIONS = [
    { key: 'TODO', label: t('tasks.status.TODO') },
    { key: 'IN_PROGRESS', label: t('tasks.status.IN_PROGRESS') },
    { key: 'IN_REVIEW', label: t('tasks.status.IN_REVIEW') },
    { key: 'DONE', label: t('tasks.status.DONE') },
  ];

  const totalPoints = tasks.reduce((sum, task) => sum + (task.storyPoints ?? 0), 0);

  const tasksByPriority = (priority: TaskPriority) =>
    tasks
      .filter((task) => task.priority === priority)
      .sort((a, b) => a.position - b.position);

  const handleSave = async (dto: CreateTaskDto | UpdateTaskDto) => {
    if (modalTask) {
      await tasksApi.update(modalTask.id, dto as UpdateTaskDto);
    } else {
      await tasksApi.create(projectId!, dto as CreateTaskDto);
    }
    fetchTasks(filters);
  };


  const handleDelete = async () => {
    if (!modalTask) return;
    await tasksApi.delete(modalTask.id);
    fetchTasks(filters);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PageTitle as="h2" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {t('projects.backlog.title')}
            </PageTitle>
            {!loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '2px 10px',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {tasks.length} {tasks.length === 1 ? 'item' : 'items'}
                </span>
                {totalPoints > 0 && (
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--accent)',
                    background: 'var(--accent-muted)',
                    borderRadius: 'var(--radius-pill)',
                    padding: '2px 10px',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {totalPoints} pts
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {canCreateTask && (
          <div style={{ display: 'flex', gap: 6 }}>
            {([
              { type: 'STORY' as TaskType, label: t('projects.backlog.newStory'), icon: BookOpen, color: '#7C3AED' },
              { type: 'TASK' as TaskType, label: t('projects.backlog.newTask'), icon: CheckSquare, color: '#2563EB' },
              { type: 'BUG' as TaskType, label: t('projects.backlog.newBug'), icon: Bug, color: '#DC2626' },
            ]).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  onClick={() => { setCreateType(item.type); setModalTask(null); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '7px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    background: 'var(--bg-elevated)',
                    color: item.color,
                    border: `1.5px solid ${item.color}30`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${item.color}0D`; e.currentTarget.style.borderColor = item.color; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = `${item.color}30`; }}
                >
                  <Icon size={14} strokeWidth={2} />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter bar */}
      <TaskFilterBar
        filters={filters}
        onChange={handleFilterChange}
        members={memberSummaries}
        labels={labels}
        showStatus
        statuses={STATUS_OPTIONS}
      />

      {/* Content */}
      {loading ? (
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
      ) : tasks.length === 0 ? (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '64px 32px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            width: 56,
            height: 56,
            background: 'var(--accent-muted)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            {hasActiveFilters(filters)
              ? <FilterIcon size={24} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
              : <ClipboardList size={24} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
            }
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
            {hasActiveFilters(filters) ? t('tasks.filters.noResults') : t('projects.backlog.noTasks')}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            {hasActiveFilters(filters) ? t('tasks.filters.noResultsSub') : t('projects.backlog.noTasksSubtitle')}
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {/* Table header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            background: 'var(--bg)',
            borderBottom: '1px solid var(--border)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
          }}>
            <span style={{ flex: 1 }}>{t('tasks.modal.titleField')}</span>
            <span style={{ width: 90, textAlign: 'center' }}>{t('tasks.modal.priority')}</span>
            <span style={{ width: 60, textAlign: 'center' }}>Pts</span>
            <span style={{ width: 90, textAlign: 'center' }}>{t('tasks.modal.status')}</span>
          </div>

          {PRIORITY_ORDER.map((priority) => {
            const group = tasksByPriority(priority);
            if (group.length === 0) return null;
            const pConfig = PRIORITY_CONFIG[priority];
            return (
              <div key={priority}>
                {/* Priority group header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  background: pConfig.bg,
                  borderBottom: '1px solid var(--border)',
                  borderLeft: `3px solid ${pConfig.border}`,
                }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: pConfig.color,
                  }}>
                    {t(`tasks.priority.${priority}`)}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: pConfig.color,
                    background: `${pConfig.color}18`,
                    borderRadius: 'var(--radius-pill)',
                    padding: '0 8px',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {group.length}
                  </span>
                </div>

                {/* Task rows */}
                {group.map((task, idx) => {
                  const typeConf = TYPE_ICON[task.type ?? 'TASK'];
                  const TypeIcon = typeConf.icon;
                  const isStory = task.type === 'STORY' && task.subtaskCount > 0;
                  const isExpanded = expandedStories.has(task.id);
                  return (
                    <div key={task.id}>
                      <button
                        onClick={() => canEditBacklogTask && setModalTask(task)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 16px',
                          background: 'transparent',
                          border: 'none',
                          borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                          cursor: canEditBacklogTask ? 'pointer' : 'default',
                          transition: 'background 150ms',
                        }}
                        onMouseEnter={e => canEditBacklogTask && (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Expand toggle for STORYs */}
                        {isStory ? (
                          <span
                            onClick={(e) => { e.stopPropagation(); toggleStory(task.id); }}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, color: 'var(--text-muted)' }}
                          >
                            {isExpanded
                              ? <ChevronDown size={14} strokeWidth={2} />
                              : <ChevronRight size={14} strokeWidth={2} />
                            }
                          </span>
                        ) : (
                          <span style={{ width: 14, flexShrink: 0 }} />
                        )}

                        {/* Type icon */}
                        <TypeIcon size={14} strokeWidth={2} style={{ color: typeConf.color, flexShrink: 0 }} />

                        {/* Title + description + subtask progress */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <p style={{
                              margin: 0,
                              fontSize: 13,
                              fontWeight: 500,
                              color: 'var(--text)',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                            }}>
                              {task.title}
                            </p>
                            {task.type === 'STORY' && task.subtaskCount > 0 && (
                              <span style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: task.completedSubtaskCount === task.subtaskCount ? '#16A34A' : 'var(--text-muted)',
                                fontFamily: 'var(--font-mono)',
                                flexShrink: 0,
                              }}>
                                {task.completedSubtaskCount}/{task.subtaskCount}
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p style={{
                              margin: '2px 0 0',
                              fontSize: 12,
                              color: 'var(--text-faint)',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                            }}>
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Priority badge */}
                        <span style={{
                          width: 90,
                          textAlign: 'center',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: pConfig.color,
                          background: `${pConfig.color}12`,
                          borderRadius: 'var(--radius-pill)',
                          padding: '3px 8px',
                          flexShrink: 0,
                        }}>
                          {t(`tasks.priority.${task.priority}`)}
                        </span>

                        {/* Story points */}
                        <div style={{ width: 60, textAlign: 'center', flexShrink: 0 }}>
                          {task.storyPoints != null ? (
                            <span style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: 'var(--accent)',
                              background: 'var(--accent-muted)',
                              borderRadius: 'var(--radius-pill)',
                              padding: '2px 8px',
                              fontFamily: 'var(--font-mono)',
                            }}>
                              {task.storyPoints}
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>--</span>
                          )}
                        </div>

                        {/* Status */}
                        <div style={{ width: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, flexShrink: 0 }}>
                          <span style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: (STATUS_CONFIG[task.status] ?? { dot: DEFAULT_STATUS_COLOR }).dot,
                            flexShrink: 0,
                          }} />
                          <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: (STATUS_CONFIG[task.status] ?? { color: DEFAULT_STATUS_COLOR }).color,
                            fontFamily: 'var(--font-mono)',
                          }}>
                            {t(`tasks.status.${task.status}`, { defaultValue: task.status.replace(/_/g, ' ') })}
                          </span>
                        </div>
                      </button>

                      {/* Expanded subtasks */}
                      {isStory && isExpanded && (storySubtasks[task.id] ?? []).map((sub) => {
                        const subStatus = STATUS_CONFIG[sub.status] ?? { color: DEFAULT_STATUS_COLOR, dot: DEFAULT_STATUS_COLOR };
                        return (
                          <button
                            key={sub.id}
                            onClick={() => canEditBacklogTask && setModalTask(sub)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '8px 16px 8px 56px',
                              background: 'var(--bg)',
                              border: 'none',
                              borderTop: '1px solid var(--border)',
                              cursor: canEditBacklogTask ? 'pointer' : 'default',
                              transition: 'background 150ms',
                            }}
                            onMouseEnter={e => canEditBacklogTask && (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
                          >
                            <CheckSquare size={12} strokeWidth={2} style={{ color: '#2563EB', flexShrink: 0 }} />
                            <p style={{
                              flex: 1,
                              margin: 0,
                              fontSize: 12,
                              fontWeight: 500,
                              color: sub.status === 'DONE' ? 'var(--text-muted)' : 'var(--text)',
                              textDecoration: sub.status === 'DONE' ? 'line-through' : 'none',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                            }}>
                              {sub.title}
                            </p>
                            {/* Assignee */}
                            <div style={{ width: 90, textAlign: 'center', flexShrink: 0 }}>
                              {sub.assigneeId && userMap[sub.assigneeId] && (
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {userMap[sub.assigneeId].fullName ?? userMap[sub.assigneeId].username}
                                </span>
                              )}
                            </div>
                            {/* Status */}
                            <div style={{ width: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, flexShrink: 0 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: subStatus.dot, flexShrink: 0 }} />
                              <span style={{ fontSize: 10, fontWeight: 600, color: subStatus.color, fontFamily: 'var(--font-mono)' }}>
                                {t(`tasks.status.${sub.status}`, { defaultValue: sub.status.replace(/_/g, ' ') })}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Footer stats */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 500 }}>Total:</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{tasks.length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 500 }}>Points:</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{totalPoints}</span>
            </div>
          </div>
        </div>
      )}

      {/* Task modal */}
      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          projectId={projectId}
          defaultStatus="TODO"
          defaultType={createType}
          onClose={() => setModalTask(undefined)}
          onSave={handleSave}
          onMove={undefined}
          onDelete={modalTask && canDeleteBacklogTask ? handleDelete : undefined}
        />
      )}
    </div>
  );
}