import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Sprint, Task } from '../../../types';
import { sprintsApi } from '../../../api/sprints';
import { tasksApi } from '../../../api/tasks';
import KanbanBoard from '../../../components/kanban/KanbanBoard';
import Alert from '../../../components/ui/Alert';

const SPRINT_STATUS_BADGE: Record<Sprint['status'], string> = {
  PLANNING: 'bg-gray-100 text-gray-500',
  ACTIVE: 'bg-primary-100 text-primary-700',
  COMPLETED: 'bg-emerald-100 text-emerald-600',
};

export default function SprintBoardPage() {
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

  useEffect(() => {
    if (!sprintId) return;
    setLoading(true);
    Promise.all([
      sprintsApi.getSprint(sprintId),
      sprintsApi.getSprintTasks(sprintId),
    ])
      .then(([sprintData, tasksData]) => {
        setSprint(sprintData);
        setTasks(tasksData);
      })
      .catch(() => setError(t('projects.sprints.board.loadError')))
      .finally(() => setLoading(false));
  }, [sprintId, t]);

  const formatDate = (date: string | null | undefined) =>
    date
      ? new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      : null;

  return (
    <div className="space-y-4">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Back link + sprint header */}
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
          {sprint && (
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-gray-900">{sprint.name}</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SPRINT_STATUS_BADGE[sprint.status]}`}>
                {t(`projects.sprints.status.${sprint.status}`)}
              </span>
            </div>
          )}
          {sprint && (sprint.startDate || sprint.endDate || sprint.goal) && (
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {(sprint.startDate || sprint.endDate) && (
                <span>{formatDate(sprint.startDate) ?? '—'} → {formatDate(sprint.endDate) ?? '—'}</span>
              )}
              {sprint.goal && <span className="italic">{sprint.goal}</span>}
            </div>
          )}
        </div>

        {!loading && (
          <span className="flex-shrink-0 text-xs text-gray-400 bg-white border border-gray-200 px-2.5 py-1 rounded-full">
            {tasks.length} {tasks.length === 1 ? t('projects.sprints.task') : t('projects.sprints.tasks')}
          </span>
        )}
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <KanbanBoard
          projectId={projectId!}
          tasks={tasks}
          onTasksChange={setTasks}
          disableCreate
        />
      )}
    </div>
  );
}
