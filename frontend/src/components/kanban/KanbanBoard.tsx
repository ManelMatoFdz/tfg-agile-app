import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { AxiosError } from 'axios';
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
import type { Task, BoardColumn, UserSummary, TaskPriority } from '../../types';
import { tasksApi } from '../../api/tasks';

const PRIORITY_ORDER: Record<TaskPriority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
import { useProjectMembers } from '../../hooks/useProjectMembers';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal';

// -- Draggable task card wrapper --

function DraggableCard({
  task,
  assignee,
  columnColor,
  canDrag,
  onClick,
}: {
  task: Task;
  assignee?: UserSummary;
  columnColor?: string;
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
      <TaskCard task={task} assignee={assignee} columnColor={columnColor} onClick={onClick} />
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
  onError?: (msg: string) => void;
  disableCreate?: boolean;
  canMove?: boolean;
}

export default function KanbanBoard({
  projectId,
  tasks,
  columns,
  onTasksChange,
  onRefresh,
  onError,
  disableCreate = false,
  canMove = true,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { userMap } = useProjectMembers(projectId);
  const [creating, setCreating] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ task: Task; newStatus: string; newPosition: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Build column name set for detecting orphaned tasks
  const columnNames = new Set(columns.map((c) => c.name));

  const tasksByColumn = (colName: string) =>
    tasks.filter((t) => t.status === colName).sort((a, b) =>
      (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) || a.position - b.position
    );

  // Orphaned tasks (status doesn't match any column)
  const orphanedTasks = tasks.filter((t) => !columnNames.has(t.status));

  const openTask = (task: Task) =>
    navigate(
      `/workspaces/${workspaceId}/projects/${task.projectId ?? projectId}/tasks/${task.id}`,
      { state: { from: location.pathname + location.search, task } },
    );

  // -- Drag handlers --

  const executeMove = useCallback(async (task: Task, newStatus: string, newPosition: number) => {
    const taskId = task.id;
    const optimistic = tasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus, position: newPosition } : t,
    );
    onTasksChange(optimistic);

    try {
      const updated = await tasksApi.move(taskId, { status: newStatus, position: newPosition });
      onTasksChange(optimistic.map((t) => (t.id === updated.id ? updated : t)));
      onRefresh?.();
    } catch (err) {
      onTasksChange(tasks);
      const axiosErr = err as AxiosError<{ message?: string }>;
      const msg = axiosErr.response?.data?.message ?? '';
      if (msg.startsWith('WIP_LIMIT_EXCEEDED:') && onError) {
        const parts = msg.split(':');
        onError(t('projects.boardSettings.errorWipExceeded', {
          column: (parts[1] ?? '').replace(/_/g, ' '),
          current: parts[2] ?? '?',
          limit: parts[3] ?? '?',
        }));
      }
    }
  }, [tasks, onTasksChange, onRefresh, onError, t]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverColumn((event.over?.id as string) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setOverColumn(null);

    if (!over || !canMove) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const newPosition = tasks.filter((t) => t.status === newStatus).length;

    if (task.blockedByCount > 0) {
      setPendingMove({ task, newStatus, newPosition });
      return;
    }

    void executeMove(task, newStatus, newPosition);
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
          flex: '1 0 280px',
          minWidth: 280,
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
              onClick={() => setCreating(true)}
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
                columnColor={color}
                canDrag={canMove}
                onClick={() => openTask(task)}
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
              'var(--text-muted)',
              orphanedTasks.sort((a, b) =>
              (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) || a.position - b.position
            ),
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
                columnColor={columns.find((c) => c.name === activeTask.status)?.color}
                onClick={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {creating && (
        <CreateTaskModal
          projectId={projectId}
          onCreated={(created) => onTasksChange([...tasks, created])}
          onClose={() => setCreating(false)}
        />
      )}

      {pendingMove && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setPendingMove(null)}
        >
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 28px',
              maxWidth: 420,
              width: '90%',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>🔒</span>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {t('tasks.card.blockedMoveTitle')}
              </h3>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {t('tasks.card.blockedMoveBody', { count: pendingMove.task.blockedByCount })}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPendingMove(null)}
                style={{
                  padding: '7px 16px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                {t('tasks.card.blockedMoveCancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const { task, newStatus, newPosition } = pendingMove;
                  setPendingMove(null);
                  void executeMove(task, newStatus, newPosition);
                }}
                style={{
                  padding: '7px 16px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                {t('tasks.card.blockedMoveConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}