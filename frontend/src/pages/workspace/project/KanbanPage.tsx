import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Columns, Clock, AlertTriangle } from 'lucide-react';
import { sprintsApi } from '../../../api/sprints';
import type { Sprint, Task } from '@/types';
import KanbanBoard from '../../../components/kanban/KanbanBoard';
import Alert from '../../../components/ui/Alert';
import { useProjectMember } from '../../../hooks/useProjectMember';

export default function KanbanPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();

  const { canMoveTask, canDeleteSprintTask } = useProjectMember(projectId);

  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    sprintsApi
      .listSprints(projectId)
      .then((sprints) => {
        const active = sprints.find((s) => s.status === 'ACTIVE') ?? null;
        setActiveSprint(active);
        if (active) return sprintsApi.getSprintTasks(active.id);
        return [];
      })
      .then(setTasks)
      .catch(() => setError(t('projects.kanban.loadError')))
      .finally(() => setLoading(false));
  }, [projectId, t]);

  const refreshTasks = async () => {
    if (!activeSprint) return;
    try {
      const fresh = await sprintsApi.getSprintTasks(activeSprint.id);
      setTasks((prev) => {
        if (JSON.stringify(fresh) === JSON.stringify(prev)) return prev;
        return fresh;
      });
    } catch {
      // silent — no error shown for background refresh
    }
  };

  const formatDate = (date: string | null | undefined) =>
    date ? new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : null;

  const sprintOverdueDays = (() => {
    if (!activeSprint?.endDate) return 0;
    const end = new Date(activeSprint.endDate);
    end.setHours(23, 59, 59, 999);
    const today = new Date();
    return today > end ? Math.ceil((today.getTime() - end.getTime()) / 86_400_000) : 0;
  })();

  const daysRemaining = (() => {
    if (!activeSprint?.endDate) return null;
    const end = new Date(activeSprint.endDate);
    end.setHours(23, 59, 59, 999);
    const today = new Date();
    if (today > end) return null;
    return Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
  })();

  const pendingTasks = tasks.filter((t) => t.status !== 'DONE').length;

  return (
    <div>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

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
      ) : !activeSprint ? (
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
            <Columns size={24} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
            {t('projects.kanban.noActiveSprint')}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-muted)', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
            {t('projects.kanban.noActiveSprintSub')}{' '}
            {workspaceId && projectId && (
              <Link
                to={`/workspaces/${workspaceId}/projects/${projectId}/sprints`}
                style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
              >
                {t('projects.sprints.title')}
              </Link>
            )}
          </p>
        </div>
      ) : (
        <>
          {/* Active sprint header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 20px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                {activeSprint.name}
              </span>

              <span style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--success-bg)',
                color: 'var(--success)',
              }}>
                {t('projects.sprints.status.ACTIVE')}
              </span>

              {activeSprint.goal && (
                <span style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  maxWidth: 280,
                }}>
                  {activeSprint.goal}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {(activeSprint.startDate || activeSprint.endDate) && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                }}>
                  <Clock size={13} strokeWidth={1.75} />
                  {formatDate(activeSprint.startDate) ?? '--'} - {formatDate(activeSprint.endDate) ?? '--'}
                </span>
              )}

              {daysRemaining != null && (
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: daysRemaining <= 3 ? 'var(--warning)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {daysRemaining}d left
                </span>
              )}
            </div>
          </div>

          {sprintOverdueDays > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', marginBottom: 16,
              background: 'var(--warning-bg)',
              border: '1px solid var(--warning)',
              borderRadius: 'var(--radius-md)',
            }}>
              <AlertTriangle size={16} strokeWidth={2} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 13, color: 'var(--warning)', fontWeight: 500 }}>
                {t('projects.kanban.overdueBanner', { days: sprintOverdueDays, pending: pendingTasks })}
              </p>
            </div>
          )}

          <KanbanBoard
            projectId={projectId!}
            tasks={tasks}
            onTasksChange={setTasks}
            onRefresh={refreshTasks}
            disableCreate={true}
            canMove={canMoveTask}
            canDelete={canDeleteSprintTask}
            readOnly={!canMoveTask}
          />
        </>
      )}
    </div>
  );
}