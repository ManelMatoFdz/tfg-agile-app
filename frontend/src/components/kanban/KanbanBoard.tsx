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

const STATUS_COLOR: Record<TaskStatus, { header: string; accent: string }> = {
  TODO:        { header: '#2563EB', accent: '#2563EB' },
  IN_PROGRESS: { header: '#D97706', accent: '#D97706' },
  IN_REVIEW:   { header: '#7C3AED', accent: '#7C3AED' },
  DONE:        { header: '#16A34A', accent: '#16A34A' },
};

const COLUMNS: { status: TaskStatus }[] = [
  { status: 'TODO'        },
  { status: 'IN_PROGRESS' },
  { status: 'IN_REVIEW'   },
  { status: 'DONE'        },
];

// -- Draggable task card wrapper --

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

// -- Droppable column tasks area --

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
        padding: '4px 8px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
        background: isOver ? 'var(--accent-muted)' : 'transparent',
        transition: 'background 0.15s ease',
        minHeight: 60,
      }}
    >
      {children}
    </div>
  );
}

// -- KanbanBoard --

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
    setModalKey((k) => k + 1);
    try {
      const fresh = await tasksApi.getById(task.id);
      if (JSON.stringify(fresh) !== JSON.stringify(task)) {
        setModalTask(fresh);
        setModalKey((k) => k + 1);
        onTasksChange(tasks.map((t) => (t.id === fresh.id ? fresh : t)));
      }
    } catch {
      // keep cached data on error
    }
  };

  // -- Drag handlers --

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
      onRefresh?.();
    } catch {
      onTasksChange(tasks);
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
        <div className="stagger-children" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
          {COLUMNS.map(({ status }) => {
            const col = tasksByStatus(status);
            const colors = STATUS_COLOR[status];
            const isOver = overColumn === status;

            return (
              <div
                key={status}
                style={{
                  flexShrink: 0,
                  width: 272,
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${isOver ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 200,
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  boxShadow: isOver ? '0 0 0 2px var(--accent-muted)' : 'var(--shadow-sm)',
                }}
              >
                {/* Column header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px 10px',
                  borderBottom: `2px solid ${colors.accent}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: colors.header,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}>
                      {t(`tasks.status.${status}`)}
                    </span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: colors.header,
                      background: `${colors.accent}14`,
                      borderRadius: 'var(--radius-pill)',
                      padding: '1px 8px',
                      lineHeight: '18px',
                      minWidth: 22,
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {col.length}
                    </span>
                  </div>

                  {!disableCreate && (
                    <button
                      onClick={() => openCreate(status)}
                      title={t('projects.kanban.newTask')}
                      style={{
                        width: 26,
                        height: 26,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        background: 'transparent',
                        color: 'var(--text-faint)',
                        cursor: 'pointer',
                        transition: 'background 150ms, color 150ms',
                        padding: 0,
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget;
                        el.style.background = 'var(--bg-hover)';
                        el.style.color = 'var(--text)';
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget;
                        el.style.background = 'transparent';
                        el.style.color = 'var(--text-faint)';
                      }}
                    >
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                  )}
                </div>

                {/* Droppable tasks area */}
                <DroppableArea status={status} isOver={isOver}>
                  {col.length === 0 ? (
                    <p style={{
                      margin: 0,
                      fontSize: 12,
                      color: 'var(--text-faint)',
                      textAlign: 'center',
                      padding: '24px 0',
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
            <div style={{
              opacity: 0.92,
              transform: 'scale(1.03) rotate(1.5deg)',
              cursor: 'grabbing',
              boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
              borderRadius: 'var(--radius-card)',
            }}>
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