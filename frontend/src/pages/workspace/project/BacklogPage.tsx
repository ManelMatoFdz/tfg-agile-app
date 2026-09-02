import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Filter as FilterIcon, BookOpen, CheckSquare, Bug, ChevronRight, ChevronDown, ChevronLeft, Target, Lock } from 'lucide-react';
import type { Task, TaskPriority, TaskType, UserSummary } from '../../../types';
import { sprintsApi } from '../../../api/sprints';
import { tasksApi } from '../../../api/tasks';

const TYPE_ICON: Record<TaskType, { icon: typeof BookOpen; color: string }> = {
  STORY: { icon: BookOpen, color: '#7C3AED' },
  TASK:  { icon: CheckSquare, color: '#2563EB' },
  BUG:   { icon: Bug, color: '#DC2626' },
};
import { labelsApi } from '../../../api/labels';
import { epicsApi } from '../../../api/epics';
import { AssigneeAvatar } from '../../../components/kanban/AssigneePicker';
import CreateTaskModal from '../../../components/kanban/CreateTaskModal';
import SubtaskModal from '../../../components/kanban/SubtaskModal';
import TaskFilterBar, { type TaskFilters, EMPTY_FILTERS, hasActiveFilters } from '../../../components/kanban/TaskFilterBar';
import Alert from '../../../components/ui/Alert';
import PageTitle from '../../../components/motion/PageTitle';
import { useProjectMember } from '../../../hooks/useProjectMember';
import { useProjectMembers } from '../../../hooks/useProjectMembers';
import { useBoardColumns, getStatusLabel } from '../../../hooks/useBoardColumns';
import type { Label, Epic } from '../../../types';

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; bg: string; border: string }> = {
  CRITICAL: { color: '#DC2626', bg: 'rgba(220,38,38,0.06)', border: '#DC2626' },
  HIGH:     { color: '#D97706', bg: 'rgba(217,119,6,0.06)', border: '#D97706' },
  MEDIUM:   { color: '#2563EB', bg: 'rgba(37,99,235,0.06)', border: '#2563EB' },
  LOW:      { color: 'var(--text-faint)', bg: 'var(--bg-hover)',       border: 'var(--border-strong)' },
};

const READY_CONFIG = {
  ready:    { color: '#16A34A', dot: '#16A34A' },
  notReady: { color: '#D97706', dot: '#D97706' },
};


const FILTER_STORAGE_KEY = (pid: string) => `filters_${pid}_backlog`;
const GROUP_EPIC_KEY = (pid: string) => `backlog_groupByEpic_${pid}`;

function loadFilters(projectId: string): TaskFilters {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY(projectId));
    if (raw) return { ...EMPTY_FILTERS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...EMPTY_FILTERS };
}

export default function BacklogPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { canCreateTask, canEditBacklogTask } = useProjectMember(projectId);
  const { members, userMap } = useProjectMembers(projectId);
  const columns = useBoardColumns(projectId);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [subtaskModalTask, setSubtaskModalTask] = useState<Task | null>(null);

  const [labels, setLabels] = useState<Label[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [filters, setFilters] = useState<TaskFilters>(() => projectId ? loadFilters(projectId) : { ...EMPTY_FILTERS });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());
  const [storySubtasks, setStorySubtasks] = useState<Record<string, Task[]>>({});
  const [createType, setCreateType] = useState<TaskType>('TASK');
  const [groupByEpic, setGroupByEpic] = useState(() => {
    if (!projectId) return false;
    return localStorage.getItem(GROUP_EPIC_KEY(projectId)) === 'true';
  });
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [epicVisibleCount, setEpicVisibleCount] = useState<Record<string, number>>({});
  const EPIC_PAGE_SIZE = 8;
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
    epicsApi.getByProject(projectId).then(setEpics).catch(() => {});
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
  const totalPages = groupByEpic ? 1 : Math.max(1, Math.ceil(sortedTasks.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTasks = groupByEpic ? sortedTasks : sortedTasks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleGroupByEpic = () => {
    const next = !groupByEpic;
    setGroupByEpic(next);
    setExpandedEpics(new Set());
    setEpicVisibleCount({});
    if (projectId) localStorage.setItem(GROUP_EPIC_KEY(projectId), String(next));
  };

  const toggleEpicExpanded = (key: string) => {
    setExpandedEpics(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getEpicKey = (epicId: string | null) => epicId ?? '__none__';

  const showMoreForEpic = useCallback((key: string, total: number) => {
    setEpicVisibleCount(prev => ({
      ...prev,
      [key]: Math.min((prev[key] ?? EPIC_PAGE_SIZE) + EPIC_PAGE_SIZE, total),
    }));
  }, []);

  // Build epic groups when grouping is active
  const epicGroups = groupByEpic ? (() => {
    const groups: { epicId: string | null; epicName: string; epicColor: string; tasks: Task[] }[] = [];
    const byEpic = new Map<string | null, Task[]>();

    for (const task of sortedTasks) {
      const key = task.epicId ?? null;
      if (!byEpic.has(key)) byEpic.set(key, []);
      byEpic.get(key)!.push(task);
    }

    // Epics first (in epic list order), then "Sin epic" last
    for (const epic of epics) {
      const epicTasks = byEpic.get(epic.id);
      if (epicTasks && epicTasks.length > 0) {
        groups.push({ epicId: epic.id, epicName: epic.name, epicColor: epic.color, tasks: epicTasks });
        byEpic.delete(epic.id);
      }
    }

    // Tasks without epic
    const noEpicTasks = byEpic.get(null);
    if (noEpicTasks && noEpicTasks.length > 0) {
      groups.push({ epicId: null, epicName: t('tasks.modal.noEpic'), epicColor: 'var(--text-faint)', tasks: noEpicTasks });
    }

    return groups;
  })() : [];

  const openTask = (task: Task) =>
    navigate(
      `/workspaces/${workspaceId}/projects/${task.projectId ?? projectId}/tasks/${task.id}`,
      { state: { from: location.pathname + location.search, task } },
    );

  const renderTaskRow = (task: Task) => {
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
              {task.blockedByCount > 0 && (
                <span title={t('tasks.card.blocked')} style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: '#DC2626' }}>
                  <Lock size={13} strokeWidth={2} />
                </span>
              )}
              <p style={{
                margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text)',
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
                  <span key={label.id} style={{
                    display: 'inline-block', fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                    color: label.color, background: `${label.color}14`,
                    border: `1px solid ${label.color}40`, borderRadius: 'var(--radius-sm)',
                    padding: '1px 8px', whiteSpace: 'nowrap', overflow: 'hidden',
                    textOverflow: 'ellipsis', maxWidth: '100%', lineHeight: '16px',
                  }}>
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
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>—</span>
            )}
          </div>

          {/* Priority */}
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
                fontWeight: 700, color: 'var(--accent-text)', background: 'var(--accent-muted)',
                borderRadius: 'var(--radius-pill)', width: 26, height: 26,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontFamily: 'var(--font-mono)',
              }}>
                {task.storyPoints}
              </span>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>—</span>
            )}
          </div>

          {/* Ready status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: readyConf.dot, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: readyConf.color }}>
              {task.ready ? t('tasks.modal.readyLabel') : t('tasks.modal.notReadyLabel')}
            </span>
          </div>

          {/* Assignee */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {assignee ? (
              <AssigneeAvatar name={assignee.fullName ?? assignee.username} avatarUrl={assignee.avatarUrl} size={28} />
            ) : (
              <span style={{
                width: 28, height: 28, borderRadius: '50%', border: '1.5px dashed var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-faint)', fontSize: 12,
              }}>
                —
              </span>
            )}
          </div>
        </button>

        {/* Expanded subtasks */}
        {isStory && isExpanded && (storySubtasks[task.id] ?? []).map((sub) => {
          const subDone = sub.completedAt != null;
          const subAssignee = sub.assigneeId ? userMap[sub.assigneeId] : undefined;
          return (
            <button
              key={sub.id}
              onClick={() => canEditBacklogTask && setSubtaskModalTask(sub)}
              style={{
                width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center',
                gap: 10, padding: '10px 24px 10px 70px', background: 'var(--bg)',
                border: 'none', borderTop: '1px solid var(--border)',
                cursor: canEditBacklogTask ? 'pointer' : 'default', transition: 'background 150ms',
              }}
              onMouseEnter={e => canEditBacklogTask && (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
            >
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
              <span style={{
                flex: 1, fontSize: 13, fontWeight: 400, minWidth: 0,
                color: subDone ? 'var(--text-muted)' : 'var(--text)',
                textDecoration: subDone ? 'line-through' : 'none',
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}>
                {sub.title}
              </span>
              <div style={{ width: 80, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                {subAssignee ? (
                  <AssigneeAvatar name={subAssignee.fullName ?? subAssignee.username} avatarUrl={subAssignee.avatarUrl} size={22} />
                ) : (
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', border: '1.5px dashed var(--border)',
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
                  onClick={() => { setCreateType(item.type); setCreating(true); }}
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

      {/* Filter bar + group toggle */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <TaskFilterBar
            filters={filters}
            onChange={handleFilterChange}
            members={memberSummaries}
            labels={labels}
            epics={epics}
            showStatus
            statuses={STATUS_OPTIONS}
          />
        </div>
        {epics.length > 0 && (
          <button
            onClick={toggleGroupByEpic}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              color: groupByEpic ? 'var(--accent-text)' : 'var(--text-muted)',
              background: groupByEpic ? 'var(--accent-muted)' : 'var(--bg-elevated)',
              border: `1.5px solid ${groupByEpic ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all 150ms',
              flexShrink: 0,
            }}
          >
            <Target size={13} strokeWidth={2} />
            {t('projects.backlog.groupByEpic')}
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: 28,
            height: 28,
            border: '3px solid var(--border)',
            borderTopColor: 'var(--accent-text)',
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
              ? <FilterIcon size={24} strokeWidth={1.5} style={{ color: 'var(--accent-text)' }} />
              : <ClipboardList size={24} strokeWidth={1.5} style={{ color: 'var(--accent-text)' }} />
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
          {groupByEpic && epicGroups.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {epicGroups.map((group) => {
                const key = getEpicKey(group.epicId);
                const isCollapsed = !expandedEpics.has(key);
                const visibleCount = epicVisibleCount[key] ?? EPIC_PAGE_SIZE;
                const visibleTasks = group.tasks.slice(0, visibleCount);
                const hasMore = visibleCount < group.tasks.length;
                const groupSP = group.tasks.reduce((s, tk) => s + (tk.storyPoints ?? 0), 0);

                return (
                  <div key={key} style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    background: 'var(--bg)',
                  }}>
                    {/* Epic section header — clickable to collapse/expand */}
                    <button
                      onClick={() => toggleEpicExpanded(key)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 24px',
                        background: `${group.epicColor}08`,
                        borderBottom: isCollapsed ? 'none' : `2px solid ${group.epicColor}40`,
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 150ms',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = `${group.epicColor}14`)}
                      onMouseLeave={e => (e.currentTarget.style.background = `${group.epicColor}08`)}
                    >
                      {isCollapsed
                        ? <ChevronRight size={14} strokeWidth={2} style={{ color: group.epicColor, flexShrink: 0 }} />
                        : <ChevronDown size={14} strokeWidth={2} style={{ color: group.epicColor, flexShrink: 0 }} />
                      }
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: group.epicColor, flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: 13, fontWeight: 700, color: group.epicColor,
                        letterSpacing: '-0.01em', flex: 1, minWidth: 0,
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      }}>
                        {group.epicName}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: 'var(--text-faint)',
                        fontFamily: 'var(--font-mono)', flexShrink: 0,
                      }}>
                        {group.tasks.length} {t('projects.epics.tasks')}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: 'var(--text-faint)',
                        fontFamily: 'var(--font-mono)', flexShrink: 0, minWidth: 48,
                        textAlign: 'right',
                      }}>
                        {groupSP} SP
                      </span>
                    </button>

                    {/* Tasks — only visible when expanded */}
                    {!isCollapsed && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '8px 0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 12px' }}>
                          {visibleTasks.map((task) => renderTaskRow(task))}
                        </div>

                        {/* Load more sentinel */}
                        {hasMore && (
                          <EpicLoadMore
                            epicKey={key}
                            total={group.tasks.length}
                            visible={visibleCount}
                            onLoadMore={showMoreForEpic}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {paginatedTasks.map((task) => renderTaskRow(task))}
          </div>
          )}

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
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-text)', fontFamily: 'var(--font-mono)' }}>
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

      {/* Create task modal */}
      {creating && (
        <CreateTaskModal
          projectId={projectId!}
          defaultType={createType}
          onCreated={() => fetchTasks(filters)}
          onClose={() => setCreating(false)}
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

function EpicLoadMore({
  epicKey,
  total,
  visible,
  onLoadMore,
}: {
  epicKey: string;
  total: number;
  visible: number;
  onLoadMore: (key: string, total: number) => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMoreRef.current(epicKey, total);
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [epicKey, total, visible]);

  const remaining = total - visible;

  return (
    <div
      ref={sentinelRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 24px',
        gap: 6,
      }}
    >
      <div style={{
        width: 16, height: 16,
        border: '2px solid var(--border)',
        borderTopColor: 'var(--accent-text)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
        {remaining} more...
      </span>
    </div>
  );
}
