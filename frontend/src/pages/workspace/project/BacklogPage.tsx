import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, ClipboardList, Search } from 'lucide-react';
import type { Task, TaskPriority, TaskStatus } from '../../../types';
import { sprintsApi } from '../../../api/sprints';
import { tasksApi } from '../../../api/tasks';
import type { CreateTaskDto, UpdateTaskDto } from '../../../api/tasks';
import TaskModal from '../../../components/kanban/TaskModal';
import Alert from '../../../components/ui/Alert';
import PageTitle from '../../../components/motion/PageTitle';
import { useProjectMember } from '../../../hooks/useProjectMember';

const PRIORITY_ORDER: TaskPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; bg: string; border: string }> = {
  CRITICAL: { color: '#DC2626', bg: 'rgba(220,38,38,0.06)', border: '#DC2626' },
  HIGH:     { color: '#D97706', bg: 'rgba(217,119,6,0.06)', border: '#D97706' },
  MEDIUM:   { color: '#2563EB', bg: 'rgba(37,99,235,0.06)', border: '#2563EB' },
  LOW:      { color: '#94A3B8', bg: 'var(--bg-hover)',       border: '#CBD5E1' },
};

const STATUS_CONFIG: Record<TaskStatus, { color: string; dot: string }> = {
  TODO:        { color: '#94A3B8', dot: '#94A3B8' },
  IN_PROGRESS: { color: '#2563EB', dot: '#2563EB' },
  IN_REVIEW:   { color: '#7C3AED', dot: '#7C3AED' },
  DONE:        { color: '#16A34A', dot: '#16A34A' },
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PageTitle as="h2" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {t('projects.backlog.title')}
            </PageTitle>
            {!loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '2px 10px',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {tasks.length} {tasks.length === 1 ? 'item' : 'items'}
                </span>
                {totalPoints > 0 && (
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--accent)',
                    background: 'var(--accent-muted)',
                    borderRadius: 'var(--radius-pill)',
                    padding: '2px 10px',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {totalPoints} pts
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {canCreateTask && (
          <button
            onClick={() => setModalTask(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              background: 'var(--accent)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'background 150ms',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            <Plus size={15} strokeWidth={2.5} />
            {t('projects.backlog.newTask')}
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: 28,
            height: 28,
            border: '3px solid var(--border)',
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
          padding: '64px 32px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            width: 56,
            height: 56,
            background: 'var(--accent-muted)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <ClipboardList size={24} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
            {t('projects.backlog.noTasks')}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            {t('projects.backlog.noTasksSubtitle')}
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {/* Table header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            background: 'var(--bg)',
            borderBottom: '1px solid var(--border)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
          }}>
            <span style={{ flex: 1 }}>{t('tasks.modal.titleField')}</span>
            <span style={{ width: 90, textAlign: 'center' }}>{t('tasks.modal.priority')}</span>
            <span style={{ width: 60, textAlign: 'center' }}>Pts</span>
            <span style={{ width: 90, textAlign: 'center' }}>{t('tasks.modal.status')}</span>
          </div>

          {PRIORITY_ORDER.map((priority) => {
            const group = tasksByPriority(priority);
            if (group.length === 0) return null;
            const pConfig = PRIORITY_CONFIG[priority];
            return (
              <div key={priority}>
                {/* Priority group header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  background: pConfig.bg,
                  borderBottom: '1px solid var(--border)',
                  borderLeft: `3px solid ${pConfig.border}`,
                }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: pConfig.color,
                  }}>
                    {t(`tasks.priority.${priority}`)}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: pConfig.color,
                    background: `${pConfig.color}18`,
                    borderRadius: 'var(--radius-pill)',
                    padding: '0 8px',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {group.length}
                  </span>
                </div>

                {/* Task rows */}
                {group.map((task, idx) => (
                  <button
                    key={task.id}
                    onClick={() => canEditBacklogTask && setModalTask(task)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                      cursor: canEditBacklogTask ? 'pointer' : 'default',
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={e => canEditBacklogTask && (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Title + description */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: 0,
                        fontSize: 13,
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
                          margin: '2px 0 0',
                          fontSize: 12,
                          color: 'var(--text-faint)',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}>
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Priority badge */}
                    <span style={{
                      width: 90,
                      textAlign: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: pConfig.color,
                      background: `${pConfig.color}12`,
                      borderRadius: 'var(--radius-pill)',
                      padding: '3px 8px',
                      flexShrink: 0,
                    }}>
                      {t(`tasks.priority.${task.priority}`)}
                    </span>

                    {/* Story points */}
                    <div style={{ width: 60, textAlign: 'center', flexShrink: 0 }}>
                      {task.storyPoints != null ? (
                        <span style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--accent)',
                          background: 'var(--accent-muted)',
                          borderRadius: 'var(--radius-pill)',
                          padding: '2px 8px',
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {task.storyPoints}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>--</span>
                      )}
                    </div>

                    {/* Status */}
                    <div style={{ width: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, flexShrink: 0 }}>
                      <span style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: STATUS_CONFIG[task.status].dot,
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: STATUS_CONFIG[task.status].color,
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {t(`tasks.status.${task.status}`)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}

          {/* Footer stats */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 500 }}>Total:</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{tasks.length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 500 }}>Points:</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{totalPoints}</span>
            </div>
          </div>
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