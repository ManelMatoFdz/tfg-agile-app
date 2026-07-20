import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, ClipboardList, Filter as FilterIcon, BookOpen, CheckSquare, Bug, ChevronRight, ChevronDown, ChevronLeft } from 'lucide-react';
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
import { AssigneeAvatar } from '../../../components/kanban/TaskModal';
import TaskModal from '../../../components/kanban/TaskModal';
import SubtaskModal from '../../../components/kanban/SubtaskModal';
import TaskFilterBar, { type TaskFilters, EMPTY_FILTERS, hasActiveFilters } from '../../../components/kanban/TaskFilterBar';
import Alert from '../../../components/ui/Alert';
import PageTitle from '../../../components/motion/PageTitle';
import { useProjectMember } from '../../../hooks/useProjectMember';
import { useProjectMembers } from '../../../hooks/useProjectMembers';
import { useBoardColumns, getStatusLabel } from '../../../hooks/useBoardColumns';
import type { Label } from '../../../types';

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; bg: string; border: string }> = {
  CRITICAL: { color: '#DC2626', bg: 'rgba(220,38,38,0.06)', border: '#DC2626' },
  HIGH:     { color: '#D97706', bg: 'rgba(217,119,6,0.06)', border: '#D97706' },
  MEDIUM:   { color: '#2563EB', bg: 'rgba(37,99,235,0.06)', border: '#2563EB' },
  LOW:      { color: '#94A3B8', bg: 'var(--bg-hover)',       border: '#CBD5E1' },
};

const READY_CONFIG = {
  ready:    { color: '#16A34A', dot: '#16A34A' },
  notReady: { color: '#D97706', dot: '#D97706' },
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
  const columns = useBoardColumns(projectId);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalTask, setModalTask] = useState<Task | null | undefined>(undefined);
  const [subtaskModalTask, setSubtaskModalTask] = useState<Task | null>(null);

  const [labels, setLabels] = useState<Label[]>([]);
  const [filters, setFilters] = useState<TaskFilters>(() => projectId ? loadFilters(projectId) : { ...EMPTY_FILTERS });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());
  const [storySubtasks, setStorySubtasks] = useState<Record<string, Task[]>>({});
  const [createType, setCreateType] = useState<TaskType>('TASK');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

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
      setCurrentPage(1);
      if (projectId) localStorage.setItem(FILTER_STORAGE_KEY(projectId), JSON.stringify(next));

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

  const STATUS_OPTIONS = columns.map((c) => ({
    key: c.name,
    label: getStatusLabel(c.name, columns, t),
  }));

  const totalPoints = tasks.reduce((sum, task) => sum + (task.storyPoints ?? 0), 0);
  const readyCount = tasks.filter((task) => task.ready).length;

  const sortedTasks = [...tasks].sort((a, b) => a.position - b.position);
  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTasks = sortedTasks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClipboardList size={22} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
            <PageTitle as="h2" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
              {t('projects.backlog.title')}
            </PageTitle>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>
            {t('projects.backlog.subtitle')}
          </p>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '56px 1fr 180px 100px 120px 120px 80px',
            alignItems: 'center',
            gap: 16,
            padding: '14px 24px',
            borderBottom: '1px solid var(--border)',
            marginBottom: 8,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
          }}>
            <span>{t('projects.backlog.colType')}</span>
            <span>{t('projects.backlog.colSummary')}</span>
            <span style={{ textAlign: 'center' }}>{t('projects.backlog.colLabels')}</span>
            <span style={{ textAlign: 'center' }}>{t('projects.backlog.colPriority')}</span>
            <span style={{ textAlign: 'center' }}>{t('projects.backlog.colEstimate')}</span>
            <span style={{ textAlign: 'center' }}>{t('projects.backlog.colStatus')}</span>
            <span style={{ textAlign: 'center' }}>{t('projects.backlog.colAssignee')}</span>
          </div>

          {/* Task rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {paginatedTasks.map((task) => {
              const typeConf = TYPE_ICON[task.type ?? 'TASK'];
              const TypeIcon = typeConf.icon;
              const pConfig = PRIORITY_CONFIG[task.priority];
              const readyConf = task.ready ? READY_CONFIG.ready : READY_CONFIG.notReady;
              const isStory = task.subtaskCount > 0;
              const isExpanded = expandedStories.has(task.id);
              const assignee = task.assigneeId ? userMap[task.assigneeId] : undefined;

              return (
                <div
                  key={task.id}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${typeConf.color}`,
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <button
                    onClick={() => canEditBacklogTask && setModalTask(task)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      display: 'grid',
                      gridTemplateColumns: '56px 1fr 180px 100px 120px 120px 80px',
                      alignItems: 'center',
                      gap: 16,
                      padding: '18px 24px',
                      background: 'transparent',
                      border: 'none',
                      cursor: canEditBacklogTask ? 'pointer' : 'default',
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={e => canEditBacklogTask && (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Type icon + expand toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
                      <TypeIcon size={16} strokeWidth={2} style={{ color: typeConf.color, flexShrink: 0 }} />
                    </div>

                    {/* Summary: title + description + subtask count */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <p style={{
                          margin: 0,
                          fontSize: 14,
                          fontWeight: 500,
                          color: 'var(--text)',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}>
                          {task.title}
                        </p>
                        {task.subtaskCount > 0 && (
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
                          margin: '3px 0 0',
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

                    {/* Labels */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3 }}>
                      {task.labels && task.labels.length > 0 ? (
                        <>
                          {task.labels.slice(0, 4).map((label) => (
                            <span
                              key={label.id}
                              style={{
                                display: 'inline-block',
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                                color: label.color,
                                background: `${label.color}14`,
                                border: `1px solid ${label.color}40`,
                                borderRadius: 'var(--radius-sm)',
                                padding: '1px 8px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '100%',
                                lineHeight: '16px',
                              }}
                            >
                              {label.name}
                            </span>
                          ))}
                          {task.labels.length > 4 && (
                            <span style={{
                              fontSize: 10, fontWeight: 600, color: 'var(--text-faint)',
                              padding: '2px 6px', background: 'var(--bg-hover)',
                              borderRadius: 'var(--radius-sm)',
                              lineHeight: '16px',
                            }}>
                              +{task.labels.length - 4}
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-faint)',  }}>—</span>
                      )}
                    </div>

                    {/* Priority badge */}
                    <div style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: pConfig.color,
                        background: `${pConfig.color}12`,
                        borderRadius: 'var(--radius-pill)',
                        padding: '3px 10px',
                      }}>
                        {t(`tasks.priority.${task.priority}`)}
                      </span>
                    </div>

                    {/* Estimate */}
                    <div style={{ textAlign: 'center' }}>
                      {task.storyPoints != null ? (
                        <span style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--text)',
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {task.storyPoints} pts
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>—</span>
                      )}
                    </div>

                    {/* Ready status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <span style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: readyConf.dot,
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: readyConf.color,
                      }}>
                        {task.ready ? t('tasks.modal.readyLabel') : t('tasks.modal.notReadyLabel')}
                      </span>
                    </div>

                    {/* Assignee */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {assignee ? (
                        <AssigneeAvatar
                          name={assignee.fullName ?? assignee.username}
                          avatarUrl={assignee.avatarUrl}
                          size={28}
                        />
                      ) : (
                        <span style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          border: '1.5px dashed var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-faint)',
                          fontSize: 12,
                        }}>
                          —
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Expanded subtasks — simplified row: icon, title, done status, assignee */}
                  {isStory && isExpanded && (storySubtasks[task.id] ?? []).map((sub) => {
                    const subDone = sub.completedAt != null;
                    const subAssignee = sub.assigneeId ? userMap[sub.assigneeId] : undefined;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => canEditBacklogTask && setSubtaskModalTask(sub)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 24px 10px 70px',
                          background: 'var(--bg)',
                          border: 'none',
                          borderTop: '1px solid var(--border)',
                          cursor: canEditBacklogTask ? 'pointer' : 'default',
                          transition: 'background 150ms',
                        }}
                        onMouseEnter={e => canEditBacklogTask && (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
                      >
                        {/* Checkbox indicator */}
                        <span style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          border: subDone ? 'none' : '2px solid #CBD5E1',
                          background: subDone ? '#3B82F6' : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {subDone && (
                            <svg width="10" height="10" viewBox="0 0 11 11" fill="none">
                              <path d="M2 5.5L4.5 8L9 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>

                        {/* Title */}
                        <span style={{
                          flex: 1, fontSize: 13, fontWeight: 400, minWidth: 0,
                          color: subDone ? 'var(--text-muted)' : 'var(--text)',
                          textDecoration: subDone ? 'line-through' : 'none',
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        }}>
                          {sub.title}
                        </span>

                        {/* Assignee — 80px to match parent grid column */}
                        <div style={{ width: 80, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                          {subAssignee ? (
                            <AssigneeAvatar
                              name={subAssignee.fullName ?? subAssignee.username}
                              avatarUrl={subAssignee.avatarUrl}
                              size={22}
                            />
                          ) : (
                            <span style={{
                              width: 22, height: 22, borderRadius: '50%',
                              border: '1.5px dashed var(--border)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'var(--text-faint)', fontSize: 9,
                            }}>
                              —
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Footer: separator + stats + pagination */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 8 }} />

          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            padding: '20px 24px 4px',
          }}>
            {/* Stats */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 48 }}>
              <div>
                <span style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-faint)',
                  marginBottom: 2,
                }}>
                  {t('projects.backlog.totalItems')}
                </span>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  {tasks.length}
                </span>
              </div>
              <div>
                <span style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-faint)',
                  marginBottom: 2,
                }}>
                  {t('projects.backlog.totalPoints')}
                </span>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  {totalPoints}
                </span>
              </div>
              <div>
                <span style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-faint)',
                  marginBottom: 2,
                }}>
                  {t('projects.backlog.readyForSprint')}
                </span>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                  {readyCount}
                </span>
              </div>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {totalPages > 1 && (
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: safePage <= 1 ? 'var(--bg)' : 'var(--bg-elevated)',
                    color: safePage <= 1 ? 'var(--text-faint)' : 'var(--text)',
                    cursor: safePage <= 1 ? 'default' : 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  <ChevronLeft size={16} strokeWidth={2} />
                </button>
              )}
              <span style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
              }}>
                {t('projects.backlog.page', { current: safePage, total: totalPages })}
              </span>
              {totalPages > 1 && (
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: safePage >= totalPages ? 'var(--bg)' : 'var(--bg-elevated)',
                    color: safePage >= totalPages ? 'var(--text-faint)' : 'var(--text)',
                    cursor: safePage >= totalPages ? 'default' : 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  <ChevronRight size={16} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task modal */}
      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          projectId={projectId}
          columns={columns}
          defaultStatus="TODO"
          defaultType={createType}
          onClose={() => setModalTask(undefined)}
          onSave={handleSave}
          onMove={undefined}
          onDelete={modalTask && canDeleteBacklogTask ? handleDelete : undefined}
        />
      )}

      {/* Subtask modal */}
      {subtaskModalTask && (
        <SubtaskModal
          subtask={subtaskModalTask}
          columns={columns}
          readOnly
          onClose={() => setSubtaskModalTask(null)}
        />
      )}
    </div>
  );
}