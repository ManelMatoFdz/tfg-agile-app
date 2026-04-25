import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import type { Sprint, Task, TaskPriority, TaskStatus } from '../../../types';
import { sprintsApi } from '../../../api/sprints';
import Alert from '../../../components/ui/Alert';

// ── Colours ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<TaskStatus, string> = {
  DONE: '#10b981',
  IN_PROGRESS: '#3b82f6',
  IN_REVIEW: '#f59e0b',
  TODO: '#9ca3af',
};

const PRIORITY_COLORS: Record<TaskPriority, { bar: string; badge: string }> = {
  CRITICAL: { bar: '#ef4444', badge: 'bg-red-100 text-red-600' },
  HIGH:     { bar: '#f59e0b', badge: 'bg-amber-100 text-amber-600' },
  MEDIUM:   { bar: '#3b82f6', badge: 'bg-blue-100 text-blue-600' },
  LOW:      { bar: '#9ca3af', badge: 'bg-gray-100 text-gray-500' },
};

// ── Health score ─────────────────────────────────────────────────────────────

type HealthLevel = 'excellent' | 'good' | 'acceptable' | 'poor';

function getHealth(donePct: number): HealthLevel {
  if (donePct >= 0.8) return 'excellent';
  if (donePct >= 0.6) return 'good';
  if (donePct >= 0.4) return 'acceptable';
  return 'poor';
}

const HEALTH_CONFIG: Record<HealthLevel, { bg: string; text: string; accent: string; icon: string }> = {
  excellent: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', accent: '#10b981', icon: '🏆' },
  good:      { bg: 'bg-blue-50 border-blue-200',       text: 'text-blue-800',    accent: '#3b82f6', icon: '👍' },
  acceptable:{ bg: 'bg-amber-50 border-amber-200',     text: 'text-amber-800',   accent: '#f59e0b', icon: '⚠️' },
  poor:      { bg: 'bg-red-50 border-red-200',         text: 'text-red-800',     accent: '#ef4444', icon: '📉' },
};

// ── Circular progress ring ────────────────────────────────────────────────────

function CircularProgress({ pct, color, size = 88 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  const [animated, setAnimated] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setAnimated(true)); }, []);
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={animated ? circ * (1 - pct) : circ}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  );
}

// ── Animated counter ─────────────────────────────────────────────────────────

function AnimatedNumber({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (target === 0) return;
    let current = 0;
    const step = Math.ceil(target / 30);
    ref.current = setInterval(() => {
      current = Math.min(current + step, target);
      setVal(current);
      if (current >= target && ref.current) clearInterval(ref.current);
    }, 30);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [target]);
  return <>{val}</>;
}

// ── Burndown data ─────────────────────────────────────────────────────────────

interface BurndownPoint {
  label: string;
  ideal: number;
  actual: number | null;
}

function buildBurndown(sprint: Sprint, tasks: Task[]): BurndownPoint[] | null {
  if (!sprint.startDate || !sprint.endDate) return null;

  const start = new Date(sprint.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(sprint.endDate);
  end.setHours(23, 59, 59, 999);
  const today = new Date();

  const totalSP = tasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  if (totalSP === 0) return null;

  const doneTasks = tasks.filter((t) => t.status === 'DONE');
  const totalMs = end.getTime() - start.getTime();
  const totalDays = Math.max(Math.ceil(totalMs / 86_400_000), 1);

  const points: BurndownPoint[] = [];

  for (let i = 0; i <= totalDays; i++) {
    const day = new Date(start.getTime() + i * 86_400_000);
    const ideal = Math.round(totalSP * (1 - i / totalDays));

    const completedSP = doneTasks
      .filter((t) => new Date(t.updatedAt) <= day)
      .reduce((s, t) => s + (t.storyPoints ?? 0), 0);

    const actual = day <= today ? totalSP - completedSP : null;

    points.push({
      label: day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      ideal,
      actual,
    });
  }

  return points;
}

// ── Custom tooltip for burndown ───────────────────────────────────────────────

function BurndownTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-strong px-3 py-2 text-xs space-y-1 shadow-lg">
      <p className="font-semibold text-gray-700">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium text-gray-800">{p.value} pts</span>
        </div>
      ))}
    </div>
  );
}

// ── Donut label ───────────────────────────────────────────────────────────────

function DonutLabel({ cx, cy, total }: { cx: number; cy: number; total: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="fill-gray-900 font-bold text-lg">
      {total}
    </text>
  );
}

// ── SprintReportPage ──────────────────────────────────────────────────────────

export default function SprintReportPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId, sprintId } = useParams<{
    workspaceId: string;
    projectId: string;
    sprintId: string;
  }>();

  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStatus, setExpandedStatus] = useState<TaskStatus | null>('DONE');

  useEffect(() => {
    if (!sprintId) return;
    Promise.all([sprintsApi.getSprint(sprintId), sprintsApi.getSprintTasks(sprintId)])
      .then(([s, t]) => { setSprint(s); setTasks(t); })
      .catch(() => setError(t('projects.sprints.report.loadError')))
      .finally(() => setLoading(false));
  }, [sprintId, t]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!sprint) return null;

  // ── Derived metrics ──────────────────────────────────────────────────────────

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'DONE').length;
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const inReview = tasks.filter((t) => t.status === 'IN_REVIEW').length;
  const todo = tasks.filter((t) => t.status === 'TODO').length;

  const totalSP = tasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const doneSP = tasks.filter((t) => t.status === 'DONE').reduce((s, t) => s + (t.storyPoints ?? 0), 0);

  const donePct = total > 0 ? done / total : 0;
  const health = getHealth(donePct);
  const hConf = HEALTH_CONFIG[health];

  const startDate = sprint.startDate ? new Date(sprint.startDate) : null;
  const endDate = sprint.endDate ? new Date(sprint.endDate) : null;
  const durationDays = startDate && endDate
    ? Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000)
    : null;

  const velocity = durationDays && durationDays > 0 ? (doneSP / durationDays).toFixed(1) : null;

  const formatDate = (d: Date) =>
    d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  // ── Chart data ───────────────────────────────────────────────────────────────

  const pieData = [
    { name: t('tasks.status.DONE'), value: done, color: STATUS_COLORS.DONE },
    { name: t('tasks.status.IN_REVIEW'), value: inReview, color: STATUS_COLORS.IN_REVIEW },
    { name: t('tasks.status.IN_PROGRESS'), value: inProgress, color: STATUS_COLORS.IN_PROGRESS },
    { name: t('tasks.status.TODO'), value: todo, color: STATUS_COLORS.TODO },
  ].filter((d) => d.value > 0);

  const priorities: TaskPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const priorityData = priorities.map((p) => ({
    name: t(`tasks.priority.${p}`),
    total: tasks.filter((t) => t.priority === p).length,
    done: tasks.filter((t) => t.priority === p && t.status === 'DONE').length,
    color: PRIORITY_COLORS[p].bar,
  })).filter((d) => d.total > 0);

  const burndown = buildBurndown(sprint, tasks);

  const statusGroups: { status: TaskStatus; tasks: Task[] }[] = [
    { status: 'IN_PROGRESS', tasks: tasks.filter((t) => t.status === 'IN_PROGRESS') },
    { status: 'IN_REVIEW',   tasks: tasks.filter((t) => t.status === 'IN_REVIEW') },
    { status: 'TODO',        tasks: tasks.filter((t) => t.status === 'TODO') },
    { status: 'DONE',        tasks: tasks.filter((t) => t.status === 'DONE') },
  ].filter((g) => g.tasks.length > 0);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-8">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* ── Back + header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            to={`/workspaces/${workspaceId}/projects/${projectId}/sprints`}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('projects.sprints.board.back')}
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{sprint.name}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              sprint.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700'
              : sprint.status === 'ACTIVE' ? 'bg-primary-100 text-primary-700'
              : 'bg-gray-100 text-gray-500'
            }`}>
              {t(`projects.sprints.status.${sprint.status}`)}
            </span>
          </div>
          {(startDate || endDate || sprint.goal) && (
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {startDate && endDate && (
                <span>{formatDate(startDate)} → {formatDate(endDate)}</span>
              )}
              {sprint.goal && <span className="italic">{sprint.goal}</span>}
            </div>
          )}
        </div>
        <div className="text-xs text-gray-400 text-right flex-shrink-0">
          {t('projects.sprints.report.generatedAt')}<br />
          <span className="font-medium text-gray-600">
            {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* ── Health banner ────────────────────────────────────────────────────── */}
      <div className={`border rounded-2xl px-5 py-4 flex items-center gap-4 ${hConf.bg}`}>
        <span className="text-3xl">{hConf.icon}</span>
        <div className="flex-1">
          <p className={`text-sm font-bold ${hConf.text}`}>
            {t(`projects.sprints.report.health.${health}`)}
          </p>
          <p className={`text-xs mt-0.5 ${hConf.text} opacity-75`}>
            {t('projects.sprints.report.healthSummary', {
              done,
              total,
              doneSP,
              totalSP,
            })}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className={`text-2xl font-extrabold ${hConf.text}`}>
            {Math.round(donePct * 100)}%
          </span>
          <p className={`text-xs ${hConf.text} opacity-70`}>{t('projects.sprints.report.completion')}</p>
        </div>
      </div>

      {/* ── Metric cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tasks done */}
        <div className="glass-card-strong p-4 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <CircularProgress pct={donePct} color={hConf.accent} />
            <div className="absolute inset-0 flex items-center justify-center rotate-90">
              <span className="text-xs font-bold text-gray-700">
                <AnimatedNumber target={done} />/{total}
              </span>
            </div>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">
              <AnimatedNumber target={done} />
              <span className="text-sm text-gray-400 font-normal">/{total}</span>
            </p>
            <p className="text-xs text-gray-400">{t('projects.sprints.report.tasksDone')}</p>
          </div>
        </div>

        {/* Story points */}
        <div className="glass-card-strong p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">{t('projects.sprints.report.storyPoints')}</p>
            <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-2xl font-extrabold text-gray-900">
            <AnimatedNumber target={doneSP} />
            <span className="text-sm font-normal text-gray-400">/{totalSP} pts</span>
          </p>
          {totalSP > 0 && (
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-primary-500 transition-all duration-1000"
                style={{ width: `${Math.round((doneSP / totalSP) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Duration */}
        <div className="glass-card-strong p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">{t('projects.sprints.report.duration')}</p>
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-2xl font-extrabold text-gray-900">
            {durationDays != null ? <><AnimatedNumber target={durationDays} /><span className="text-sm font-normal text-gray-400"> {t('projects.sprints.report.days')}</span></> : '—'}
          </p>
          {startDate && endDate && (
            <p className="text-xs text-gray-400 truncate">
              {formatDate(startDate)} → {formatDate(endDate)}
            </p>
          )}
        </div>

        {/* Velocity */}
        <div className="glass-card-strong p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">{t('projects.sprints.report.velocity')}</p>
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-2xl font-extrabold text-gray-900">
            {velocity ?? '—'}
            {velocity && <span className="text-sm font-normal text-gray-400"> pts/{t('projects.sprints.report.day')}</span>}
          </p>
          <p className="text-xs text-gray-400">{t('projects.sprints.report.velocityDesc')}</p>
        </div>
      </div>

      {/* ── Charts row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Burndown chart */}
        {burndown && burndown.length > 1 ? (
          <div className="glass-card-strong p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">{t('projects.sprints.report.burndown')}</h3>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-gray-300 rounded inline-block" style={{ borderTop: '2px dashed #d1d5db', height: 0 }} />
                  {t('projects.sprints.report.ideal')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-primary-500 rounded inline-block" />
                  {t('projects.sprints.report.actual')}
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={burndown} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip content={<BurndownTooltip />} />
                <Line
                  type="monotone"
                  dataKey="ideal"
                  name={t('projects.sprints.report.ideal')}
                  stroke="#d1d5db"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name={t('projects.sprints.report.actual')}
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#6366f1' }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="glass-card-strong p-5 flex flex-col items-center justify-center text-center min-h-[200px] gap-3">
            <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <p className="text-xs text-gray-400">{t('projects.sprints.report.burndownNoData')}</p>
          </div>
        )}

        {/* Donut — task distribution */}
        <div className="glass-card-strong p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('projects.sprints.report.distribution')}</h3>
          {total > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                    dataKey="value"
                    label={false}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                    <DonutLabel cx={80} cy={80} total={total} />
                  </Pie>
                  <Tooltip
                    formatter={(v: number, name: string) => [`${v} (${Math.round((v / total) * 100)}%)`, name]}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-gray-600 flex-1 truncate">{d.name}</span>
                    <span className="text-xs font-semibold text-gray-800">{d.value}</span>
                    <span className="text-xs text-gray-400 w-9 text-right">
                      {Math.round((d.value / total) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-10">{t('projects.sprints.report.noTasks')}</p>
          )}
        </div>
      </div>

      {/* ── Priority breakdown bar chart ─────────────────────────────────────── */}
      {priorityData.length > 0 && (
        <div className="glass-card-strong p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('projects.sprints.report.byPriority')}</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={priorityData}
              layout="vertical"
              margin={{ top: 0, right: 20, bottom: 0, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                width={60}
              />
              <Tooltip
                formatter={(v: number, name: string) => [v, name]}
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
              />
              <Legend
                iconSize={8}
                iconType="circle"
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              <Bar dataKey="done" name={t('tasks.status.DONE')} radius={[0, 4, 4, 0]} fill="#10b981" />
              <Bar dataKey="total" name={t('projects.sprints.report.totalTasks')} radius={[0, 4, 4, 0]} fill="#e5e7eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Task list ────────────────────────────────────────────────────────── */}
      <div className="glass-card-strong overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">{t('projects.sprints.report.taskList')}</h3>
        </div>

        {total === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">{t('projects.sprints.report.noTasks')}</p>
        ) : (
          <div>
            {statusGroups.map(({ status, tasks: groupTasks }) => {
              const isOpen = expandedStatus === status;
              return (
                <div key={status} className="border-b border-gray-50 last:border-b-0">
                  {/* Group header */}
                  <button
                    onClick={() => setExpandedStatus(isOpen ? null : status)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors cursor-pointer text-left"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: STATUS_COLORS[status] }}
                    />
                    <span className="text-xs font-semibold text-gray-700 flex-1">
                      {t(`tasks.status.${status}`)}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {groupTasks.length}
                    </span>
                    {totalSP > 0 && (
                      <span className="text-xs text-gray-400">
                        {groupTasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0)} pts
                      </span>
                    )}
                    <svg
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Task rows */}
                  {isOpen && (
                    <div className="divide-y divide-gray-50 bg-gray-50/30">
                      {groupTasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-3 px-5 py-2.5">
                          <span className={`flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority].badge}`}>
                            {t(`tasks.priority.${task.priority}`)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 truncate">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-gray-400 truncate">{task.description}</p>
                            )}
                          </div>
                          {task.storyPoints != null && (
                            <span className="flex-shrink-0 text-xs text-gray-400 font-medium">
                              {task.storyPoints} pts
                            </span>
                          )}
                          {status === 'DONE' && (
                            <svg className="flex-shrink-0 w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
