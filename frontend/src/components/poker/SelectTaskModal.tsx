import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tasksApi } from '../../api/tasks';
import { sprintsApi } from '../../api/sprints';
import type { Task } from '../../types';

interface Props {
  projectId: string;
  onClose: () => void;
  onSelect: (taskId: string, taskTitle: string) => Promise<void>;
}

export default function SelectTaskModal({ projectId, onClose, onSelect }: Props) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      tasksApi.getByProject(projectId),
      sprintsApi.listSprints(projectId),
    ]).then(([allTasks, sprints]) => {
      const planningSprints = new Set(
        sprints.filter((s) => s.status === 'PLANNING').map((s) => s.id)
      );
      setTasks(
        allTasks.filter(
          (t) => t.status !== 'DONE' && (t.sprintId == null || planningSprints.has(t.sprintId))
        )
      );
    })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleSelect = async (task: Task) => {
    setSubmitting(true);
    try {
      await onSelect(task.id, task.title);
      onClose();
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card-strong p-6 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t('poker.room.selectTask')}</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">{t('poker.room.noTasks')}</p>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-2 pr-1">
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => handleSelect(task)}
                disabled={submitting}
                className="w-full text-left glass-card p-3 hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">{task.title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {task.storyPoints != null && (
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                        {task.storyPoints} SP
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      task.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                      task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                      task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {t(`tasks.priority.${task.priority}`)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 mt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}