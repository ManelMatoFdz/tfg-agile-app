import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, CheckCircle2, TrendingUp, Calendar, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import type { Sprint, SprintTaskSnapshot, Task, TaskPriority } from '../../../types';
import { sprintsApi } from '../../../api/sprints';
import Alert from '../../../components/ui/Alert';
import SnapshotModal from '../../../components/sprints/SnapshotModal';
import PageTitle from '../../../components/motion/PageTitle';
import CountUp from '../../../components/motion/CountUp';

const STATUS_COLORS: Record<string, string> = {
  DONE:        'var(--success)',
  IN_PROGRESS: 'var(--ink-blue)',
  IN_REVIEW:   'var(--ochre)',
  TODO:        'var(--text-faint)',
};
const DEFAULT_STATUS_COLOR = 'var(--text-faint)';

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  CRITICAL: 'var(--danger)',
  HIGH:     'var(--ochre)',
  MEDIUM:   'var(--ink-blue)',
  LOW:      'var(--text-faint)',
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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={5} />
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

// ── Animated counter ──────────────────────────────────────────────────────────


// ── Burndown data ─────────────────────────────────────────────────────────────

interface BurndownPoint { label: string; ideal: number; actual: number | null; }

function buildBurndown(sprint: Sprint, tasks: Task[]): { points: BurndownPoint[]; useTaskCount: boolean } | null {
  if (!sprint.startDate || !sprint.endDate || tasks.length === 0) return null;
  const start = new Date(sprint.startDate); start.setHours(0, 0, 0, 0);
  const end = new Date(sprint.endDate); end.setHours(23, 59, 59, 999);
  const today = new Date();
  const totalSP = tasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  // Fall back to task count when no story points are assigned
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
  borderRadius: 'var(--radius-md)',
};

// ── SprintReportPage ──────────────────────────────────────────────────────────

export default function SprintReportPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId, sprintId } = useParams<{ workspaceId: string; projectId: string; sprintId: string }>();

  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [snapshots, setSnapshots] = useState<SprintTaskSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStatus, setExpandedStatus] = useState<string | null>('DONE');
  const [selectedSnapshot, setSelectedSnapshot] = useState<SprintTaskSnapshot | null>(null);

  useEffect(() => {
    if (!sprintId) return;
    Promise.all([sprintsApi.getSprint(sprintId), sprintsApi.getSprintTasks(sprintId)])
      .then(async ([s, taskList]) => {
        setSprint(s);
        setTasks(taskList);
        if (s.status === 'COMPLETED') {
          try {
            const snaps = await sprintsApi.getSprintSnapshots(sprintId);
            setSnapshots(snaps);
          } catch {
            // snapshots not critical — fall back to sprint aggregate counters
          }
        }
      })
      .catch(() => setError(t('projects.sprints.report.loadError')))
      .finally(() => setLoading(false));
  }, [sprintId, t]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );

  if (!sprint) return null;

  // ── Derived ───────────────────────────────────────────────────────────────

  const isCompleted = sprint.status === 'COMPLETED';
  const isActive = sprint.status === 'ACTIVE';

  // For completed sprints, use per-task snapshots when available, otherwise
  // fall back to the aggregate counters captured on the Sprint entity.
  const hasSnapshots = isCompleted && snapshots.length > 0;

  const total    = hasSnapshots ? snapshots.length
    : isCompleted ? (sprint.closedTotalTasks ?? tasks.length)
    : tasks.length;
  const done     = hasSnapshots ? snapshots.filter((s) => s.completed).length
    : isCompleted ? (sprint.closedDoneTasks ?? tasks.filter((t) => t.status === 'DONE').length)
    : tasks.filter((t) => t.status === 'DONE').length;
  const totalSP  = hasSnapshots ? snapshots.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0)
    : isCompleted ? (sprint.closedTotalStoryPoints ?? tasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0))
    : tasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const doneSP   = hasSnapshots ? snapshots.filter((s) => s.completed).reduce((sum, s) => sum + (s.storyPoints ?? 0), 0)
    : isCompleted ? (sprint.closedDoneStoryPoints ?? tasks.filter((t) => t.status === 'DONE').reduce((s, t) => s + (t.storyPoints ?? 0), 0))
    : tasks.filter((t) => t.status === 'DONE').reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const incomplete = hasSnapshots ? snapshots.filter((s) => s.returnedToBacklog).length
    : isCompleted ? (sprint.closedIncompleteTasks ?? 0)
    : 0;

  const inProgress = hasSnapshots
    ? snapshots.filter((s) => s.statusAtEnd === 'IN_PROGRESS').length
    : tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const inReview   = hasSnapshots
    ? snapshots.filter((s) => s.statusAtEnd === 'IN_REVIEW').length
    : tasks.filter((t) => t.status === 'IN_REVIEW').length;
  const todo       = hasSnapshots
    ? snapshots.filter((s) => s.statusAtEnd === 'TODO').length
    : tasks.filter((t) => t.status === 'TODO').length;

  const donePct = total > 0 ? done / total : 0;

  // Tasks completed after sprint.endDate (only meaningful when sprint is COMPLETED and has endDate)
  const lateCount = hasSnapshots && sprint.endDate
    ? snapshots.filter((s) => {
        if (!s.completed || s.returnedToBacklog || !s.completedAt) return false;
        return new Date(s.completedAt) > new Date(sprint.endDate!);
      }).length
    : 0;
  // Only show health for completed sprints — for active ones the % is misleading
  const health = isCompleted ? getHealth(donePct) : ('acceptable' as HealthLevel);
  const hConf = HEALTH_CONFIG[health];

  const startDate = sprint.startDate ? new Date(sprint.startDate) : null;
  const endDate = sprint.endDate ? new Date(sprint.endDate) : null;
  const durationDays = startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000) : null;
  // Velocity = story points completed per sprint (not per day)
  const velocity = doneSP > 0 ? doneSP : null;

  const formatDate = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  const pieData = [
    { name: t('tasks.status.DONE'), value: done, color: STATUS_COLORS.DONE },
    { name: t('tasks.status.IN_REVIEW'), value: inReview, color: STATUS_COLORS.IN_REVIEW },
    { name: t('tasks.status.IN_PROGRESS'), value: inProgress, color: STATUS_COLORS.IN_PROGRESS },
    { name: t('tasks.status.TODO'), value: todo, color: STATUS_COLORS.TODO },
  ].filter((d) => d.value > 0);

  const priorities: TaskPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const priorityData = priorities.map((p) => ({
    name: t(`tasks.priority.${p}`),
    total: hasSnapshots
      ? snapshots.filter((s) => s.priority === p).length
      : tasks.filter((t) => t.priority === p).length,
    done: hasSnapshots
      ? snapshots.filter((s) => s.priority === p && s.completed).length
      : tasks.filter((t) => t.priority === p && t.status === 'DONE').length,
    color: PRIORITY_COLOR[p],
  })).filter((d) => d.total > 0);

  const burndownResult = buildBurndown(sprint, tasks);
  const burndown = burndownResult?.points ?? null;
  const burndownUsesTaskCount = burndownResult?.useTaskCount ?? false;

  // For completed sprints with snapshots, show all tasks grouped by statusAtEnd
  const statusGroups = hasSnapshots
    ? (['IN_PROGRESS', 'IN_REVIEW', 'TODO', 'DONE'] as string[])
        .map((status) => ({
          status,
          snapshots: snapshots.filter((s) => s.statusAtEnd === status),
          tasks: [] as Task[],
        }))
        .filter((g) => g.snapshots.length > 0)
    : (['IN_PROGRESS', 'IN_REVIEW', 'TODO', 'DONE'] as string[])
        .map((status) => ({
          status,
          snapshots: [] as SprintTaskSnapshot[],
          tasks: tasks.filter((t) => t.status === status),
        }))
        .filter((g) => g.tasks.length > 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 32 }}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Back + header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Link
            to={`/workspaces/${workspaceId}/projects/${projectId}/sprints`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-faint)', textDecoration: 'none', transition: `color var(--duration)` }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
          >
            <ChevronLeft size={12} strokeWidth={2} />
            {t('projects.sprints.board.back')}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <PageTitle style={{ fontSize: 24 }}>
              {sprint.name}
            </PageTitle>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: sprint.status === 'COMPLETED' ? 'var(--success)' : sprint.status === 'ACTIVE' ? 'var(--accent)' : 'var(--text-faint)',
              fontFamily: 'var(--font-mono)',
            }}>
              {t(`projects.sprints.status.${sprint.status}`)}
            </span>
          </div>
          {(startDate || endDate || sprint.goal) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {startDate && endDate && (
                <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                  {formatDate(startDate)} → {formatDate(endDate)}
                </span>
              )}
              {sprint.goal && (
                <span style={{ fontSize: 11, color: 'var(--text-faint)', fontStyle: 'italic' }}>{sprint.goal}</span>
              )}
            </div>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-faint)', textAlign: 'right', flexShrink: 0 }}>
          {t('projects.sprints.report.generatedAt')}<br />
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Health banner */}
      <div style={{
        background: hConf.bg, border: `1px solid ${hConf.accent}33`,
        borderRadius: 'var(--radius-md)', padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: hConf.textColor }}>
            {isActive
              ? t('projects.sprints.report.inProgress')
              : t(`projects.sprints.report.health.${health}`)}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: hConf.textColor, opacity: 0.75 }}>
            {t('projects.sprints.report.healthSummary', { done, total, doneSP, totalSP })}
            {isCompleted && incomplete > 0 && ` · ${incomplete} ${t('projects.sprints.report.returnedToBacklog')}`}
            {isCompleted && lateCount > 0 && ` · ${t('projects.sprints.report.lateCount', { count: lateCount })}`}
          </p>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: hConf.accent, fontFamily: 'var(--font-mono)' }}>
            {Math.round(donePct * 100)}%
          </span>
          <p style={{ margin: '1px 0 0', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: hConf.textColor, opacity: 0.7 }}>
            {t('projects.sprints.report.completion')}
          </p>
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {/* Tasks done */}
        <div style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <CircularProgress pct={donePct} color={hConf.accent} size={72} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(90deg)' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {done}/{total}
              </span>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                <CountUp value={done} />
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>/{total}</span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)' }}>{t('projects.sprints.report.tasksDone')}</p>
          </div>
        </div>

        {/* Story points */}
        <div style={{ ...card, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)' }}>{t('projects.sprints.report.storyPoints')}</p>
            <TrendingUp size={14} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
              <CountUp value={doneSP} />
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>/{totalSP} pts</span>
          </div>
          {totalSP > 0 && (
            <div style={{ width: '100%', height: 3, background: 'var(--bg-hover)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: 3, borderRadius: 2, background: hConf.accent, width: `${Math.round((doneSP / totalSP) * 100)}%`, transition: 'width 1s ease' }} />
            </div>
          )}
        </div>

        {/* Duration */}
        <div style={{ ...card, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)' }}>{t('projects.sprints.report.duration')}</p>
            <Calendar size={14} strokeWidth={1.75} style={{ color: 'var(--ochre)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
              {durationDays != null ? <CountUp value={durationDays} /> : '—'}
            </span>
            {durationDays != null && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t('projects.sprints.report.days')}</span>}
          </div>
          {startDate && endDate && (
            <p style={{ margin: 0, fontSize: 10, color: 'var(--text-faint)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {formatDate(startDate)} → {formatDate(endDate)}
            </p>
          )}
        </div>

        {/* Velocity */}
        <div style={{ ...card, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)' }}>{t('projects.sprints.report.velocity')}</p>
            <BarChart3 size={14} strokeWidth={1.75} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
              {velocity ?? '—'}
            </span>
            {velocity && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>pts</span>}
          </div>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--text-faint)' }}>{t('projects.sprints.report.velocityDesc')}</p>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>

        {/* Burndown */}
        {burndown && burndown.length > 1 ? (
          <div style={{ ...card, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: burndownUsesTaskCount ? 6 : 14 }}>
              <h3 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
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
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={burndown} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-faint)' } as object} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-faint)' } as object} allowDecimals={false} />
                <Tooltip content={<BurndownTooltip unit={burndownUsesTaskCount ? t('projects.sprints.report.tasks') : 'pts'} />} />
                <Line type="monotone" dataKey="ideal" name={t('projects.sprints.report.ideal')} stroke="var(--text-faint)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                <Line type="monotone" dataKey="actual" name={t('projects.sprints.report.actual')} stroke="var(--accent)" strokeWidth={2} dot={{ r: 2.5, fill: 'var(--accent)' } as object} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 200, gap: 10 }}>
            <LineChartIcon size={28} strokeWidth={1.25} style={{ color: 'var(--text-faint)' }} />
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)' }}>{t('projects.sprints.report.burndownNoData')}</p>
          </div>
        )}

        {/* Donut */}
        <div style={{ ...card, padding: 18 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {t('projects.sprints.report.distribution')}
          </h3>
          {total > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={64} paddingAngle={2} dataKey="value" label={false}>
                    {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    <text x={70} y={70} textAnchor="middle" dominantBaseline="central" style={{ fill: 'var(--text)', fontWeight: 700, fontSize: 16 }}>
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {pieData.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{d.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{d.value}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', minWidth: 30, textAlign: 'right' }}>
                      {Math.round((d.value / total) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', padding: '40px 0' }}>
              {t('projects.sprints.report.noTasks')}
            </p>
          )}
        </div>
      </div>

      {/* Priority bar chart */}
      {priorityData.length > 0 && (
        <div style={{ ...card, padding: 18 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {t('projects.sprints.report.byPriority')}
          </h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={priorityData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--text-faint)' } as object} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' } as object} width={56} />
              <Tooltip
                formatter={(value, name) => {
                  const v = typeof value === 'number' ? value : 0;
                  const label = typeof name === 'string' ? name : String(name ?? '');
                  return [v, label];
                }}
                contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)' } as object}
              />
              <Legend iconSize={7} iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
              <Bar dataKey="done" name={t('tasks.status.DONE')} radius={[0, 3, 3, 0]} fill="var(--success)" />
              <Bar dataKey="total" name={t('projects.sprints.report.totalTasks')} radius={[0, 3, 3, 0]} fill="var(--bg-hover)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Task list */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {t('projects.sprints.report.taskList')}
          </h3>
        </div>

        {total === 0 ? (
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', padding: '32px 0' }}>
            {t('projects.sprints.report.noTasks')}
          </p>
        ) : (
          <div>
            {statusGroups.map(({ status, tasks: groupTasks, snapshots: groupSnaps }, gi) => {
              const isOpen = expandedStatus === status;
              const itemCount = hasSnapshots ? groupSnaps.length : groupTasks.length;
              const groupSP = hasSnapshots
                ? groupSnaps.reduce((s, snap) => s + (snap.storyPoints ?? 0), 0)
                : groupTasks.reduce((s, task) => s + (task.storyPoints ?? 0), 0);
              return (
                <div key={status} style={{ borderTop: gi > 0 ? '1px solid var(--border)' : 'none' }}>
                  <button
                    onClick={() => setExpandedStatus(isOpen ? null : status)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
                      textAlign: 'left', transition: `background var(--duration)`,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status] ?? DEFAULT_STATUS_COLOR, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', flex: 1 }}>
                      {t(`tasks.status.${status}`, { defaultValue: status.replace(/_/g, ' ') })}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 4px' }}>
                      {itemCount}
                    </span>
                    {totalSP > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                        {groupSP} pts
                      </span>
                    )}
                    <ChevronRight size={12} strokeWidth={2} style={{ color: 'var(--text-faint)', transition: `transform var(--duration)`, transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                  </button>

                  {isOpen && (
                    <div style={{ background: 'var(--bg-hover)' }}>
                      {hasSnapshots
                        ? groupSnaps.map((snap, idx) => (
                          <div
                            key={snap.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedSnapshot(snap)}
                            onKeyDown={(e) => e.key === 'Enter' && setSelectedSnapshot(snap)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '7px 16px',
                              borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                              opacity: snap.returnedToBacklog ? 0.7 : 1,
                              cursor: 'pointer',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[snap.priority] }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <p style={{ margin: 0, fontSize: 12, color: 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{snap.title}</p>
                                {snap.returnedToBacklog && (
                                  <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 600, color: 'var(--ochre)', background: 'var(--ochre-soft)', border: '1px solid var(--ochre)', borderRadius: 'var(--radius-sm)', padding: '0 4px', whiteSpace: 'nowrap' }}>
                                    {t('projects.sprints.report.backlogBadge')}
                                  </span>
                                )}
                                {snap.completed && !snap.returnedToBacklog && snap.completedAt && sprint.endDate && new Date(snap.completedAt) > new Date(sprint.endDate) && (
                                  <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 600, color: 'var(--danger)', background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '0 4px', whiteSpace: 'nowrap' }}>
                                    {t('projects.sprints.report.lateBadge')}
                                  </span>
                                )}
                              </div>
                              {snap.description && (
                                <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-faint)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{snap.description}</p>
                              )}
                            </div>
                            {snap.storyPoints != null && (
                              <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1px 5px' }}>
                                {snap.storyPoints}
                              </span>
                            )}
                            {snap.completed && (
                              <CheckCircle2 size={13} strokeWidth={2} style={{ flexShrink: 0, color: 'var(--success)' }} />
                            )}
                          </div>
                        ))
                        : groupTasks.map((task, idx) => (
                          <div key={task.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '7px 16px',
                            borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                          }}>
                            <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[task.priority] }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 12, color: 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{task.title}</p>
                              {task.description && (
                                <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-faint)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{task.description}</p>
                              )}
                            </div>
                            {task.storyPoints != null && (
                              <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1px 5px' }}>
                                {task.storyPoints}
                              </span>
                            )}
                            {status === 'DONE' && (
                              <CheckCircle2 size={13} strokeWidth={2} style={{ flexShrink: 0, color: 'var(--success)' }} />
                            )}
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Retrospective notes — only shown when completed and notes exist */}
      {isCompleted && sprint.reviewNotes && (
        <div style={{ ...card, padding: 18 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {t('projects.sprints.report.retrospective')}
          </h3>
          <p style={{
            margin: 0,
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}>
            {sprint.reviewNotes}
          </p>
        </div>
      )}

      {selectedSnapshot && (
        <SnapshotModal
          snapshot={selectedSnapshot}
          onClose={() => setSelectedSnapshot(null)}
        />
      )}
    </div>
  );
}