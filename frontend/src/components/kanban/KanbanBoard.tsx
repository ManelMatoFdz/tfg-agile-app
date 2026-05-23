import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import type { Task, TaskStatus } from '../../types';
import { tasksApi } from '../../api/tasks';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

/* Status → top accent color (theme-independent) */
const STATUS_COLOR: Record<TaskStatus, string> = {
  TODO:        '#9ca3af',
  IN_PROGRESS: '#3b82f6',
  IN_REVIEW:   '#f59e0b',
  DONE:        '#22c55e',
};

const COLUMNS: { status: TaskStatus }[] = [
  { status: 'TODO'        },
  { status: 'IN_PROGRESS' },
  { status: 'IN_REVIEW'   },
  { status: 'DONE'        },
];

interface Props {
  projectId: string;
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  disableCreate?: boolean;
  canMove?: boolean;
  canDelete?: boolean;
}

export default function KanbanBoard({
  projectId,
  tasks,
  onTasksChange,
  disableCreate = false,
  canMove = true,
  canDelete = true,
}: Props) {
  const { t } = useTranslation();
  const [modalTask, setModalTask] = useState<Task | null | undefined>(undefined);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('TODO');

  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

  const openCreate = (status: TaskStatus) => {
    setDefaultStatus(status);
    setModalTask(null);
  };

  const handleSave = async (
    dto: Parameters<typeof tasksApi.create>[1] | Parameters<typeof tasksApi.update>[1],
  ) => {
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
      <div style={{ display: 'flex', gap: '0.625rem', overflowX: 'auto', paddingBottom: '0.5rem', alignItems: 'flex-start' }}>
        {COLUMNS.map(({ status }) => {
          const col = tasksByStatus(status);
          const accentColor = STATUS_COLOR[status];
          return (
            <div
              key={status}
              style={{
                flexShrink: 0,
                width: '15rem',
                background: 'var(--bg-elevated)',
                border: '0.0625rem solid var(--border)',
                borderTop: `0.125rem solid ${accentColor}`,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '12.5rem',
              }}
            >
              {/* Column header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.625rem 0.375rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}>
                    {t(`tasks.status.${status}`)}
                  </span>
                  <span style={{
                    fontSize: '0.625rem',
                    fontWeight: 600,
                    color: 'var(--text-faint)',
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--bg-hover)',
                    border: '0.0625rem solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0 0.25rem',
                    lineHeight: '1rem',
                    minWidth: '1rem',
                    textAlign: 'center',
                  }}>
                    {col.length}
                  </span>
                </div>

                {!disableCreate && (
                  <button
                    onClick={() => openCreate(status)}
                    title={t('projects.kanban.newTask')}
                    style={{
                      width: '1.375rem',
                      height: '1.375rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      color: 'var(--text-faint)',
                      cursor: 'pointer',
                      transition: `background var(--duration), color var(--duration)`,
                      padding: 0,
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = 'var(--bg-hover)';
                      el.style.color = 'var(--text)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = 'transparent';
                      el.style.color = 'var(--text-faint)';
                    }}
                  >
                    <Plus size={12} strokeWidth={2.5} />
                  </button>
                )}
              </div>

              {/* Tasks */}
              <div style={{ flex: 1, padding: '0 0.375rem 0.375rem', display: 'flex', flexDirection: 'column', gap: '0.3125rem' }}>
                {col.length === 0 ? (
                  <p style={{
                    margin: 0,
                    fontSize: '0.6875rem',
                    color: 'var(--text-faint)',
                    textAlign: 'center',
                    padding: '1.25rem 0',
                  }}>
                    {t('projects.kanban.noTasks')}
                  </p>
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
          onSave={async (dto) => {
            if (modalTask && !canMove) return;
            await handleSave(dto);
          }}
          onMove={modalTask && canMove ? handleMove : undefined}
          onDelete={modalTask && canDelete ? handleDelete : undefined}
        />
      )}
    </>
  );
}
