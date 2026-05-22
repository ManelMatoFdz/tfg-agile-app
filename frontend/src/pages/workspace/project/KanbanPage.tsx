import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sprintsApi } from '../../../api/sprints';
import type { Sprint, Task } from '@/types';
import KanbanBoard from '../../../components/kanban/KanbanBoard';
import Alert from '../../../components/ui/Alert';
import { useProjectMember } from '../../../hooks/useProjectMember';

export default function KanbanPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();

  const { canMoveTask, canDeleteTask } = useProjectMember(projectId);

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
        if (active) {
          return sprintsApi.getSprintTasks(active.id);
        }
        return [];
      })
      .then(setTasks)
      .catch(() => setError(t('projects.kanban.loadError')))
      .finally(() => setLoading(false));
  }, [projectId, t]);

  const formatDate = (date: string | null | undefined) =>
    date ? new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : null;

  return (
    <div>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !activeSprint ? (
        <div className="glass-card-strong p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">{t('projects.kanban.noActiveSprint')}</p>
          <p className="text-xs text-gray-400 mt-1">
            {t('projects.kanban.noActiveSprintSub')}{' '}
            {workspaceId && projectId && (
              <Link
                to={`/workspaces/${workspaceId}/projects/${projectId}/sprints`}
                className="text-primary-600 hover:underline"
              >
                {t('projects.sprints.title')}
              </Link>
            )}
          </p>
        </div>
      ) : (
        <>
          {/* Active sprint header */}
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900">{activeSprint.name}</h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">
              {t('projects.sprints.status.ACTIVE')}
            </span>
            {(activeSprint.startDate || activeSprint.endDate) && (
              <span className="text-xs text-gray-400">
                {formatDate(activeSprint.startDate) ?? '—'} → {formatDate(activeSprint.endDate) ?? '—'}
              </span>
            )}
            {activeSprint.goal && (
              <span className="text-xs text-gray-400 italic truncate max-w-xs">{activeSprint.goal}</span>
            )}
          </div>

          <KanbanBoard
            projectId={projectId!}
            tasks={tasks}
            onTasksChange={setTasks}
            disableCreate={!canMoveTask}
            canMove={canMoveTask}
            canDelete={canDeleteTask}
          />
        </>
      )}
    </div>
  );
}
