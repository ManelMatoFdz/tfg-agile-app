import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import type { Task, TaskStatus, UserSummary } from '../../types';
import { tasksApi } from '../../api/tasks';
import { useProjectMembers } from '../../hooks/useProjectMembers';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

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

// ── Draggable task card wrapper ───────────────────────────────────────────────

function DraggableCard({
  task,
  assignee,
  canDrag,
  onClick,
}: {
  task: Task;
  assignee?: UserSummary;
  canDrag: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !canDrag,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        opacity: isDragging ? 0.35 : 1,
        cursor: canDrag ? 'grab' : 'default',
        touchAction: 'none',
      }}
    >
      <TaskCard task={task} assignee={assignee} onClick={onClick} />
    </div>
  );
}

// ── Droppable column tasks area ───────────────────────────────────────────────

function DroppableArea({
  status,
  isOver,
  children,
}: {
  status: TaskStatus;
  isOver: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        padding: '0 0.375rem 0.375rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.3125rem',
        borderRadius: '0 0 var(--radius-md) var(--radius-md)',
        background: isOver ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.15s',
        minHeight: '3rem',
      }}
    >
      {children}
    </div>
  );
}

// ── KanbanBoard ───────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  onRefresh?: () => Promise<void>;
  disableCreate?: boolean;
  canMove?: boolean;
  canDelete?: boolean;
  readOnly?: boolean;
}

export default function KanbanBoard({
  projectId,
  tasks,
  onTasksChange,
  onRefresh,
  disableCreate = false,
  canMove = true,
  canDelete = true,
  readOnly = false,
}: Props) {
  const { t } = useTranslation();
  const { userMap } = useProjectMembers(projectId);
  const [modalTask, setModalTask] = useState<Task | null | undefined>(undefined);
  const [modalKey, setModalKey] = useState(0);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('TODO');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

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

  const openTaskModal = async (task: Task) => {
    setModalTask(task);
    setModalKey((k) => k + 1); // mount with cached data
    try {
      const fresh = await tasksApi.getById(task.id);
      if (JSON.stringify(fresh) !== JSON.stringify(task)) {
        setModalTask(fresh);
        setModalKey((k) => k + 1); // remount with fresh data — reinitializes form fields
        onTasksChange(tasks.map((t) => (t.id === fresh.id ? fresh : t)));
      }
    } catch {
      // keep cached data on error
    }
  };

  // ── Drag handlers ───────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverColumn((event.over?.id as TaskStatus) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setOverColumn(null);

    if (!over || !canMove) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const newPosition = tasks.filter((t) => t.status === newStatus).length;

    // Optimistic update
    const optimistic = tasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus, position: newPosition } : t,
    );
    onTasksChange(optimistic);

    try {
      const updated = await tasksApi.move(taskId, { status: newStatus, position: newPosition });
      onTasksChange(optimistic.map((t) => (t.id === updated.id ? updated : t)));
      // Silently refresh to pick up concurrent changes by other users
      onRefresh?.();
    } catch {
      onTasksChange(tasks); // revert on error
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setOverColumn(null);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div style={{ display: 'flex', gap: '0.625rem', overflowX: 'auto', paddingBottom: '0.5rem', alignItems: 'flex-start' }}>
          {COLUMNS.map(({ status }) => {
            const col = tasksByStatus(status);
            const accentColor = STATUS_COLOR[status];
            const isOver = overColumn === status;

            return (
              <div
                key={status}
                style={{
                  flexShrink: 0,
                  width: '15rem',
                  background: 'var(--bg-elevated)',
                  border: `0.0625rem solid ${isOver ? 'var(--border-strong)' : 'var(--border)'}`,
                  borderTop: `0.125rem solid ${accentColor}`,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '12.5rem',
                  transition: 'border-color 0.15s',
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

                {/* Droppable tasks area */}
                <DroppableArea status={status} isOver={isOver}>
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
                      <DraggableCard
                        key={task.id}
                        task={task}
                        assignee={task.assigneeId ? userMap[task.assigneeId] : undefined}
                        canDrag={canMove}
                        onClick={() => openTaskModal(task)}
                      />
                    ))
                  )}
                </DroppableArea>
              </div>
            );
          })}
        </div>

        {/* Ghost card shown while dragging */}
        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <div style={{ opacity: 0.9, transform: 'rotate(1.5deg)', cursor: 'grabbing' }}>
              <TaskCard
                task={activeTask}
                assignee={activeTask.assigneeId ? userMap[activeTask.assigneeId] : undefined}
                onClick={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {modalTask !== undefined && (
        <TaskModal
          key={modalKey}
          task={modalTask}
          projectId={projectId}
          defaultStatus={defaultStatus}
          readOnly={!!modalTask && readOnly}
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
