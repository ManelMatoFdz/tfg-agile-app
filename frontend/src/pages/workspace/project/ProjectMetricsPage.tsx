import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import type { ProjectMember, Sprint, Task, TaskPriority, TaskStatus } from '../../../types';
import { tasksApi } from '../../../api/tasks';
import { sprintsApi } from '../../../api/sprints';
import { projectsApi } from '../../../api/projects';
import { usersApi } from '../../../api/users';
import Alert from '../../../components/ui/Alert';

// ── Colours ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<TaskStatus, string> = {
  DONE: '#10b981',
  IN_PROGRESS: '#3b82f6',
  IN_REVIEW: '#f59e0b',
  TODO: '#9ca3af',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  MEDIUM: '#3b82f6',
  LOW: '#9ca3af',
};

// ── Animated counter ──────────────────────────────────────────────────────────

function AnimatedNumber({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
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

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color = '#6366f1', icon,
}: {
  label: string;
  value: number;
  sub?: string;
  color?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="glass-card-strong p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{label}</p>
        <span style={{ color }} className="opacity-70">{icon}</span>
      </div>
      <p className="text-2xl font-extrabold text-gray-900">
        <AnimatedNumber target={value} />
      </p>
      {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
    </div>
  );
}

// ── ProjectMetricsPage ────────────────────────────────────────────────────────

export default function ProjectMetricsPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      tasksApi.getByProject(projectId),
      sprintsApi.listSprints(projectId),
      projectsApi.getMembers(projectId),
    ])
      .then(([t, s, m]) => {
        setTasks(t);
        setSprints(s);
        setMembers(m.data);

        // Resolve user display names for member tasks breakdown
        const ids = [...new Set([...m.data.map((mm) => mm.userId)])];
        if (ids.length > 0) {
          usersApi.batch(ids)
            .then((res) => {
              const map: Record<string, string> = {};
              res.data.forEach((u) => { map[u.id] = u.fullName || u.username; });
              setUserNames(map);
            })
            .catch(() => {});
        }
      })
      .catch(() => setError(t('projects.metrics.loadError')))
      .finally(() => setLoading(false));
  }, [projectId, t]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Derived metrics ───────────────────────────────────────────────────────

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'DONE').length;
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const inReview = tasks.filter((t) => t.status === 'IN_REVIEW').length;
  const todo = tasks.filter((t) => t.status === 'TODO').length;

  const totalSP = tasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const doneSP = tasks.filter((t) => t.status === 'DONE').reduce((s, t) => s + (t.storyPoints ?? 0), 0);

  const backlogTasks = tasks.filter((t) => !t.sprintId);
  const sprintedTasks = tasks.filter((t) => !!t.sprintId);

  const completedSprints = sprints.filter((s) => s.status === 'COMPLETED').length;
  const activeSprint = sprints.find((s) => s.status === 'ACTIVE');

  const donePct = total > 0 ? Math.round((done / total) * 100) : 0;

  // ── Chart data ────────────────────────────────────────────────────────────

  const statuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
  const statusPieData = statuses
    .map((s) => ({
      name: t(`tasks.status.${s}`),
      value: tasks.filter((t) => t.status === s).length,
      color: STATUS_COLORS[s],
    }))
    .filter((d) => d.value > 0);

  const priorities: TaskPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const priorityData = priorities.map((p) => ({
    name: t(`tasks.priority.${p}`),
    total: tasks.filter((t) => t.priority === p).length,
    done: tasks.filter((t) => t.priority === p && t.status === 'DONE').length,
    color: PRIORITY_COLORS[p],
  })).filter((d) => d.total > 0);

  // Sprint velocity (SP completed per sprint)
  const velocityData = sprints
    .filter((s) => s.status !== 'PLANNING')
    .map((s) => {
      const sprintTasks = tasks.filter((t) => t.sprintId === s.id);
      const sp = sprintTasks.filter((t) => t.status === 'DONE').reduce((acc, t) => acc + (t.storyPoints ?? 0), 0);
      return { name: s.name, sp };
    });

  // Tasks per member (top 8)
  const memberTaskData = members
    .map((m) => ({
      name: userNames[m.userId] ?? t('common.unknownUser'),
      assigned: tasks.filter((t) => t.assigneeId === m.userId).length,
      done: tasks.filter((t) => t.assigneeId === m.userId && t.status === 'DONE').length,
    }))
    .filter((d) => d.assigned > 0)
    .sort((a, b) => b.assigned - a.assigned)
    .slice(0, 8);

  const unassigned = tasks.filter((t) => !t.assigneeId).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-8">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <h2 className="text-lg font-bold text-gray-900 tracking-tight">{t('projects.metrics.title')}</h2>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={t('projects.metrics.totalTasks')}
          value={total}
          sub={t('projects.metrics.donePct', { pct: donePct })}
          color="#6366f1"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label={t('projects.metrics.storyPointsDone')}
          value={doneSP}
          sub={`${totalSP} ${t('projects.metrics.total')}`}
          color="#10b981"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatCard
          label={t('projects.metrics.sprints')}
          value={sprints.length}
          sub={t('projects.metrics.completedSprints', { n: completedSprints })}
          color="#f59e0b"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
        />
        <StatCard
          label={t('projects.metrics.members')}
          value={members.length}
          sub={activeSprint ? t('projects.metrics.activeSprint', { name: activeSprint.name }) : t('projects.metrics.noActiveSprint')}
          color="#3b82f6"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      </div>

      {/* ── Progress bar ───────────────────────────────────────────────────── */}
      {total > 0 && (
        <div className="glass-card-strong p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">{t('projects.metrics.overallProgress')}</p>
            <span className="text-sm font-bold text-primary-600">{donePct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-primary-500 transition-all duration-1000"
              style={{ width: `${donePct}%` }}
            />
          </div>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {statuses.map((s) => {
              const count = tasks.filter((t) => t.status === s).length;
              if (count === 0) return null;
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[s] }} />
                  <span className="text-xs text-gray-500">{t(`tasks.status.${s}`)}</span>
                  <span className="text-xs font-semibold text-gray-800">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Backlog vs Sprint ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Task status donut */}
        <div className="glass-card-strong p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('projects.metrics.taskDistribution')}</h3>
          {total > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusPieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, name: string) => [`${v} (${Math.round((v / total) * 100)}%)`, name]}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {statusPieData.map((d) => (
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
            <p className="text-xs text-gray-400 text-center py-10">{t('projects.metrics.noTasks')}</p>
          )}
        </div>

        {/* Backlog vs sprints */}
        <div className="glass-card-strong p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('projects.metrics.backlogVsSprint')}</h3>
          {total > 0 ? (
            <div className="space-y-3">
              {/* Sprint tasks */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">{t('projects.metrics.inSprints')}</span>
                  <span className="text-xs font-semibold text-gray-800">{sprintedTasks.length}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full bg-primary-500"
                    style={{ width: `${total > 0 ? (sprintedTasks.length / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              {/* Backlog tasks */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">{t('projects.metrics.inBacklog')}</span>
                  <span className="text-xs font-semibold text-gray-800">{backlogTasks.length}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full bg-amber-400"
                    style={{ width: `${total > 0 ? (backlogTasks.length / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              {/* Unassigned */}
              {unassigned > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{t('projects.metrics.unassigned')}</span>
                    <span className="text-xs font-semibold text-gray-800">{unassigned}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-gray-300"
                      style={{ width: `${total > 0 ? (unassigned / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Sprint summary */}
              <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-gray-900">{sprints.length}</p>
                  <p className="text-xs text-gray-400">{t('projects.metrics.totalSprints')}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-600">{completedSprints}</p>
                  <p className="text-xs text-gray-400">{t('projects.metrics.completed')}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary-600">{sprints.filter((s) => s.status === 'ACTIVE').length}</p>
                  <p className="text-xs text-gray-400">{t('projects.metrics.active')}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-10">{t('projects.metrics.noTasks')}</p>
          )}
        </div>
      </div>

      {/* ── Priority breakdown ────────────────────────────────────────────── */}
      {priorityData.length > 0 && (
        <div className="glass-card-strong p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('projects.metrics.byPriority')}</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={priorityData}
              layout="vertical"
              margin={{ top: 0, right: 20, bottom: 0, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} width={60} />
              <Tooltip
                formatter={(v: number, name: string) => [v, name]}
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
              />
              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="done" name={t('tasks.status.DONE')} radius={[0, 4, 4, 0]} fill="#10b981" />
              <Bar dataKey="total" name={t('projects.metrics.total')} radius={[0, 4, 4, 0]} fill="#e5e7eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Sprint velocity ───────────────────────────────────────────────── */}
      {velocityData.length > 1 && (
        <div className="glass-card-strong p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('projects.metrics.velocity')}</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={velocityData} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
              <Tooltip
                formatter={(v: number) => [`${v} pts`, t('projects.metrics.storyPointsDone')]}
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
              />
              <Bar dataKey="sp" name="Story Points" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Tasks per member ──────────────────────────────────────────────── */}
      {memberTaskData.length > 0 && (
        <div className="glass-card-strong overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">{t('projects.metrics.tasksByMember')}</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {memberTaskData.map((d) => (
              <div key={d.name} className="flex items-center gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {d.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-gray-700 flex-1 truncate">{d.name}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-semibold text-emerald-600">{d.done} ✓</span>
                  <span className="text-xs text-gray-400">/ {d.assigned}</span>
                </div>
                <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden flex-shrink-0">
                  <div
                    className="h-1.5 rounded-full bg-emerald-500"
                    style={{ width: `${d.assigned > 0 ? (d.done / d.assigned) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="glass-card-strong flex flex-col items-center justify-center py-20 gap-3 text-center">
          <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm text-gray-400">{t('projects.metrics.noTasks')}</p>
        </div>
      )}
    </div>
  );
}