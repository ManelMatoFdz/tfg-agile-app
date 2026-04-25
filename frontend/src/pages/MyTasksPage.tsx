import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Task, TaskPriority, TaskStatus } from '../types';
import { tasksApi } from '../api/tasks';
import Alert from '../components/ui/Alert';

const STATUS_ORDER: TaskStatus[] = ['IN_PROGRESS', 'IN_REVIEW', 'TODO', 'DONE'];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  CRITICAL: 'bg-red-100 text-red-600',
  HIGH: 'bg-amber-100 text-amber-600',
  MEDIUM: 'bg-blue-100 text-blue-600',
  LOW: 'bg-gray-100 text-gray-500',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-gray-100 text-gray-500',
  IN_PROGRESS: 'bg-blue-100 text-blue-600',
  IN_REVIEW: 'bg-amber-100 text-amber-600',
  DONE: 'bg-emerald-100 text-emerald-600',
};

const STATUS_DOT: Record<TaskStatus, string> = {
  TODO: 'bg-gray-400',
  IN_PROGRESS: 'bg-blue-400',
  IN_REVIEW: 'bg-amber-400',
  DONE: 'bg-emerald-400',
};

export default function MyTasksPage() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tasksApi
      .myTasks()
      .then(setTasks)
      .catch(() => setError(t('myTasks.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  const tasksByStatus = (status: TaskStatus) =>
    tasks
      .filter((task) => task.status === status)
      .sort((a, b) => {
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

  const activeTasks = tasks.filter((t) => t.status !== 'DONE').length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('myTasks.title')}</h1>
          {!loading && tasks.length > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">
              {activeTasks > 0
                ? t('myTasks.activeSummary', { count: activeTasks })
                : t('myTasks.allDone')}
            </p>
          )}
        </div>
        {!loading && (
          <span className="text-xs font-medium text-gray-400 bg-white border border-gray-200 px-2.5 py-1 rounded-full">
            {tasks.length} {tasks.length === 1 ? t('myTasks.task') : t('myTasks.tasks')}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="glass-card-strong p-12 text-center">
          <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700">{t('myTasks.empty')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('myTasks.emptySubtitle')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {STATUS_ORDER.map((status) => {
            const group = tasksByStatus(status);
            if (group.length === 0) return null;
            return (
              <div key={status} className="glass-card-strong overflow-hidden">
                {/* Group header */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/60 border-b border-gray-100">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>
                    {t(`tasks.status.${status}`)}
                  </span>
                  <span className="text-xs text-gray-400">{group.length}</span>
                </div>

                {/* Task rows */}
                <div className="divide-y divide-gray-50">
                  {group.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                      {/* Priority */}
                      <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                        {t(`tasks.priority.${task.priority}`)}
                      </span>

                      {/* Title + description */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{task.description}</p>
                        )}
                      </div>

                      {/* Story points */}
                      {task.storyPoints != null ? (
                        <span className="flex-shrink-0 text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full w-14 text-center">
                          {task.storyPoints} pts
                        </span>
                      ) : (
                        <span className="flex-shrink-0 w-14" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
