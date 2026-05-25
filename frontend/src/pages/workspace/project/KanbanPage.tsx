import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Columns } from 'lucide-react';
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
  const pendingTasks = tasks.filter((t) => t.status !== 'DONE').length;

  return (
    <div>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: 24,
            height: 24,
            border: `2px solid var(--border)`,
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
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 40,
            height: 40,
            background: 'var(--bg-hover)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Columns size={18} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
            {t('projects.kanban.noActiveSprint')}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
            {t('projects.kanban.noActiveSprintSub')}{' '}
            {workspaceId && projectId && (
              <Link
                to={`/workspaces/${workspaceId}/projects/${projectId}/sprints`}
                style={{ color: 'var(--accent)', textDecoration: 'none' }}
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
            gap: 8,
            marginBottom: 12,
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              {activeSprint.name}
            </span>

            <span style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--success-bg)',
              color: 'var(--success)',
            }}>
              {t('projects.sprints.status.ACTIVE')}
            </span>

            {(activeSprint.startDate || activeSprint.endDate) && (
              <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                {formatDate(activeSprint.startDate) ?? '—'} → {formatDate(activeSprint.endDate) ?? '—'}
              </span>
            )}

            {activeSprint.goal && (
              <span style={{
                fontSize: 11,
                color: 'var(--text-faint)',
                fontStyle: 'italic',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                maxWidth: 260,
              }}>
                {activeSprint.goal}
              </span>
            )}
          </div>

          {sprintOverdueDays > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 14px', marginBottom: 12,
              background: 'rgba(245,158,11,0.07)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 'var(--radius-md)',
            }}>
              <span style={{ fontSize: 13 }}>⚠</span>
              <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
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
