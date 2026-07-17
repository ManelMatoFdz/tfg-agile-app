import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import {
  ClipboardList, Zap, RefreshCw, Users, TrendingUp,
  BookOpen, CheckSquare, Bug,
} from 'lucide-react';
import type { TeamMember, Sprint, Task, TaskPriority, TaskType } from '../../../types';
import { tasksApi } from '../../../api/tasks';
import { sprintsApi, type VelocityDto } from '../../../api/sprints';
import { projectsApi } from '../../../api/projects';
import { usersApi } from '../../../api/users';
import Alert from '../../../components/ui/Alert';
import PageTitle from '../../../components/motion/PageTitle';
import CountUp from '../../../components/motion/CountUp';
import { useBoardColumns, getStatusLabel, getStatusColor } from '../../../hooks/useBoardColumns';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
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

// ── Card wrapper ──────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)',
};

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color = 'var(--accent)', icon, suffix,
}: {
  label: string;
  value: number;
  sub?: string;
  color?: string;
  icon: React.ReactNode;
  suffix?: string;
}) {
  return (
    <div style={{ ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {label}
        </p>
        <span style={{ color }}>{icon}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
          <CountUp value={value} />
        </p>
        {suffix && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{suffix}</span>}
      </div>
      {sub && <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{sub}</p>}
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
  const [velocity, setVelocity] = useState<VelocityDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const columns = useBoardColumns(projectId);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      tasksApi.getByProject(projectId),
      sprintsApi.listSprints(projectId),
      projectsApi.getTeamMembers(projectId),
      sprintsApi.getVelocity(projectId).catch(() => null),
    ])
      .then(([t, s, m, v]) => {
        setTasks(t);
        setSprints(s);
        setMembers(m.data);
        if (v) setVelocity(v);

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
        width: 28, height: 28,
        border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
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
      name: getStatusLabel(s, columns, t),
      value: tasks.filter((t) => t.status === s).length,
      color: getStatusColor(s, columns),
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
    .map((m) => {
      const memberTasks = tasks.filter((t) => t.assigneeId === m.userId);
      const assigned = memberTasks.length;
      const memberDone = memberTasks.filter((t) => t.status === 'DONE').length;
      const memberSP = memberTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
      const memberDoneSP = memberTasks.filter((t) => t.status === 'DONE').reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
      const typeCounts: Record<string, number> = {};
      memberTasks.forEach((t) => { typeCounts[t.type ?? 'TASK'] = (typeCounts[t.type ?? 'TASK'] || 0) + 1; });
      const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as TaskType | undefined;
      return {
        name: userNames[m.userId] ?? t('common.unknownUser'),
        userId: m.userId,
        assigned,
        done: memberDone,
        sp: memberSP,
        doneSP: memberDoneSP,
        topType,
      };
    })
    .filter((d) => d.assigned > 0)
    .sort((a, b) => b.assigned - a.assigned)
    .slice(0, 10);

  const tooltipStyle = { fontSize: 11, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)' };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>
      <style>{`
        .pm-stats-grid{display:grid;gap:12px;grid-template-columns:1fr 1fr}
        .pm-charts-grid{display:grid;gap:16px;grid-template-columns:1fr}
        .pm-member-row{display:grid;grid-template-columns:40px 1fr 100px 100px 80px;gap:12px;align-items:center}
        @media(min-width:1024px){
          .pm-stats-grid{grid-template-columns:repeat(5,1fr)}
          .pm-charts-grid{grid-template-columns:1fr 1fr}
        }
        @media(min-width:640px) and (max-width:1023px){
          .pm-stats-grid{grid-template-columns:repeat(3,1fr)}
        }
      `}</style>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <PageTitle as="h2" style={{ fontSize: 22 }}>
        {t('projects.metrics.title')}
      </PageTitle>

      {/* Summary cards — 5 columns (new: avg velocity) */}
      <div className="pm-stats-grid">
        <StatCard
          label={t('projects.metrics.totalTasks')}
          value={total}
          sub={t('projects.metrics.donePct', { pct: donePct })}
          color="#2563EB"
          icon={<ClipboardList size={16} strokeWidth={1.75} />}
        />
        <StatCard
          label={t('projects.metrics.storyPointsDone')}
          value={doneSP}
          sub={`${totalSP} ${t('projects.metrics.total')}`}
          color="#16A34A"
          icon={<Zap size={16} strokeWidth={1.75} />}
        />
        <StatCard
          label={t('projects.metrics.sprints')}
          value={sprints.length}
          sub={t('projects.metrics.completedSprints', { n: completedSprints })}
          color="#D97706"
          icon={<RefreshCw size={16} strokeWidth={1.75} />}
        />
        <StatCard
          label={t('projects.metrics.members')}
          value={members.length}
          sub={activeSprint ? t('projects.metrics.activeSprint', { name: activeSprint.name }) : t('projects.metrics.noActiveSprint')}
          color="#7C3AED"
          icon={<Users size={16} strokeWidth={1.75} />}
        />
        {velocity && velocity.completedSprints > 0 ? (
          <StatCard
            label={t('projects.metrics.avgVelocity')}
            value={Math.round(velocity.averageVelocity)}
            suffix="pts"
            sub={t('projects.metrics.avgVelocitySub', { n: velocity.completedSprints })}
            color="#0891B2"
            icon={<TrendingUp size={16} strokeWidth={1.75} />}
          />
        ) : (
          <StatCard
            label={t('projects.metrics.avgVelocity')}
            value={0}
            suffix="pts"
            sub={t('projects.metrics.noCompletedSprints')}
            color="#94A3B8"
            icon={<TrendingUp size={16} strokeWidth={1.75} />}
          />
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div style={{ ...card, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {t('projects.metrics.overallProgress')}
            </p>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
              {donePct}%
            </span>
          </div>
          <div style={{ width: '100%', background: 'var(--bg-hover)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
            <div style={{
              height: 8, borderRadius: 4, background: 'var(--accent)',
              width: `${donePct}%`, transition: 'width 1s ease',
            }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginTop: 12 }}>
            {statuses.map((s) => {
              const count = tasks.filter((t) => t.status === s).length;
              if (count === 0) return null;
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: getStatusColor(s, columns), flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{getStatusLabel(s, columns, t)}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task distribution + Backlog vs Sprint */}
      <div className="pm-charts-grid">
        {/* Status donut */}
        <div style={{ ...card, padding: '16px 20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            {t('projects.metrics.taskDistribution')}
          </h3>
          {total > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {statusPieData.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: d.color }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{d.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{d.value}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', width: 32, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
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
        <div style={{ ...card, padding: '16px 20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            {t('projects.metrics.backlogVsSprint')}
          </h3>
          {total > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: t('projects.metrics.inSprints'), count: sprintedTasks.length, color: 'var(--accent)' },
                { label: t('projects.metrics.inBacklog'), count: backlogTasks.length, color: 'var(--ochre)' },
                ...(unassigned > 0 ? [{ label: t('projects.metrics.unassigned'), count: unassigned, color: 'var(--border)' }] : []),
              ].map((row) => (
                <div key={row.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{row.count}</span>
                  </div>
                  <div style={{ width: '100%', background: 'var(--bg-hover)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ height: 6, borderRadius: 4, background: row.color, width: `${total > 0 ? (row.count / total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                {[
                  { value: sprints.length, label: t('projects.metrics.totalSprints'), color: 'var(--text)' },
                  { value: completedSprints, label: t('projects.metrics.completed'), color: 'var(--success)' },
                  { value: sprints.filter((s) => s.status === 'ACTIVE').length, label: t('projects.metrics.active'), color: 'var(--accent)' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: stat.color, fontFamily: 'var(--font-mono)' }}>{stat.value}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-faint)', letterSpacing: '0.03em' }}>{stat.label}</p>
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

      {/* Priority breakdown + Sprint velocity side by side */}
      <div className="pm-charts-grid">
        {priorityData.length > 0 && (
          <div style={{ ...card, padding: '16px 20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              {t('projects.metrics.byPriority')}
            </h3>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={priorityData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} width={60} />
                <Tooltip
                  formatter={(value, name) => {
                    const v = typeof value === 'number' ? value : 0;
                    const label = typeof name === 'string' ? name : String(name ?? '');
                    return [v, label];
                  }}
                  contentStyle={tooltipStyle}
                />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="done" name={t('tasks.status.DONE')} radius={[0, 4, 4, 0]} fill="#16A34A" />
                <Bar dataKey="total" name={t('projects.metrics.total')} radius={[0, 4, 4, 0]} fill="#94A3B8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {velocityData.length > 1 && (
          <div style={{ ...card, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                {t('projects.metrics.velocity')}
              </h3>
              {velocity && velocity.completedSprints > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--success)',
                  background: 'var(--success-bg, rgba(34,197,94,0.1))',
                  padding: '3px 10px', borderRadius: 'var(--radius-pill)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {t('projects.metrics.avgLabel')}: {Math.round(velocity.averageVelocity)} pts
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={velocityData} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} allowDecimals={false} />
                <Tooltip
                  formatter={(value) => {
                    const v = typeof value === 'number' ? value : 0;
                    return [`${v} pts`, t('projects.metrics.storyPointsDone')];
                  }}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="sp" name="Story Points" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tasks per member — table-style with richer info */}
      {memberTaskData.length > 0 && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              {t('projects.metrics.tasksByMember')}
            </h3>
          </div>

          {/* Table header */}
          <div
            className="pm-member-row"
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
            <span />
            <span>{t('projects.metrics.memberName')}</span>
            <span style={{ textAlign: 'center' }}>{t('projects.metrics.memberTasks')}</span>
            <span style={{ textAlign: 'center' }}>{t('projects.metrics.memberPoints')}</span>
            <span style={{ textAlign: 'center' }}>{t('projects.metrics.memberProgress')}</span>
          </div>

          {memberTaskData.map((d) => {
            const pct = d.assigned > 0 ? Math.round((d.done / d.assigned) * 100) : 0;
            const topTypeConf = d.topType ? TYPE_ICON[d.topType] : null;
            const TopIcon = topTypeConf?.icon;
            return (
              <div
                key={d.userId}
                className="pm-member-row"
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Avatar */}
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--accent-muted)', color: 'var(--accent)',
                  fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {d.name.charAt(0).toUpperCase()}
                </div>

                {/* Name + top type badge */}
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text)',
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}>
                    {d.name}
                  </p>
                  {TopIcon && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <TopIcon size={11} strokeWidth={2} style={{ color: topTypeConf!.color }} />
                      <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                        {t(`tasks.type.${d.topType}`)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Tasks count */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                    {d.done}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                    /{d.assigned}
                  </span>
                </div>

                {/* Story points */}
                <div style={{ textAlign: 'center' }}>
                  {d.sp > 0 ? (
                    <>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                        {d.doneSP}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                        /{d.sp}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>—</span>
                  )}
                </div>

                {/* Progress bar */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: '100%', background: 'var(--bg-hover)', borderRadius: 3, height: 6, overflow: 'hidden' }}>
                    <div style={{
                      height: 6, borderRadius: 3, background: 'var(--success)',
                      width: `${pct}%`, transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {total === 0 && (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 12, textAlign: 'center' }}>
          <ClipboardList size={36} strokeWidth={1.25} style={{ color: 'var(--border)' }} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-faint)' }}>{t('projects.metrics.noTasks')}</p>
        </div>
      )}
    </div>
  );
}