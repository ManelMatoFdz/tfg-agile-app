import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, ClipboardList } from 'lucide-react';
import type { Task, TaskPriority, TaskStatus } from '../../../types';
import { sprintsApi } from '../../../api/sprints';
import { tasksApi } from '../../../api/tasks';
import type { CreateTaskDto, UpdateTaskDto } from '../../../api/tasks';
import TaskModal from '../../../components/kanban/TaskModal';
import Alert from '../../../components/ui/Alert';
import { useProjectMember } from '../../../hooks/useProjectMember';

const PRIORITY_ORDER: TaskPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/* Theme-independent hex values (same palette as TaskCard) */
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f59e0b',
  MEDIUM:   '#3b82f6',
  LOW:      '#9ca3af',
};

const PRIORITY_BG: Record<TaskPriority, string> = {
  CRITICAL: 'rgba(239,68,68,0.08)',
  HIGH:     'rgba(245,158,11,0.08)',
  MEDIUM:   'rgba(59,130,246,0.08)',
  LOW:      'rgba(156,163,175,0.08)',
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  TODO:        '#9ca3af',
  IN_PROGRESS: '#3b82f6',
  IN_REVIEW:   '#f59e0b',
  DONE:        '#22c55e',
};

export default function BacklogPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();

  const { canCreateTask, canEditBacklogTask, canDeleteBacklogTask } = useProjectMember(projectId);

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


  const handleDelete = async () => {
    if (!modalTask) return;
    await tasksApi.delete(modalTask.id);
    setTasks((prev) => prev.filter((t) => t.id !== modalTask.id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.015em' }}>
            {t('projects.backlog.title')}
          </h2>
          {!loading && (
            <>
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--text-faint)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '1px 6px',
                fontFamily: 'var(--font-mono)',
              }}>
                {tasks.length}
              </span>
              {totalPoints > 0 && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--accent)',
                  background: 'var(--accent-muted)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1px 6px',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {totalPoints} pts
                </span>
              )}
            </>
          )}
        </div>

        {canCreateTask && (
          <button
            onClick={() => setModalTask(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              fontSize: 12,
              fontWeight: 500,
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: `background var(--duration)`,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            <Plus size={12} strokeWidth={2.5} />
            {t('projects.backlog.newTask')}
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: 24,
            height: 24,
            border: '2px solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : tasks.length === 0 ? (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 40,
            height: 40,
            background: 'var(--bg-hover)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <ClipboardList size={18} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
            {t('projects.backlog.noTasks')}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
            {t('projects.backlog.noTasksSubtitle')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PRIORITY_ORDER.map((priority) => {
            const group = tasksByPriority(priority);
            if (group.length === 0) return null;
            return (
              <div
                key={priority}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderLeft: `2px solid ${PRIORITY_COLOR[priority]}`,
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}
              >
                {/* Priority group header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  background: PRIORITY_BG[priority],
                  borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: PRIORITY_COLOR[priority],
                  }}>
                    {t(`tasks.priority.${priority}`)}
                  </span>
                  <span style={{
                    fontSize: 10,
                    color: 'var(--text-faint)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                  }}>
                    {group.length}
                  </span>
                </div>

                {/* Task rows */}
                <div>
                  {group.map((task, idx) => (
                    <button
                      key={task.id}
                      onClick={() => canEditBacklogTask && setModalTask(task)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        background: 'transparent',
                        border: 'none',
                        borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                        cursor: canEditBacklogTask ? 'pointer' : 'default',
                        transition: `background var(--duration)`,
                      }}
                      onMouseEnter={e => canEditBacklogTask && (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Title + description */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: 0,
                          fontSize: 12,
                          fontWeight: 500,
                          color: 'var(--text)',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p style={{
                            margin: '1px 0 0',
                            fontSize: 11,
                            color: 'var(--text-faint)',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                          }}>
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Status */}
                      <span style={{
                        flexShrink: 0,
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: STATUS_COLOR[task.status],
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {t(`tasks.status.${task.status}`)}
                      </span>

                      {/* Story points */}
                      {task.storyPoints != null ? (
                        <span style={{
                          flexShrink: 0,
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'var(--text-faint)',
                          background: 'var(--bg-hover)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '1px 5px',
                          fontFamily: 'var(--font-mono)',
                          minWidth: 28,
                          textAlign: 'center',
                        }}>
                          {task.storyPoints}
                        </span>
                      ) : (
                        <span style={{ flexShrink: 0, width: 28 }} />
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
          onMove={undefined}
          onDelete={modalTask && canDeleteBacklogTask ? handleDelete : undefined}
        />
      )}
    </div>
  );
}
