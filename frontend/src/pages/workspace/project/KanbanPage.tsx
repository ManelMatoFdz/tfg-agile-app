import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { tasksApi } from '@/api/tasks.ts';
import type { Task } from '@/types';
import KanbanBoard from '../../../components/kanban/KanbanBoard';
import Alert from '../../../components/ui/Alert';

export default function KanbanPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    tasksApi.getByProject(projectId)
      .then(setTasks)
      .catch(() => setError(t('projects.kanban.loadError')))
      .finally(() => setLoading(false));
  }, [projectId, t]);

  return (
    <div>
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} />
      )}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <KanbanBoard
          projectId={projectId!}
          tasks={tasks}
          onTasksChange={setTasks}
        />
      )}
    </div>
  );
}
