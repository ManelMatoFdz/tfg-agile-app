import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Task, TaskPriority, TaskStatus } from '../../../types';
import { sprintsApi } from '../../../api/sprints';
import { tasksApi } from '../../../api/tasks';
import type { CreateTaskDto, UpdateTaskDto } from '../../../api/tasks';
import TaskModal from '../../../components/kanban/TaskModal';
import Alert from '../../../components/ui/Alert';

const PRIORITY_ORDER: TaskPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

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

export default function BacklogPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalTask, setModalTask] = useState<Task | null | undefined>(undefined);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    sprintsApi
      .getBacklog(projectId)
      .then(setTasks)
      .catch(() => setError(t('projects.backlog.loadError')))
      .finally(() => setLoading(false));
  }, [projectId, t]);

  const totalPoints = tasks.reduce((sum, task) => sum + (task.storyPoints ?? 0), 0);

  const tasksByPriority = (priority: TaskPriority) =>
    tasks
      .filter((task) => task.priority === priority)
      .sort((a, b) => a.position - b.position);

  const handleSave = async (dto: CreateTaskDto | UpdateTaskDto) => {
    if (modalTask) {
      const updated = await tasksApi.update(modalTask.id, dto as UpdateTaskDto);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const created = await tasksApi.create(projectId!, dto as CreateTaskDto);
      setTasks((prev) => [...prev, created]);
    }
  };

  const handleMove = async (status: TaskStatus) => {
    if (!modalTask) return;
    const updated = await tasksApi.move(modalTask.id, { status, position: 0 });
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleDelete = async () => {
    if (!modalTask) return;
    await tasksApi.delete(modalTask.id);
    setTasks((prev) => prev.filter((t) => t.id !== modalTask.id));
  };

  return (
    <div className="space-y-4">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900">{t('projects.backlog.title')}</h2>
          {!loading && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                {tasks.length} {tasks.length === 1 ? t('projects.backlog.task') : t('projects.backlog.tasks')}
              </span>
              {totalPoints > 0 && (
                <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                  {totalPoints} pts
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setModalTask(null)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('projects.backlog.newTask')}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="glass-card-strong p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">{t('projects.backlog.noTasks')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('projects.backlog.noTasksSubtitle')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {PRIORITY_ORDER.map((priority) => {
            const group = tasksByPriority(priority);
            if (group.length === 0) return null;
            return (
              <div key={priority} className="glass-card-strong overflow-hidden">
                {/* Priority group header */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/60 border-b border-gray-100">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[priority]}`}>
                    {t(`tasks.priority.${priority}`)}
                  </span>
                  <span className="text-xs text-gray-400">{group.length}</span>
                </div>

                {/* Task rows */}
                <div className="divide-y divide-gray-50">
                  {group.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => setModalTask(task)}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors cursor-pointer group"
                    >
                      {/* Title + description */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-700 transition-colors">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{task.description}</p>
                        )}
                      </div>

                      {/* Status */}
                      <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status]}`}>
                        {t(`tasks.status.${task.status}`)}
                      </span>

                      {/* Story points */}
                      {task.storyPoints != null ? (
                        <span className="flex-shrink-0 text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full w-14 text-center">
                          {task.storyPoints} pts
                        </span>
                      ) : (
                        <span className="flex-shrink-0 w-14" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task modal */}
      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          defaultStatus="TODO"
          onClose={() => setModalTask(undefined)}
          onSave={handleSave}
          onMove={modalTask ? handleMove : undefined}
          onDelete={modalTask ? handleDelete : undefined}
        />
      )}
    </div>
  );
}