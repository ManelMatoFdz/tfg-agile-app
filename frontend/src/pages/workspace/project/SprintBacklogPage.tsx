import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, ChevronRight, ChevronDown, Zap, Filter as FilterIcon,
  BookOpen, CheckSquare, Bug, ListChecks, Calendar, Plus, X, Search, Check,
} from 'lucide-react';
import type { Sprint, Task, TaskPriority, TaskType, UserSummary, Label } from '../../../types';
import { sprintsApi } from '../../../api/sprints';
import { tasksApi } from '../../../api/tasks';
import { labelsApi } from '../../../api/labels';
import { AssigneeAvatar } from '../../../components/kanban/AssigneePicker';
import SubtaskModal from '../../../components/kanban/SubtaskModal';
import TaskFilterBar, { type TaskFilters, EMPTY_FILTERS, hasActiveFilters } from '../../../components/kanban/TaskFilterBar';
import Alert from '../../../components/ui/Alert';
import PageTitle from '../../../components/motion/PageTitle';
import { useProjectMember } from '../../../hooks/useProjectMember';
import { useProjectMembers } from '../../../hooks/useProjectMembers';
import { useBoardColumns, getStatusLabel, getStatusColor } from '../../../hooks/useBoardColumns';

const TYPE_ICON: Record<TaskType, { icon: typeof BookOpen; color: string }> = {
  STORY: { icon: BookOpen, color: '#7C3AED' },
  TASK:  { icon: CheckSquare, color: '#2563EB' },
  BUG:   { icon: Bug, color: '#DC2626' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { color: string }> = {
  CRITICAL: { color: '#DC2626' },
  HIGH:     { color: '#D97706' },
  MEDIUM:   { color: '#2563EB' },
  LOW:      { color: 'var(--text-faint)' },
};


function formatDateShort(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const FILTER_STORAGE_KEY = (sid: string) => `filters_${sid}_sprint_backlog`;

function loadFilters(sprintId: string): TaskFilters {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY(sprintId));
    if (raw) return { ...EMPTY_FILTERS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...EMPTY_FILTERS };
}

const PAGE_SIZE = 10;

export default function SprintBacklogPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId, sprintId } = useParams<{
    workspaceId: string;
    projectId: string;
    sprintId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { canAddToActiveSprint } = useProjectMember(projectId);
  const { members, userMap } = useProjectMembers(projectId);
  const columns = useBoardColumns(projectId);

  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subtaskModalTask, setSubtaskModalTask] = useState<Task | null>(null);

  const [labels, setLabels] = useState<Label[]>([]);
  const [filters, setFilters] = useState<TaskFilters>(() => sprintId ? loadFilters(sprintId) : { ...EMPTY_FILTERS });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());
  const [storySubtasks, setStorySubtasks] = useState<Record<string, Task[]>>({});
  const [currentPage, setCurrentPage] = useState(1);

  // Add from backlog modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [backlogItems, setBacklogItems] = useState<Task[]>([]);
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [backlogSearch, setBacklogSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addingTasks, setAddingTasks] = useState(false);
  const backlogSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (!projectId) return;
    labelsApi.getByProject(projectId).then(setLabels).catch(() => {});
  }, [projectId]);

  const fetchData = useCallback(
    async (f?: TaskFilters) => {
      if (!sprintId) return;
      setLoading(true);
      try {
        const [sprintData, tasksData] = await Promise.all([
          sprintsApi.getSprint(sprintId),
          sprintsApi.getSprintStories(sprintId, f),
        ]);
        setSprint(sprintData);
        setTasks(tasksData);
      } catch {
        setError(t('projects.sprints.sprintBacklog.loadError'));
      } finally {
        setLoading(false);
      }
    },
    [sprintId, t],
  );

  useEffect(() => {
    fetchData(filters);
  }, [fetchData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = useCallback(
    (next: TaskFilters) => {
      setFilters(next);
      setCurrentPage(1);
      if (sprintId) localStorage.setItem(FILTER_STORAGE_KEY(sprintId), JSON.stringify(next));

      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (next.search !== filters.search && next.search.length > 0) {
        debounceRef.current = setTimeout(() => fetchData(next), 300);
      } else {
        fetchData(next);
      }
    },
    [sprintId, filters.search, fetchData],
  );

  const openTask = (task: Task) =>
    navigate(
      `/workspaces/${workspaceId}/projects/${task.projectId ?? projectId}/tasks/${task.id}`,
      { state: { from: location.pathname + location.search, task } },
    );

  // ── Add from backlog handlers ──────────────────────────────────────────────

  const fetchBacklog = useCallback(
    async (search?: string) => {
      if (!projectId) return;
      setBacklogLoading(true);
      try {
        const f: TaskFilters = { ...EMPTY_FILTERS, search: search ?? '' };
        const items = await sprintsApi.getBacklog(projectId, f);
        setBacklogItems(items);
      } catch { /* ignore */ }
      finally { setBacklogLoading(false); }
    },
    [projectId],
  );

  const openAddModal = () => {
    setShowAddModal(true);
    setSelectedIds(new Set());
    setBacklogSearch('');
    fetchBacklog();
  };

  const handleBacklogSearch = (value: string) => {
    setBacklogSearch(value);
    if (backlogSearchRef.current) clearTimeout(backlogSearchRef.current);
    backlogSearchRef.current = setTimeout(() => fetchBacklog(value), 300);
  };

  const toggleSelected = (taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (!sprintId || selectedIds.size === 0) return;
    setAddingTasks(true);
    try {
      await sprintsApi.assignTasksToSprint(sprintId, Array.from(selectedIds));
      setShowAddModal(false);
      fetchData(filters);
    } catch {
      setError(t('projects.sprints.planning.error'));
    } finally {
      setAddingTasks(false);
    }
  };

  const memberSummaries: UserSummary[] = members.map((m) => userMap[m.userId]).filter(Boolean) as UserSummary[];

  const STATUS_OPTIONS = columns.map((c) => ({
    key: c.name,
    label: getStatusLabel(c.name, columns, t),
  }));

  const totalPoints = tasks.reduce((sum, task) => sum + (task.storyPoints ?? 0), 0);
  const doneCount = tasks.filter((task) => task.status === 'DONE').length;

  const sortedTasks = [...tasks].sort((a, b) => {
    const statusOrder: Record<string, number> = { TODO: 0, IN_PROGRESS: 1, IN_REVIEW: 2, DONE: 3 };
    const sa = statusOrder[a.status] ?? 0;
    const sb = statusOrder[b.status] ?? 0;
    if (sa !== sb) return sa - sb;
    return a.position - b.position;
  });
  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTasks = sortedTasks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const isActive = sprint?.status === 'ACTIVE';
  const isCompleted = sprint?.status === 'COMPLETED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Breadcrumb + back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => navigate(`/workspaces/${workspaceId}/projects/${projectId}/sprints`)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 12px', fontSize: 13, fontWeight: 500,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
        >
          <ChevronLeft size={14} strokeWidth={2} />
          {t('projects.sprints.title')}
        </button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <PageTitle as="h2" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ListChecks size={22} strokeWidth={2} style={{ color: 'var(--accent-text)' }} />
                {t('projects.sprints.sprintBacklog.title')}: {sprint?.name}
              </span>
            </PageTitle>
            {sprint?.status && (
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: isActive ? 'var(--accent-text)' : isCompleted ? 'var(--success-text)' : 'var(--text-faint)',
                background: isActive ? 'var(--accent-muted)' : isCompleted ? 'var(--success-bg, rgba(34,197,94,0.1))' : 'var(--bg-hover)',
                padding: '4px 10px', borderRadius: 'var(--radius-sm)',
              }}>
                {t(`projects.sprints.status.${sprint.status}`)}
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>
            {t('projects.sprints.sprintBacklog.subtitle')}
          </p>
        </div>

        {/* Actions + Stats badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {isActive && canAddToActiveSprint && (
            <button
              onClick={openAddModal}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', fontSize: 13, fontWeight: 600,
                background: 'var(--accent)', color: 'var(--accent-fg)',
                border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
            >
              <Plus size={14} strokeWidth={2.5} />
              {t('projects.sprints.sprintBacklog.addTasks')}
            </button>
          )}
          {sprint && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            }}>
              <Calendar size={13} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
                {formatDateShort(sprint.startDate)} - {formatDateShort(sprint.endDate)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sprint Goal */}
      {sprint?.goal && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          background: 'var(--accent-muted)', border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px',
        }}>
          <Zap size={14} strokeWidth={2} style={{ color: 'var(--accent-text)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t('projects.sprints.planning.goal')}
            </span>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text)' }}>
              {sprint.goal}
            </p>
          </div>
        </div>
      )}

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
            width: 28, height: 28,
            border: '3px solid var(--border)', borderTopColor: 'var(--accent-text)',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite',
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
            width: 56, height: 56,
            background: 'var(--accent-muted)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            {hasActiveFilters(filters)
              ? <FilterIcon size={24} strokeWidth={1.5} style={{ color: 'var(--accent-text)' }} />
              : <ListChecks size={24} strokeWidth={1.5} style={{ color: 'var(--accent-text)' }} />
            }
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
            {hasActiveFilters(filters) ? t('tasks.filters.noResults') : t('projects.sprints.sprintBacklog.noTasks')}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            {hasActiveFilters(filters) ? t('tasks.filters.noResultsSub') : t('projects.sprints.sprintBacklog.noTasksSub')}
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
              const statusColor = getStatusColor(task.status, columns);
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
                    onClick={() => openTask(task)}
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
                      cursor: 'pointer',
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
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

                    {/* Summary */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <p style={{
                          margin: 0, fontSize: 14, fontWeight: 500,
                          color: task.status === 'DONE' ? 'var(--text-muted)' : 'var(--text)',
                          textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        }}>
                          {task.title}
                        </p>
                        {task.subtaskCount > 0 && (
                          <span style={{
                            fontSize: 10, fontWeight: 600,
                            color: task.completedSubtaskCount === task.subtaskCount ? '#16A34A' : 'var(--text-muted)',
                            fontFamily: 'var(--font-mono)', flexShrink: 0,
                          }}>
                            {task.completedSubtaskCount}/{task.subtaskCount}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p style={{
                          margin: '3px 0 0', fontSize: 12, color: 'var(--text-faint)',
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
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
                                display: 'inline-block', fontSize: 10, fontWeight: 700,
                                letterSpacing: '0.04em', textTransform: 'uppercase',
                                color: label.color, background: `${label.color}14`,
                                border: `1px solid ${label.color}40`,
                                borderRadius: 'var(--radius-sm)',
                                padding: '1px 8px', whiteSpace: 'nowrap',
                                overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
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
                              borderRadius: 'var(--radius-sm)', lineHeight: '16px',
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
                        display: 'inline-block', fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        color: pConfig.color, background: `${pConfig.color}12`,
                        borderRadius: 'var(--radius-pill)', padding: '3px 10px',
                      }}>
                        {t(`tasks.priority.${task.priority}`)}
                      </span>
                    </div>

                    {/* Estimate */}
                    <div style={{ textAlign: 'center' }}>
                      {task.storyPoints != null ? (
                        <span style={{
                          fontWeight: 700,
                          color: 'var(--accent-text)',
                          background: 'var(--accent-muted)',
                          borderRadius: 'var(--radius-pill)',
                          width: 26,
                          height: 26,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {task.storyPoints}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>—</span>
                      )}
                    </div>

                    {/* Status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: statusColor, flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: statusColor }}>
                        {getStatusLabel(task.status, columns, t)}
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
                          width: 28, height: 28, borderRadius: '50%',
                          border: '1.5px dashed var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--text-faint)', fontSize: 12,
                        }}>
                          —
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Expanded subtasks — simplified row: checkbox, title, assignee */}
                  {isStory && isExpanded && (storySubtasks[task.id] ?? []).map((sub) => {
                    const subDone = sub.completedAt != null;
                    const subAssignee = sub.assigneeId ? userMap[sub.assigneeId] : undefined;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setSubtaskModalTask(sub)}
                        style={{
                          width: '100%', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 24px 10px 70px',
                          background: 'var(--bg)', border: 'none',
                          borderTop: '1px solid var(--border)',
                          cursor: 'pointer', transition: 'background 150ms',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
                      >
                        {/* Checkbox indicator */}
                        <span style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          border: subDone ? 'none' : '2px solid var(--border-strong)',
                          background: subDone ? '#3B82F6' : 'var(--bg-elevated)',
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
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            padding: '20px 24px 4px',
          }}>
            {/* Stats */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 48 }}>
              <div>
                <span style={{
                  display: 'block', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: 'var(--text-faint)', marginBottom: 2,
                }}>
                  {t('projects.backlog.totalItems')}
                </span>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  {tasks.length}
                </span>
              </div>
              <div>
                <span style={{
                  display: 'block', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: 'var(--text-faint)', marginBottom: 2,
                }}>
                  {t('projects.backlog.totalPoints')}
                </span>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  {totalPoints}
                </span>
              </div>
              <div>
                <span style={{
                  display: 'block', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: 'var(--text-faint)', marginBottom: 2,
                }}>
                  {t('projects.sprints.sprintBacklog.completed')}
                </span>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-text)', fontFamily: 'var(--font-mono)' }}>
                  {doneCount}/{tasks.length}
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
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32,
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
                fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', whiteSpace: 'nowrap',
              }}>
                {t('projects.backlog.page', { current: safePage, total: totalPages })}
              </span>
              {totalPages > 1 && (
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32,
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

      {/* Add from backlog modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            backgroundColor: 'var(--bg-overlay)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            animation: 'fade-in 200ms ease both',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div style={{
            width: '100%', maxWidth: 600, maxHeight: '80vh',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px 14px',
              borderBottom: '1px solid var(--border)',
            }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                {t('projects.sprints.sprintBacklog.addTasks')}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: 4, background: 'transparent', border: 'none',
                  color: 'var(--text-muted)', cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
              }}>
                <Search size={14} strokeWidth={2} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                <input
                  type="text"
                  value={backlogSearch}
                  onChange={(e) => handleBacklogSearch(e.target.value)}
                  placeholder={t('projects.sprints.sprintBacklog.searchBacklog')}
                  autoFocus
                  style={{
                    flex: 1, border: 'none', background: 'transparent',
                    color: 'var(--text)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Task list */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '8px 12px',
              minHeight: 200, maxHeight: 400,
            }}>
              {backlogLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <div style={{
                    width: 24, height: 24,
                    border: '2px solid var(--border)', borderTopColor: 'var(--accent-text)',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                  }} />
                </div>
              ) : backlogItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-faint)' }}>
                    {t('projects.sprints.planning.noBacklog')}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {backlogItems.map((task) => {
                    const typeConf = TYPE_ICON[task.type ?? 'TASK'];
                    const TypeIcon = typeConf.icon;
                    const selected = selectedIds.has(task.id);

                    return (
                      <button
                        key={task.id}
                        onClick={() => toggleSelected(task.id)}
                        style={{
                          width: '100%', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px',
                          background: selected ? 'var(--accent-muted)' : 'transparent',
                          border: selected ? '1px solid var(--accent)' : '1px solid transparent',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          transition: 'all 150ms',
                        }}
                        onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {/* Checkbox */}
                        <div style={{
                          width: 20, height: 20, borderRadius: 'var(--radius-sm)',
                          border: selected ? '2px solid var(--accent)' : '2px solid var(--border)',
                          background: selected ? 'var(--accent)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'all 150ms',
                        }}>
                          {selected && <Check size={12} strokeWidth={3} style={{ color: 'var(--accent-fg)' }} />}
                        </div>

                        {/* Type icon */}
                        <TypeIcon size={14} strokeWidth={2} style={{ color: typeConf.color, flexShrink: 0 }} />

                        {/* Title + meta */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text)',
                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                          }}>
                            {task.title}
                          </p>
                        </div>

                        {/* Priority */}
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: PRIORITY_CONFIG[task.priority].color,
                          background: `${PRIORITY_CONFIG[task.priority].color}12`,
                          borderRadius: 'var(--radius-pill)', padding: '2px 8px',
                          flexShrink: 0,
                        }}>
                          {t(`tasks.priority.${task.priority}`)}
                        </span>

                        {/* Story points */}
                        {task.storyPoints != null && (
                          <span style={{
                            fontWeight: 700,
                            color: 'var(--accent-text)',
                            background: 'var(--accent-muted)',
                            borderRadius: 'var(--radius-pill)',
                            width: 22,
                            height: 22,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontFamily: 'var(--font-mono)',
                            flexShrink: 0,
                          }}>
                            {task.storyPoints}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px 16px',
              borderTop: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                {selectedIds.size > 0
                  ? t('projects.sprints.sprintBacklog.selectedCount', { count: selectedIds.size })
                  : t('projects.sprints.sprintBacklog.selectHint')}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '5px 12px', fontSize: 12, fontWeight: 500,
                    background: 'transparent', color: 'var(--text-muted)',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleAddSelected}
                  disabled={selectedIds.size === 0 || addingTasks}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', fontSize: 13, fontWeight: 600,
                    background: 'var(--accent)', color: 'var(--accent-fg)',
                    border: 'none', borderRadius: 'var(--radius-md)',
                    cursor: selectedIds.size === 0 || addingTasks ? 'not-allowed' : 'pointer',
                    opacity: selectedIds.size === 0 || addingTasks ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { if (selectedIds.size > 0 && !addingTasks) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  {addingTasks ? '...' : t('projects.sprints.planning.addSelected')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtask modal */}
      {subtaskModalTask && (
        <SubtaskModal
          subtask={subtaskModalTask}
          columns={columns}
          readOnly={isCompleted}
          onClose={() => setSubtaskModalTask(null)}
          onUpdated={(updated) => {
            setStorySubtasks(prev => {
              const parentId = updated.parentId;
              if (!parentId) return prev;
              return { ...prev, [parentId]: (prev[parentId] ?? []).map(s => s.id === updated.id ? updated : s) };
            });
          }}
          onDeleted={(deletedId) => {
            setStorySubtasks(prev => {
              const newMap = { ...prev };
              for (const key of Object.keys(newMap)) {
                newMap[key] = newMap[key].filter(s => s.id !== deletedId);
              }
              return newMap;
            });
          }}
        />
      )}
    </div>
  );
}
