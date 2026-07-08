import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import type { TeamMember, Sprint, Task, TaskPriority } from '../../../types';
import { tasksApi } from '../../../api/tasks';
import { sprintsApi } from '../../../api/sprints';
import { projectsApi } from '../../../api/projects';
import { usersApi } from '../../../api/users';
import Alert from '../../../components/ui/Alert';
import PageTitle from '../../../components/motion/PageTitle';
import CountUp from '../../../components/motion/CountUp';

// ── Colours ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DONE: 'var(--success)',
  IN_PROGRESS: 'var(--ink-blue)',
  IN_REVIEW: 'var(--ochre)',
  TODO: 'var(--text-faint)',
};
const DEFAULT_STATUS_COLOR = 'var(--text-faint)';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  CRITICAL: 'var(--danger)',
  HIGH: 'var(--ochre)',
  MEDIUM: 'var(--ink-blue)',
  LOW: 'var(--text-faint)',
};

// ── Animated counter ──────────────────────────────────────────────────────────


// ── Stat card ─────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
};

function StatCard({
  label, value, sub, color = 'var(--accent)', icon,
}: {
  label: string;
  value: number;
  sub?: string;
  color?: string;
  icon: React.ReactNode;
}) {
  return (
    <div style={{ ...card, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {label}
        </p>
        <span style={{ color, opacity: 0.8 }}>{icon}</span>
      </div>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
        <CountUp value={value} />
      </p>
      {sub && <p style={{ margin: 0, fontSize: 10, color: 'var(--text-faint)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{sub}</p>}
    </div>
  );
}

// ── ProjectMetricsPage ────────────────────────────────────────────────────────

export default function ProjectMetricsPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      tasksApi.getByProject(projectId),
      sprintsApi.listSprints(projectId),
      projectsApi.getTeamMembers(projectId),
    ])
      .then(([t, s, m]) => {
        setTasks(t);
        setSprints(s);
        setMembers(m.data);

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
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{
        width: 24, height: 24,
        border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
        borderRadius: '50%', animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  );

  // ── Derived metrics ───────────────────────────────────────────────────────

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'DONE').length;
  const totalSP = tasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const doneSP = tasks.filter((t) => t.status === 'DONE').reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const backlogTasks = tasks.filter((t) => !t.sprintId);
  const sprintedTasks = tasks.filter((t) => !!t.sprintId);
  const completedSprints = sprints.filter((s) => s.status === 'COMPLETED').length;
  const activeSprint = sprints.find((s) => s.status === 'ACTIVE');
  const donePct = total > 0 ? Math.round((done / total) * 100) : 0;
  const unassigned = tasks.filter((t) => !t.assigneeId).length;

  // ── Chart data ────────────────────────────────────────────────────────────

  const statuses = [...new Set(tasks.map((t) => t.status))];
  const statusPieData = statuses
    .map((s) => ({
      name: t(`tasks.status.${s}`, { defaultValue: s.replace(/_/g, ' ') }),
      value: tasks.filter((t) => t.status === s).length,
      color: STATUS_COLORS[s] ?? DEFAULT_STATUS_COLOR,
    }))
    .filter((d) => d.value > 0);

  const priorities: TaskPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const priorityData = priorities.map((p) => ({
    name: t(`tasks.priority.${p}`),
    total: tasks.filter((t) => t.priority === p).length,
    done: tasks.filter((t) => t.priority === p && t.status === 'DONE').length,
    color: PRIORITY_COLORS[p],
  })).filter((d) => d.total > 0);

  const velocityData = sprints
    .filter((s) => s.status !== 'PLANNING')
    .map((s) => {
      const sprintTasks = tasks.filter((t) => t.sprintId === s.id);
      const sp = sprintTasks.filter((t) => t.status === 'DONE').reduce((acc, t) => acc + (t.storyPoints ?? 0), 0);
      return { name: s.name, sp };
    });

  const memberTaskData = members
    .map((m) => ({
      name: userNames[m.userId] ?? t('common.unknownUser'),
      assigned: tasks.filter((t) => t.assigneeId === m.userId).length,
      done: tasks.filter((t) => t.assigneeId === m.userId && t.status === 'DONE').length,
    }))
    .filter((d) => d.assigned > 0)
    .sort((a, b) => b.assigned - a.assigned)
    .slice(0, 8);

  const tooltipStyle = { fontSize: 11, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)' };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 24 }}>
      <style>{`
        .metrics-summary-grid{display:grid;gap:12px;grid-template-columns:1fr 1fr}
        .metrics-charts-grid{display:grid;gap:16px;grid-template-columns:1fr}
        @media(min-width:1024px){
          .metrics-summary-grid{grid-template-columns:repeat(4,1fr)}
          .metrics-charts-grid{grid-template-columns:1fr 1fr}
        }
      `}</style>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <PageTitle as="h2" style={{ fontSize: 20 }}>
        {t('projects.metrics.title')}
      </PageTitle>

      {/* Summary cards */}
      <div className="metrics-summary-grid">
        <StatCard
          label={t('projects.metrics.totalTasks')}
          value={total}
          sub={t('projects.metrics.donePct', { pct: donePct })}
          color="var(--accent)"
          icon={
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label={t('projects.metrics.storyPointsDone')}
          value={doneSP}
          sub={`${totalSP} ${t('projects.metrics.total')}`}
          color="var(--success)"
          icon={
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatCard
          label={t('projects.metrics.sprints')}
          value={sprints.length}
          sub={t('projects.metrics.completedSprints', { n: completedSprints })}
          color="var(--ochre)"
          icon={
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
        />
        <StatCard
          label={t('projects.metrics.members')}
          value={members.length}
          sub={activeSprint ? t('projects.metrics.activeSprint', { name: activeSprint.name }) : t('projects.metrics.noActiveSprint')}
          color="var(--ink-blue)"
          icon={
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div style={{ ...card, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
              {t('projects.metrics.overallProgress')}
            </p>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
              {donePct}%
            </span>
          </div>
          <div style={{ width: '100%', background: 'var(--bg-hover)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{
              height: 6, borderRadius: 4, background: 'var(--accent)',
              width: `${donePct}%`, transition: 'width 1s ease',
            }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 10 }}>
            {statuses.map((s) => {
              const count = tasks.filter((t) => t.status === s).length;
              if (count === 0) return null;
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[s] ?? DEFAULT_STATUS_COLOR, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t(`tasks.status.${s}`, { defaultValue: s.replace(/_/g, ' ') })}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task distribution + Backlog vs Sprint */}
      <div className="metrics-charts-grid">
        {/* Status donut */}
        <div style={{ ...card, padding: '14px 16px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
            {t('projects.metrics.taskDistribution')}
          </h3>
          {total > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%" cy="50%"
                    innerRadius={42} outerRadius={62}
                    paddingAngle={2} dataKey="value"
                  >
                    {statusPieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => {
                      const v = typeof value === 'number' ? value : 0;
                      const label = typeof name === 'string' ? name : String(name ?? '');
                      return [`${v} (${Math.round((v / total) * 100)}%)`, label];
                    }}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {statusPieData.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: d.color }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{d.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{d.value}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)', width: 32, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {Math.round((d.value / total) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '32px 0' }}>
              {t('projects.metrics.noTasks')}
            </p>
          )}
        </div>

        {/* Backlog vs sprints */}
        <div style={{ ...card, padding: '14px 16px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
            {t('projects.metrics.backlogVsSprint')}
          </h3>
          {total > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: t('projects.metrics.inSprints'), count: sprintedTasks.length, color: 'var(--accent)' },
                { label: t('projects.metrics.inBacklog'), count: backlogTasks.length, color: 'var(--ochre)' },
                ...(unassigned > 0 ? [{ label: t('projects.metrics.unassigned'), count: unassigned, color: 'var(--border)' }] : []),
              ].map((row) => (
                <div key={row.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{row.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{row.count}</span>
                  </div>
                  <div style={{ width: '100%', background: 'var(--bg-hover)', borderRadius: 3, height: 5, overflow: 'hidden' }}>
                    <div style={{ height: 5, borderRadius: 3, background: row.color, width: `${total > 0 ? (row.count / total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                {[
                  { value: sprints.length, label: t('projects.metrics.totalSprints'), color: 'var(--text)' },
                  { value: completedSprints, label: t('projects.metrics.completed'), color: 'var(--success)' },
                  { value: sprints.filter((s) => s.status === 'ACTIVE').length, label: t('projects.metrics.active'), color: 'var(--accent)' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: stat.color, fontFamily: 'var(--font-mono)' }}>{stat.value}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 9, color: 'var(--text-faint)', letterSpacing: '0.03em' }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '32px 0' }}>
              {t('projects.metrics.noTasks')}
            </p>
          )}
        </div>
      </div>

      {/* Priority breakdown */}
      {priorityData.length > 0 && (
        <div style={{ ...card, padding: '14px 16px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
            {t('projects.metrics.byPriority')}
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={priorityData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={60} />
              <Tooltip
                formatter={(value, name) => {
                  const v = typeof value === 'number' ? value : 0;
                  const label = typeof name === 'string' ? name : String(name ?? '');
                  return [v, label];
                }}
                contentStyle={tooltipStyle}
              />
              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="done" name={t('tasks.status.DONE')} radius={[0, 4, 4, 0]} fill="var(--success)" />
              <Bar dataKey="total" name={t('projects.metrics.total')} radius={[0, 4, 4, 0]} fill="var(--bg-hover)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sprint velocity */}
      {velocityData.length > 1 && (
        <div style={{ ...card, padding: '14px 16px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
            {t('projects.metrics.velocity')}
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={velocityData} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} allowDecimals={false} />
              <Tooltip
                formatter={(value) => {
                  const v = typeof value === 'number' ? value : 0;
                  return [`${v} pts`, t('projects.metrics.storyPointsDone')];
                }}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="sp" name="Story Points" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tasks per member */}
      {memberTaskData.length > 0 && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              {t('projects.metrics.tasksByMember')}
            </h3>
          </div>
          <div>
            {memberTaskData.map((d, idx) => (
              <div key={d.name} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 16px',
                borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--accent-muted)', color: 'var(--accent)',
                  fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {d.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {d.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>{d.done}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>/ {d.assigned}</span>
                </div>
                <div style={{ width: 80, background: 'var(--bg-hover)', borderRadius: 3, height: 5, overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{
                    height: 5, borderRadius: 3, background: 'var(--success)',
                    width: `${d.assigned > 0 ? (d.done / d.assigned) * 100 : 0}%`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {total === 0 && (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 10, textAlign: 'center' }}>
          <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: 'var(--border)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)' }}>{t('projects.metrics.noTasks')}</p>
        </div>
      )}
    </div>
  );
}