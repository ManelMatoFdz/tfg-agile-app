import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Task, TaskStatus } from '../../types';
import { tasksApi } from '../../api/tasks';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

const COLUMNS: { status: TaskStatus; label: string; dot: string; header: string }[] = [
  { status: 'TODO',        label: 'TODO',        dot: 'bg-gray-400',    header: 'border-t-gray-300' },
  { status: 'IN_PROGRESS', label: 'IN_PROGRESS',  dot: 'bg-blue-500',    header: 'border-t-blue-400' },
  { status: 'IN_REVIEW',   label: 'IN_REVIEW',    dot: 'bg-amber-400',   header: 'border-t-amber-400' },
  { status: 'DONE',        label: 'DONE',         dot: 'bg-emerald-500', header: 'border-t-emerald-500' },
];

interface Props {
  projectId: string;
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  disableCreate?: boolean;
  canMove?: boolean;
  canDelete?: boolean;
}

export default function KanbanBoard({ projectId, tasks, onTasksChange, disableCreate = false, canMove = true, canDelete = true }: Props) {
  const { t } = useTranslation();
  const [modalTask, setModalTask] = useState<Task | null | undefined>(undefined);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('TODO');

  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

  const openCreate = (status: TaskStatus) => {
    setDefaultStatus(status);
    setModalTask(null);
  };

  const handleSave = async (dto: Parameters<typeof tasksApi.create>[1] | Parameters<typeof tasksApi.update>[1]) => {
    if (modalTask) {
      const updated = await tasksApi.update(modalTask.id, dto as Parameters<typeof tasksApi.update>[1]);
      onTasksChange(tasks.map((t) => (t.id === updated.id ? updated : t)));
    } else {
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
        {COLUMNS.map(({ status, dot, header }) => {
          const col = tasksByStatus(status);
          return (
            <div
              key={status}
              className={`flex-shrink-0 w-64 bg-gray-50/70 rounded-xl border border-gray-200 border-t-2 ${header} flex flex-col`}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    {t(`tasks.status.${status}`)}
                  </p>
                  <span className="text-xs font-semibold text-gray-400 bg-white border border-gray-200 w-5 h-5 rounded-full flex items-center justify-center leading-none">
                    {col.length}
                  </span>
                </div>
                {!disableCreate && (
                  <button
                    onClick={() => openCreate(status)}
                    title={t('projects.kanban.newTask')}
                    className="w-6 h-6 rounded-md text-gray-400 hover:text-primary-600 hover:bg-white hover:border hover:border-gray-200 transition-all duration-150 cursor-pointer flex items-center justify-center"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Tasks */}
              <div className="flex-1 px-2 pb-2 space-y-1.5 min-h-[120px]">
                {col.length === 0 ? (
                  <p className="text-xs text-gray-300 text-center py-6">{t('projects.kanban.noTasks')}</p>
                ) : (
                  col.map((task) => (
                    <TaskCard key={task.id} task={task} onClick={() => setModalTask(task)} />
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
          onSave={modalTask ? (canMove ? handleSave : undefined) : handleSave}
          onMove={modalTask && canMove ? handleMove : undefined}
          onDelete={modalTask && canDelete ? handleDelete : undefined}
        />
      )}
    </>
  );
}
