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
import type { Task, BoardColumn, UserSummary } from '../../types';
import { tasksApi } from '../../api/tasks';
import { useProjectMembers } from '../../hooks/useProjectMembers';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

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
  columnName,
  isOver,
  children,
}: {
  columnName: string;
  isOver: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: columnName });

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
  columns: BoardColumn[];
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
  columns,
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
  const [defaultStatus, setDefaultStatus] = useState<string>(columns[0]?.name ?? 'TODO');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Build column name set for detecting orphaned tasks
  const columnNames = new Set(columns.map((c) => c.name));

  const tasksByColumn = (colName: string) =>
    tasks.filter((t) => t.status === colName).sort((a, b) => a.position - b.position);

  // Orphaned tasks (status doesn't match any column)
  const orphanedTasks = tasks.filter((t) => !columnNames.has(t.status));

  const openCreate = (status: string) => {
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

  const handleMove = async (status: string) => {
    if (!modalTask) return;
    const colTasks = tasksByColumn(status);
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
    setOverColumn((event.over?.id as string) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setOverColumn(null);

    if (!over || !canMove) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;
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

  const renderColumn = (colName: string, color: string, colTasks: Task[], showCreate: boolean) => {
    const isOver = overColumn === colName;
    return (
      <div
        key={colName}
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
          borderBottom: `2px solid ${color}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: color,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              {colName.replace(/_/g, ' ')}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: color,
              background: `${color}14`,
              borderRadius: 'var(--radius-pill)',
              padding: '1px 8px',
              lineHeight: '18px',
              minWidth: 22,
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
            }}>
              {colTasks.length}
            </span>
          </div>

          {showCreate && !disableCreate && (
            <button
              onClick={() => openCreate(colName)}
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
        <DroppableArea columnName={colName} isOver={isOver}>
          {colTasks.length === 0 ? (
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
            colTasks.map((task) => (
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
          {/* Fallback "Uncategorized" column for orphaned tasks — always first */}
          {orphanedTasks.length > 0 &&
            renderColumn(
              t('projects.kanban.uncategorized'),
              '#6B7280',
              orphanedTasks.sort((a, b) => a.position - b.position),
              false,
            )
          }

          {columns.map((col) =>
            renderColumn(col.name, col.color, tasksByColumn(col.name), true)
          )}
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
          columns={columns}
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