import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, ChevronRight, ChevronDown, CheckCircle2, TrendingUp,
  Calendar, BarChart3, LineChart as LineChartIcon, Target, Zap,
  BookOpen, CheckSquare, Bug, Archive,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import type { Sprint, SprintTaskSnapshot, Task, TaskPriority, TaskType, RetrospectiveData } from '../../../types';
import { sprintsApi } from '../../../api/sprints';
import { tasksApi } from '../../../api/tasks';
import Alert from '../../../components/ui/Alert';
import SnapshotModal from '../../../components/sprints/SnapshotModal';
import RetrospectiveModal, { parseRetrospective } from '../../../components/sprints/RetrospectiveModal';
import TaskModal from '../../../components/kanban/TaskModal';
import SubtaskModal from '../../../components/kanban/SubtaskModal';
import PageTitle from '../../../components/motion/PageTitle';
import CountUp from '../../../components/motion/CountUp';
import { useBoardColumns, getStatusLabel, getStatusColor } from '../../../hooks/useBoardColumns';
import { useProjectMember } from '../../../hooks/useProjectMember';

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  CRITICAL: '#DC2626',
  HIGH:     '#D97706',
  MEDIUM:   '#2563EB',
  LOW:      '#94A3B8',
};

const TYPE_ICON: Record<TaskType, { icon: typeof BookOpen; color: string }> = {
  STORY: { icon: BookOpen, color: '#7C3AED' },
  TASK:  { icon: CheckSquare, color: '#2563EB' },
  BUG:   { icon: Bug, color: '#DC2626' },
};

// ── Health score ──────────────────────────────────────────────────────────────

type HealthLevel = 'excellent' | 'good' | 'acceptable' | 'poor';

function getHealth(donePct: number): HealthLevel {
  if (donePct >= 0.8) return 'excellent';
  if (donePct >= 0.6) return 'good';
  if (donePct >= 0.4) return 'acceptable';
  return 'poor';
}

const HEALTH_CONFIG: Record<HealthLevel, { accent: string; bg: string; textColor: string }> = {
  excellent: { accent: 'var(--success)', bg: 'var(--success-bg)',  textColor: 'var(--success)' },
  good:      { accent: 'var(--ink-blue)', bg: 'var(--info-bg)',   textColor: 'var(--ink-blue)' },
  acceptable:{ accent: 'var(--ochre)', bg: 'var(--warning-bg)',   textColor: 'var(--ochre)' },
  poor:      { accent: 'var(--danger)', bg: 'var(--danger-bg)',   textColor: 'var(--danger)' },
};

// ── Circular progress ring ────────────────────────────────────────────────────

function CircularProgress({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const [animated, setAnimated] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setAnimated(true)); }, []);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={animated ? circ * (1 - pct) : circ}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  );
}

// ── Burndown data ─────────────────────────────────────────────────────────────

interface BurndownPoint { label: string; ideal: number; actual: number | null; }

function buildBurndown(sprint: Sprint, tasks: Task[]): { points: BurndownPoint[]; useTaskCount: boolean } | null {
  if (!sprint.startDate || !sprint.endDate || tasks.length === 0) return null;
  const start = new Date(sprint.startDate); start.setHours(0, 0, 0, 0);
  const end = new Date(sprint.endDate); end.setHours(23, 59, 59, 999);
  const today = new Date();
  const totalSP = tasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const useTaskCount = totalSP === 0;
  const total = useTaskCount ? tasks.length : totalSP;
  const doneTasks = tasks.filter((t) => t.status === 'DONE');
  const totalMs = end.getTime() - start.getTime();
  const totalDays = Math.max(Math.ceil(totalMs / 86_400_000), 1);
  const points: BurndownPoint[] = [];
  for (let i = 0; i <= totalDays; i++) {
    const day = new Date(start.getTime() + i * 86_400_000);
    const ideal = Math.round(total * (1 - i / totalDays));
    const completed = useTaskCount
      ? doneTasks.filter((t) => new Date(t.updatedAt) <= day).length
      : doneTasks.filter((t) => new Date(t.updatedAt) <= day).reduce((s, t) => s + (t.storyPoints ?? 0), 0);
    const actual = day <= today ? total - completed : null;
    points.push({ label: day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), ideal, actual });
  }
  return { points, useTaskCount };
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function BurndownTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
      borderRadius: 'var(--radius-md)', padding: '8px 10px',
      fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,.08)',
    }}>
      <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'var(--text-muted)' }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '2px 0' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-faint)' }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{p.value} {unit}</span>
        </div>
      ))}
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)',
};

// ── SprintReportPage ──────────────────────────────────────────────────────────

export default function SprintReportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceId, projectId, sprintId } = useParams<{ workspaceId: string; projectId: string; sprintId: string }>();

  const columns = useBoardColumns(projectId);
  const { canManageSprint } = useProjectMember(projectId);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [showRetroModal, setShowRetroModal] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [snapshots, setSnapshots] = useState<SprintTaskSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SprintTaskSnapshot | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [subtaskModalTask, setSubtaskModalTask] = useState<Task | null>(null);
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());
  const [storySubtasks, setStorySubtasks] = useState<Record<string, Task[]>>({});

  useEffect(() => {
    if (!sprintId) return;
    Promise.all([sprintsApi.getSprint(sprintId), sprintsApi.getSprintTasks(sprintId, undefined, true)])
      .then(async ([s, taskList]) => {
        setSprint(s);
        setTasks(taskList);
        if (s.status === 'COMPLETED') {
          try {
            const snaps = await sprintsApi.getSprintSnapshots(sprintId);
            setSnapshots(snaps);
          } catch {
            // snapshots not critical
          }
        }
      })
      .catch(() => setError(t('projects.sprints.report.loadError')))
      .finally(() => setLoading(false));
  }, [sprintId, t]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );

  if (!sprint) return null;

  // ── Derived ───────────────────────────────────────────────────────────────

  const isCompleted = sprint.status === 'COMPLETED';
  const isActive = sprint.status === 'ACTIVE';
  const hasSnapshots = isCompleted && snapshots.length > 0;

  // Metrics count only root tasks (PBIs) — subtasks are implementation details
  const rootSnapshots = snapshots.filter((s) => !s.parentTaskId);
  const rootTasks = tasks.filter((t) => !t.parentId);

  const total    = hasSnapshots ? rootSnapshots.length
    : isCompleted ? (sprint.closedTotalTasks ?? rootTasks.length)
    : rootTasks.length;
  const done     = hasSnapshots ? rootSnapshots.filter((s) => s.completed).length
    : isCompleted ? (sprint.closedDoneTasks ?? rootTasks.filter((t) => t.status === 'DONE').length)
    : rootTasks.filter((t) => t.status === 'DONE').length;
  const totalSP  = hasSnapshots ? rootSnapshots.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0)
    : isCompleted ? (sprint.closedTotalStoryPoints ?? rootTasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0))
    : rootTasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const doneSP   = hasSnapshots ? rootSnapshots.filter((s) => s.completed).reduce((sum, s) => sum + (s.storyPoints ?? 0), 0)
    : isCompleted ? (sprint.closedDoneStoryPoints ?? rootTasks.filter((t) => t.status === 'DONE').reduce((s, t) => s + (t.storyPoints ?? 0), 0))
    : rootTasks.filter((t) => t.status === 'DONE').reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const incomplete = hasSnapshots ? rootSnapshots.filter((s) => s.returnedToBacklog).length
    : isCompleted ? (sprint.closedIncompleteTasks ?? 0)
    : 0;

  const donePct = total > 0 ? done / total : 0;

  const lateCount = hasSnapshots && sprint.endDate
    ? rootSnapshots.filter((s) => {
        if (!s.completed || s.returnedToBacklog || !s.completedAt) return false;
        return new Date(s.completedAt) > new Date(sprint.endDate!);
      }).length
    : 0;

  const health = isCompleted ? getHealth(donePct) : ('acceptable' as HealthLevel);
  const hConf = HEALTH_CONFIG[health];

  const startDate = sprint.startDate ? new Date(sprint.startDate) : null;
  const endDate = sprint.endDate ? new Date(sprint.endDate) : null;
  const durationDays = startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000) : null;
  const estimatedCount = hasSnapshots
    ? rootSnapshots.filter((s) => s.storyPoints != null && s.storyPoints > 0).length
    : rootTasks.filter((t) => t.storyPoints != null && t.storyPoints > 0).length;
  const avgSPPerTask = estimatedCount > 0 ? Math.round((totalSP / estimatedCount) * 10) / 10 : 0;

  const formatDate = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const formatDateShort = (d: string | null | undefined) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };

  const allStatuses = hasSnapshots
    ? [...new Set(rootSnapshots.map((s) => s.statusAtEnd))]
    : [...new Set(rootTasks.map((t) => t.status))];
  const pieData = allStatuses
    .map((s) => ({
      name: getStatusLabel(s, columns, t),
      value: hasSnapshots
        ? rootSnapshots.filter((snap) => snap.statusAtEnd === s).length
        : rootTasks.filter((task) => task.status === s).length,
      color: getStatusColor(s, columns),
    }))
    .filter((d) => d.value > 0);

  const priorities: TaskPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const priorityData = priorities.map((p) => ({
    name: t(`tasks.priority.${p}`),
    total: hasSnapshots
      ? rootSnapshots.filter((s) => s.priority === p).length
      : rootTasks.filter((t) => t.priority === p).length,
    done: hasSnapshots
      ? rootSnapshots.filter((s) => s.priority === p && s.completed).length
      : rootTasks.filter((t) => t.priority === p && t.status === 'DONE').length,
    color: PRIORITY_COLOR[p],
  })).filter((d) => d.total > 0);

  const burndownResult = buildBurndown(sprint, rootTasks);
  const burndown = burndownResult?.points ?? null;
  const burndownUsesTaskCount = burndownResult?.useTaskCount ?? false;

  // Flat task list for paginated table
  const REPORT_PAGE_SIZE = 10;

  // Build unified list items from snapshots or tasks
  type ReportItem = {
    id: string;
    taskId?: string | null;
    title: string;
    description?: string | null;
    priority: TaskPriority;
    storyPoints?: number | null;
    status: string;
    type?: TaskType;
    completed: boolean;
    returnedToBacklog: boolean;
    completedAt?: string | null;
    isSnapshot: boolean;
    parentTaskId?: string | null;
    subtaskCount: number;
    original: SprintTaskSnapshot | Task;
  };

  const allReportItems: ReportItem[] = hasSnapshots
    ? snapshots.map((s) => ({
        id: s.id,
        taskId: s.taskId,
        title: s.title,
        description: s.description,
        priority: s.priority,
        storyPoints: s.storyPoints,
        status: s.statusAtEnd,
        type: (s as SprintTaskSnapshot & { type?: TaskType }).type,
        completed: s.completed,
        returnedToBacklog: s.returnedToBacklog,
        completedAt: s.completedAt,
        isSnapshot: true,
        parentTaskId: s.parentTaskId,
        subtaskCount: 0,
        original: s,
      }))
    : tasks.map((t) => ({
        id: t.id,
        taskId: t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        storyPoints: t.storyPoints,
        status: t.status,
        type: t.type,
        completed: t.status === 'DONE',
        returnedToBacklog: false,
        completedAt: null,
        isSnapshot: false,
        parentTaskId: t.parentId,
        subtaskCount: t.subtaskCount,
        original: t,
      }));

  // Count inline subtasks per story by parentTaskId (works for both snapshots and active tasks)
  const childCounts: Record<string, number> = {};
  allReportItems.forEach((item) => {
    if (item.parentTaskId) {
      childCounts[item.parentTaskId] = (childCounts[item.parentTaskId] ?? 0) + 1;
    }
  });
  allReportItems.forEach((item) => {
    if (item.taskId && childCounts[item.taskId]) {
      item.subtaskCount = Math.max(item.subtaskCount, childCounts[item.taskId]);
    }
  });

  // Build a set of taskIds present in the list, to know which parents exist
  const presentTaskIds = new Set(allReportItems.map((item) => item.taskId).filter(Boolean));

  // Only treat as a nested subtask if its parent is also in the list
  const reportItems = allReportItems.filter(
    (item) => !item.parentTaskId || !presentTaskIds.has(item.parentTaskId),
  );
  const snapshotSubtasks: Record<string, ReportItem[]> = {};
  allReportItems
    .filter((item) => item.parentTaskId && presentTaskIds.has(item.parentTaskId))
    .forEach((item) => {
      const key = item.parentTaskId!;
      if (!snapshotSubtasks[key]) snapshotSubtasks[key] = [];
      snapshotSubtasks[key].push(item);
    });

  // Sort: done/returned last, then by status
  const statusOrder: Record<string, number> = { TODO: 0, IN_PROGRESS: 1, IN_REVIEW: 2, DONE: 3 };
  const sortedItems = [...reportItems].sort((a, b) => {
    if (a.returnedToBacklog !== b.returnedToBacklog) return a.returnedToBacklog ? 1 : -1;
    return (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
  });

  const totalReportPages = Math.max(1, Math.ceil(sortedItems.length / REPORT_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalReportPages);
  const paginatedItems = sortedItems.slice((safePage - 1) * REPORT_PAGE_SIZE, safePage * REPORT_PAGE_SIZE);

  const toggleReportStory = async (item: ReportItem) => {
    const key = item.taskId ?? item.id;
    const next = new Set(expandedStories);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
      // For active sprints, fetch subtasks if not already available
      const hasInlineSubtasks = (snapshotSubtasks[key] ?? []).length > 0;
      if (!item.isSnapshot && !hasInlineSubtasks && !storySubtasks[key]) {
        try {
          const subs = await tasksApi.getSubtasks(key);
          setStorySubtasks((prev) => ({ ...prev, [key]: subs }));
        } catch { /* ignore */ }
      }
    }
    setExpandedStories(next);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>
      <style>{`
        .report-stats-grid{display:grid;gap:12px;grid-template-columns:1fr 1fr}
        .report-charts-grid{display:grid;gap:16px;grid-template-columns:1fr}
        .report-task-header{display:grid;grid-template-columns:44px 1fr 100px 100px 80px;gap:16px;align-items:center}
        @media(min-width:900px){
          .report-stats-grid{grid-template-columns:repeat(4,1fr)}
          .report-charts-grid{grid-template-columns:1fr 1fr}
        }
      `}</style>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Back button (same style as SprintBacklogPage) */}
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
                <BarChart3 size={22} strokeWidth={2} style={{ color: 'var(--accent)' }} />
                {t('projects.sprints.report.pageTitle')}: {sprint.name}
              </span>
            </PageTitle>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: isCompleted ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--text-faint)',
              background: isCompleted ? 'var(--success-bg, rgba(34,197,94,0.1))' : isActive ? 'var(--accent-muted)' : 'var(--bg-hover)',
              padding: '4px 10px', borderRadius: 'var(--radius-sm)',
            }}>
              {t(`projects.sprints.status.${sprint.status}`)}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--text-faint)' }}>
            {t('projects.sprints.report.generatedAt')}{' '}
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </p>
        </div>

        {sprint.startDate && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', flexShrink: 0,
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

      {/* Sprint Goal */}
      {sprint.goal && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          background: 'var(--accent-muted)', border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px',
        }}>
          <Zap size={14} strokeWidth={2} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t('projects.sprints.planning.goal')}
            </span>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text)' }}>
              {sprint.goal}
            </p>
          </div>
        </div>
      )}

      {/* Health banner */}
      <div style={{
        background: hConf.bg, border: `1px solid ${hConf.accent}33`,
        borderRadius: 'var(--radius-lg)', padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <CircularProgress pct={donePct} color={hConf.accent} size={64} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(90deg)' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: hConf.accent, fontFamily: 'var(--font-mono)' }}>
              {Math.round(donePct * 100)}%
            </span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: hConf.textColor }}>
            {isActive
              ? t('projects.sprints.report.inProgress')
              : t(`projects.sprints.report.health.${health}`)}
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: hConf.textColor, opacity: 0.8 }}>
            {t('projects.sprints.report.healthSummary', { done, total, doneSP, totalSP })}
            {isCompleted && incomplete > 0 && ` · ${incomplete} ${t('projects.sprints.report.returnedToBacklog')}`}
            {isCompleted && lateCount > 0 && ` · ${t('projects.sprints.report.lateCount', { count: lateCount })}`}
          </p>
        </div>
      </div>

      {/* Stat cards — 4 columns */}
      <div className="report-stats-grid">
        {/* Tasks done */}
        <div style={{ ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: `3px solid ${hConf.accent}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {t('projects.sprints.report.tasksDone')}
            </p>
            <Target size={15} strokeWidth={1.75} style={{ color: hConf.accent }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: hConf.accent, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
              <CountUp value={done} />
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/{total}</span>
          </div>
          {total > 0 && (
            <div style={{ width: '100%', height: 5, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: 5, borderRadius: 3, background: hConf.accent, width: `${Math.round(donePct * 100)}%`, transition: 'width 1s ease' }} />
            </div>
          )}
        </div>

        {/* Story points */}
        <div style={{ ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '3px solid var(--accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {t('projects.sprints.report.storyPoints')}
            </p>
            <TrendingUp size={15} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
              <CountUp value={doneSP} />
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/{totalSP} pts</span>
          </div>
          {totalSP > 0 && (
            <div style={{ width: '100%', height: 5, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: 5, borderRadius: 3, background: 'var(--accent)', width: `${Math.round((doneSP / totalSP) * 100)}%`, transition: 'width 1s ease' }} />
            </div>
          )}
        </div>

        {/* Duration */}
        <div style={{ ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '3px solid #D97706' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {t('projects.sprints.report.duration')}
            </p>
            <Calendar size={15} strokeWidth={1.75} style={{ color: '#D97706' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#D97706', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
              {durationDays != null ? <CountUp value={durationDays} /> : '—'}
            </span>
            {durationDays != null && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('projects.sprints.report.days')}</span>}
          </div>
          {startDate && endDate && (
            <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {formatDate(startDate)} → {formatDate(endDate)}
            </p>
          )}
        </div>

        {/* Avg SP per task */}
        <div style={{ ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '3px solid #16A34A' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {t('projects.sprints.report.avgSPPerTask')}
            </p>
            <Zap size={15} strokeWidth={1.75} style={{ color: '#16A34A' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#16A34A', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
              {avgSPPerTask > 0 ? avgSPPerTask : '—'}
            </span>
            {avgSPPerTask > 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>pts</span>}
          </div>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>
            {t('projects.sprints.report.avgSPPerTaskDesc', { count: estimatedCount })}
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="report-charts-grid">
        {/* Burndown */}
        {burndown && burndown.length > 1 ? (
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: burndownUsesTaskCount ? 6 : 14 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                {t('projects.sprints.report.burndown')}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: 'var(--text-faint)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 0, borderTop: '2px dashed var(--text-faint)', display: 'inline-block' }} />
                  {t('projects.sprints.report.ideal')}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 2, background: 'var(--accent)', borderRadius: 1, display: 'inline-block' }} />
                  {t('projects.sprints.report.actual')}
                </span>
              </div>
            </div>
            {burndownUsesTaskCount && (
              <p style={{ margin: '0 0 10px', fontSize: 10, color: 'var(--text-faint)', fontStyle: 'italic' }}>
                {t('projects.sprints.report.burndownByTasks')}
              </p>
            )}
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={burndown} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94A3B8' } as object} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: '#94A3B8' } as object} allowDecimals={false} />
                <Tooltip content={<BurndownTooltip unit={burndownUsesTaskCount ? t('projects.sprints.report.tasks') : 'pts'} />} />
                <Line type="monotone" dataKey="ideal" name={t('projects.sprints.report.ideal')} stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                <Line type="monotone" dataKey="actual" name={t('projects.sprints.report.actual')} stroke="#2563EB" strokeWidth={2} dot={{ r: 2.5, fill: '#2563EB' } as object} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 220, gap: 10 }}>
            <LineChartIcon size={28} strokeWidth={1.25} style={{ color: 'var(--text-faint)' }} />
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)' }}>{t('projects.sprints.report.burndownNoData')}</p>
          </div>
        )}

        {/* Status distribution donut */}
        <div style={{ ...card, padding: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {t('projects.sprints.report.distribution')}
          </h3>
          {total > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={2} dataKey="value" label={false}>
                    {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    <text x={90} y={90} textAnchor="middle" dominantBaseline="central" style={{ fill: '#1E293B', fontWeight: 700, fontSize: 18 }}>
                      {total}
                    </text>
                  </Pie>
                  <Tooltip
                    formatter={(value) => {
                      const v = typeof value === 'number' ? value : 0;
                      return [`${v} (${Math.round((v / total) * 100)}%)`];
                    }}
                    contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)' } as object}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pieData.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{d.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{d.value}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', minWidth: 32, textAlign: 'right' }}>
                      {Math.round((d.value / total) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '40px 0' }}>
              {t('projects.sprints.report.noTasks')}
            </p>
          )}
        </div>
      </div>

      {/* Priority bar chart */}
      {priorityData.length > 0 && (
        <div style={{ ...card, padding: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {t('projects.sprints.report.byPriority')}
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={priorityData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: '#94A3B8' } as object} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748B' } as object} width={60} />
              <Tooltip
                formatter={(value, name) => {
                  const v = typeof value === 'number' ? value : 0;
                  const label = typeof name === 'string' ? name : String(name ?? '');
                  return [v, label];
                }}
                contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)' } as object}
              />
              <Legend iconSize={7} iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
              <Bar dataKey="done" name={t('tasks.status.DONE')} radius={[0, 3, 3, 0]} fill="#16A34A" />
              <Bar dataKey="total" name={t('projects.sprints.report.totalTasks')} radius={[0, 3, 3, 0]} fill="#94A3B8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Task list — flat paginated table */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              {t('projects.sprints.report.taskList')}
            </h3>
            <span style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              background: 'var(--bg-hover)',
              borderRadius: 'var(--radius-pill)',
              padding: '2px 10px',
            }}>
              {sortedItems.length}
            </span>
          </div>
        </div>

        {total === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '40px 0' }}>
            {t('projects.sprints.report.noTasks')}
          </p>
        ) : (
          <>
            {/* Table header */}
            <div
              className="report-task-header"
              style={{
                padding: '10px 20px',
                borderBottom: '1px solid var(--border)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-faint)',
              }}
            >
              <span>{t('projects.backlog.colType')}</span>
              <span>{t('projects.backlog.colSummary')}</span>
              <span style={{ textAlign: 'center' }}>{t('projects.backlog.colPriority')}</span>
              <span style={{ textAlign: 'center' }}>{t('projects.backlog.colEstimate')}</span>
              <span style={{ textAlign: 'center' }}>{t('projects.backlog.colStatus')}</span>
            </div>

            {/* Rows */}
            {paginatedItems.map((item) => {
              const typeConf = TYPE_ICON[item.type ?? 'TASK'];
              const TypeIcon = typeConf?.icon ?? CheckSquare;
              const typeColor = typeConf?.color ?? '#2563EB';
              const isStory = item.subtaskCount > 0;
              const storyKey = item.taskId ?? item.id;
              const isExpanded = expandedStories.has(storyKey);

              // Status rendering helper
              const renderStatus = (ri: ReportItem) => {
                if (ri.returnedToBacklog) {
                  return (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 10, fontWeight: 700,
                      color: '#D97706', background: 'rgba(217,119,6,0.08)',
                      border: '1px solid rgba(217,119,6,0.3)',
                      borderRadius: 'var(--radius-sm)', padding: '2px 8px',
                    }}>
                      <Archive size={10} strokeWidth={2.5} />
                      {t('projects.sprints.report.backlogBadge')}
                    </span>
                  );
                }
                if (ri.completed) {
                  return (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 10, fontWeight: 700,
                      color: '#16A34A', background: 'rgba(22,163,74,0.08)',
                      border: '1px solid rgba(22,163,74,0.3)',
                      borderRadius: 'var(--radius-sm)', padding: '2px 8px',
                    }}>
                      <CheckCircle2 size={10} strokeWidth={2.5} />
                      {t('tasks.status.DONE')}
                    </span>
                  );
                }
                const sColor = getStatusColor(ri.status, columns);
                return (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 10, fontWeight: 700,
                    color: sColor, background: `${sColor}12`,
                    border: `1px solid ${sColor}30`,
                    borderRadius: 'var(--radius-sm)', padding: '2px 8px',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: sColor }} />
                    {getStatusLabel(ri.status, columns, t)}
                  </span>
                );
              };

              // Get subtask items for this story
              const getSubItems = (): ReportItem[] | Task[] => {
                // snapshotSubtasks has inline children (from snapshots or sprint task list)
                const inlineSubs = snapshotSubtasks[storyKey];
                if (inlineSubs && inlineSubs.length > 0) return inlineSubs;
                // Otherwise fetch from API (active sprints)
                return storySubtasks[storyKey] ?? [];
              };

              return (
                <div key={item.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (item.isSnapshot) setSelectedSnapshot(item.original as SprintTaskSnapshot);
                      else setSelectedTask(item.original as Task);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (item.isSnapshot) setSelectedSnapshot(item.original as SprintTaskSnapshot);
                        else setSelectedTask(item.original as Task);
                      }
                    }}
                    className="report-task-header"
                    style={{
                      padding: '14px 20px',
                      borderBottom: '1px solid var(--border)',
                      borderLeft: `3px solid ${typeColor}`,
                      cursor: 'pointer',
                      transition: 'background 150ms',
                      background: 'transparent',
                      opacity: item.returnedToBacklog ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Type icon + expand toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      {isStory ? (
                        <span
                          onClick={(e) => { e.stopPropagation(); toggleReportStory(item); }}
                          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, color: 'var(--text-muted)' }}
                        >
                          {isExpanded
                            ? <ChevronDown size={13} strokeWidth={2} />
                            : <ChevronRight size={13} strokeWidth={2} />
                          }
                        </span>
                      ) : (
                        <span style={{ width: 13, flexShrink: 0 }} />
                      )}
                      <TypeIcon size={15} strokeWidth={2} style={{ color: typeColor }} />
                    </div>

                    {/* Title + badges */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p style={{
                          margin: 0, fontSize: 13, fontWeight: 500,
                          color: item.completed ? 'var(--text-muted)' : 'var(--text)',
                          textDecoration: item.completed && !item.returnedToBacklog ? 'line-through' : 'none',
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        }}>
                          {item.title}
                        </p>
                        {isStory && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)',
                            color: 'var(--text-muted)', flexShrink: 0,
                          }}>
                            {item.subtaskCount}
                          </span>
                        )}
                        {item.completed && !item.returnedToBacklog && item.completedAt && sprint.endDate && new Date(item.completedAt) > new Date(sprint.endDate) && (
                          <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 600, color: '#DC2626', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 'var(--radius-sm)', padding: '0 5px', whiteSpace: 'nowrap' }}>
                            {t('projects.sprints.report.lateBadge')}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-faint)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Priority */}
                    <div style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        color: PRIORITY_COLOR[item.priority],
                        background: `${PRIORITY_COLOR[item.priority]}12`,
                        borderRadius: 'var(--radius-pill)', padding: '3px 10px',
                      }}>
                        {t(`tasks.priority.${item.priority}`)}
                      </span>
                    </div>

                    {/* Estimate */}
                    <div style={{ textAlign: 'center' }}>
                      {item.storyPoints != null ? (
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                          {item.storyPoints} pts
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>—</span>
                      )}
                    </div>

                    {/* Status */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {renderStatus(item)}
                    </div>
                  </div>

                  {/* Expanded subtasks */}
                  {isStory && isExpanded && (() => {
                    const subs = getSubItems();
                    return subs.map((sub) => {
                      // Normalize: sub can be ReportItem (snapshot) or Task (active)
                      const isSubSnapshot = 'isSnapshot' in sub;
                      const subItem: ReportItem = isSubSnapshot
                        ? sub as ReportItem
                        : {
                            id: (sub as Task).id,
                            taskId: (sub as Task).id,
                            title: (sub as Task).title,
                            description: (sub as Task).description,
                            priority: (sub as Task).priority,
                            storyPoints: (sub as Task).storyPoints,
                            status: (sub as Task).status,
                            type: (sub as Task).type,
                            completed: (sub as Task).status === 'DONE',
                            returnedToBacklog: false,
                            completedAt: null,
                            isSnapshot: false,
                            subtaskCount: 0,
                            original: sub as Task,
                          };
                      return (
                        <div
                          key={subItem.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (subItem.isSnapshot) {
                              const snap = subItem.original as SprintTaskSnapshot;
                              setSubtaskModalTask({
                                id: snap.taskId ?? snap.id,
                                projectId: projectId!,
                                title: snap.title,
                                description: snap.description ?? null,
                                status: snap.statusAtEnd,
                                priority: snap.priority,
                                type: snap.type ?? 'TASK',
                                completedAt: snap.completedAt ?? null,
                                ready: false,
                                position: 0,
                                subtaskCount: 0,
                                completedSubtaskCount: 0,
                                reporterId: '',
                                createdAt: '',
                                updatedAt: '',
                              } as Task);
                            } else {
                              setSubtaskModalTask(subItem.original as Task);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            if (subItem.isSnapshot) {
                              const snap = subItem.original as SprintTaskSnapshot;
                              setSubtaskModalTask({
                                id: snap.taskId ?? snap.id,
                                projectId: projectId!,
                                title: snap.title,
                                description: snap.description ?? null,
                                status: snap.statusAtEnd,
                                priority: snap.priority,
                                type: snap.type ?? 'TASK',
                                completedAt: snap.completedAt ?? null,
                                ready: false,
                                position: 0,
                                subtaskCount: 0,
                                completedSubtaskCount: 0,
                                reporterId: '',
                                createdAt: '',
                                updatedAt: '',
                              } as Task);
                            } else {
                              setSubtaskModalTask(subItem.original as Task);
                            }
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '9px 20px 9px 60px',
                            borderBottom: '1px solid var(--border)',
                            background: 'var(--bg)',
                            cursor: 'pointer',
                            transition: 'background 150ms',
                            opacity: subItem.returnedToBacklog ? 0.7 : 1,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                        >
                          {/* Checkbox indicator */}
                          <span style={{
                            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                            border: subItem.completed ? 'none' : '2px solid #CBD5E1',
                            background: subItem.completed ? '#3B82F6' : '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {subItem.completed && (
                              <svg width="10" height="10" viewBox="0 0 11 11" fill="none">
                                <path d="M2 5.5L4.5 8L9 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>

                          {/* Title */}
                          <span style={{
                            flex: 1, fontSize: 12, fontWeight: 400, minWidth: 0,
                            color: subItem.completed ? 'var(--text-muted)' : 'var(--text)',
                            textDecoration: subItem.completed && !subItem.returnedToBacklog ? 'line-through' : 'none',
                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                          }}>
                            {subItem.title}
                          </span>

                          {/* Status — 80px to match parent grid column */}
                          <div style={{ width: 80, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                            {renderStatus(subItem)}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              );
            })}

            {/* Pagination footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px',
            }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {t('projects.backlog.page', { current: safePage, total: totalReportPages })}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 30, height: 30,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: safePage <= 1 ? 'var(--bg)' : 'var(--bg-elevated)',
                    color: safePage <= 1 ? 'var(--text-faint)' : 'var(--text)',
                    cursor: safePage <= 1 ? 'default' : 'pointer',
                  }}
                >
                  <ChevronLeft size={15} strokeWidth={2} />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalReportPages, p + 1))}
                  disabled={safePage >= totalReportPages}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 30, height: 30,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: safePage >= totalReportPages ? 'var(--bg)' : 'var(--bg-elevated)',
                    color: safePage >= totalReportPages ? 'var(--text-faint)' : 'var(--text)',
                    cursor: safePage >= totalReportPages ? 'default' : 'pointer',
                  }}
                >
                  <ChevronRight size={15} strokeWidth={2} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Retrospective */}
      {isCompleted && (() => {
        const retro = parseRetrospective(sprint.reviewNotes);

        if (retro && typeof retro === 'object') {
          // Structured retrospective
          const techniqueColors: Record<string, Record<string, string>> = {
            START_STOP_CONTINUE: { start: '#22C55E', stop: '#EF4444', continue: '#3B82F6' },
            FOUR_LS: { loved: '#EC4899', learned: '#3B82F6', lacked: '#F59E0B', longedFor: '#8B5CF6' },
            MAD_SAD_GLAD: { mad: '#EF4444', sad: '#F59E0B', glad: '#22C55E' },
          };
          const colors = techniqueColors[retro.technique] ?? {};
          const fields = Object.keys(colors);

          return (
            <div style={{ ...card, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                  {t('projects.sprints.retrospective.title')} — {t(`projects.sprints.retrospective.techniques.${retro.technique}.name`)}
                </h3>
                {canManageSprint && (
                  <button
                    onClick={() => setShowRetroModal(true)}
                    style={{
                      fontSize: 11, fontWeight: 500, color: 'var(--text-muted)',
                      background: 'none', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', padding: '4px 10px', cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                  >
                    {t('projects.sprints.retrospective.editButton')}
                  </button>
                )}
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${fields.length}, 1fr)`,
                gap: 12,
              }}>
                {fields.map((field) => (
                  <div
                    key={field}
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      borderTop: `3px solid ${colors[field]}`,
                      padding: '14px 16px',
                    }}
                  >
                    <h4 style={{
                      margin: '0 0 8px', fontSize: 12, fontWeight: 600,
                      color: colors[field],
                    }}>
                      {t(`projects.sprints.retrospective.techniques.${retro.technique}.${field}`)}
                    </h4>
                    <p style={{
                      margin: 0, fontSize: 13, color: 'var(--text-muted)',
                      lineHeight: 1.6, whiteSpace: 'pre-wrap',
                    }}>
                      {retro.answers[field] || '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (typeof retro === 'string') {
          // Plain text (backward compatibility)
          return (
            <div style={{ ...card, padding: 20 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                {t('projects.sprints.report.retrospective')}
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {retro}
              </p>
            </div>
          );
        }

        // No retrospective — show CTA if user has permission
        if (canManageSprint) {
          return (
            <div style={{ ...card, padding: 20, textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                {t('projects.sprints.retrospective.noRetro')}
              </p>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-faint)' }}>
                {t('projects.sprints.retrospective.addRetro')}
              </p>
              <button
                onClick={() => setShowRetroModal(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', fontSize: 13, fontWeight: 600,
                  background: 'var(--accent)', color: 'var(--accent-fg)',
                  border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
              >
                {t('projects.sprints.retrospective.createButton')}
              </button>
            </div>
          );
        }

        return null;
      })()}

      {selectedSnapshot && (
        <SnapshotModal
          snapshot={selectedSnapshot}
          onClose={() => setSelectedSnapshot(null)}
          columns={columns}
        />
      )}

      {selectedTask && projectId && (
        <TaskModal
          task={selectedTask}
          projectId={projectId}
          columns={columns}
          readOnly
          onClose={() => setSelectedTask(null)}
        />
      )}

      {subtaskModalTask && (
        <SubtaskModal
          subtask={subtaskModalTask}
          columns={columns}
          readOnly
          onClose={() => setSubtaskModalTask(null)}
        />
      )}

      {showRetroModal && sprint && (
        <RetrospectiveModal
          sprint={sprint}
          onClose={() => setShowRetroModal(false)}
          onSaved={(updated) => {
            setSprint((prev) => prev ? { ...prev, ...updated } : updated);
            setShowRetroModal(false);
          }}
        />
      )}
    </div>
  );
}