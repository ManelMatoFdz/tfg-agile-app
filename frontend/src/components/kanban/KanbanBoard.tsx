import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Task, TaskStatus } from '../../types';
import { tasksApi } from '../../api/tasks';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

const COLUMNS: { status: TaskStatus; colorDot: string; colorHeader: string }[] = [
  { status: 'TODO',        colorDot: 'bg-gray-400',    colorHeader: 'border-gray-200' },
  { status: 'IN_PROGRESS', colorDot: 'bg-blue-400',    colorHeader: 'border-blue-200' },
  { status: 'IN_REVIEW',   colorDot: 'bg-amber-400',   colorHeader: 'border-amber-200' },
  { status: 'DONE',        colorDot: 'bg-emerald-400', colorHeader: 'border-emerald-200' },
];

interface Props {
  projectId: string;
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  disableCreate?: boolean;
}

export default function KanbanBoard({ projectId, tasks, onTasksChange, disableCreate = false }: Props) {
  const { t } = useTranslation();
  const [modalTask, setModalTask] = useState<Task | null | undefined>(undefined); // undefined = closed
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('TODO');

  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

  const openCreate = (status: TaskStatus) => {
    setDefaultStatus(status);
    setModalTask(null); // null = create
  };

  const openEdit = (task: Task) => {
    setModalTask(task);
  };

  const handleSave = async (dto: Parameters<typeof tasksApi.create>[1] | Parameters<typeof tasksApi.update>[1]) => {
    if (modalTask) {
      // edit
      const updated = await tasksApi.update(modalTask.id, dto as Parameters<typeof tasksApi.update>[1]);
      onTasksChange(tasks.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      // create
      const created = await tasksApi.create(projectId, dto as Parameters<typeof tasksApi.create>[1]);
      onTasksChange([...tasks, created]);
    }
  };

  const handleMove = async (status: TaskStatus) => {
    if (!modalTask) return;
    const colTasks = tasksByStatus(status);
    const updated = await tasksApi.move(modalTask.id, { status, position: colTasks.length });
    onTasksChange(tasks.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleDelete = async () => {
    if (!modalTask) return;
    await tasksApi.delete(modalTask.id);
    onTasksChange(tasks.filter((t) => t.id !== modalTask.id));
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map(({ status, colorDot, colorHeader }) => {
          const col = tasksByStatus(status);
          return (
            <div
              key={status}
              className={`flex-shrink-0 w-64 bg-gray-50/80 rounded-xl border ${colorHeader} flex flex-col`}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${colorDot}`} />
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t(`tasks.status.${status}`)}
                  </p>
                  <span className="text-xs font-medium text-gray-400 bg-white px-1.5 py-0.5 rounded-full">
                    {col.length}
                  </span>
                </div>
                {!disableCreate && (
                  <button
                    onClick={() => openCreate(status)}
                    title={t('projects.kanban.newTask')}
                    className="p-1 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Tasks */}
              <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                {col.length === 0 ? (
                  <p className="text-xs text-gray-300 text-center py-4">{t('projects.kanban.noTasks')}</p>
                ) : (
                  col.map((task) => (
                    <TaskCard key={task.id} task={task} onClick={() => openEdit(task)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          defaultStatus={defaultStatus}
          onClose={() => setModalTask(undefined)}
          onSave={handleSave}
          onMove={modalTask ? handleMove : undefined}
          onDelete={modalTask ? handleDelete : undefined}
        />
      )}
    </>
  );
}