import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckSquare } from 'lucide-react';
import type { Task, TaskPriority, TaskStatus } from '../types';
import { tasksApi } from '../api/tasks';
import Alert from '../components/ui/Alert';

const STATUS_ORDER: TaskStatus[] = ['IN_PROGRESS', 'IN_REVIEW', 'TODO', 'DONE'];

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

export default function MyTasksPage() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tasksApi
      .myTasks()
      .then(setTasks)
      .catch(() => setError(t('myTasks.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  const tasksByStatus = (status: TaskStatus) =>
    tasks
      .filter((task) => task.status === status)
      .sort((a, b) => {
        const priorityOrder: Record<TaskPriority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

  const activeTasks = tasks.filter((t) => t.status !== 'DONE').length;

  return (
    <div style={{ maxWidth: '40rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.015em' }}>
            {t('myTasks.title')}
          </h1>
          {!loading && tasks.length > 0 && (
            <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--text-faint)' }}>
              {activeTasks > 0
                ? t('myTasks.activeSummary', { count: activeTasks })
                : t('myTasks.allDone')}
            </p>
          )}
        </div>
        {!loading && (
          <span style={{
            fontSize: '0.6875rem',
            fontWeight: 500,
            color: 'var(--text-faint)',
            background: 'var(--bg-elevated)',
            border: '0.0625rem solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.0625rem 0.4375rem',
            fontFamily: 'var(--font-mono)',
          }}>
            {tasks.length}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
          <div style={{
            width: '1.5rem', height: '1.5rem',
            border: '0.125rem solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : tasks.length === 0 ? (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '0.0625rem solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '3rem 1.5rem',
          textAlign: 'center',
        }}>
          <div style={{
            width: '2.75rem', height: '2.75rem',
            background: 'var(--accent-muted)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 0.75rem',
          }}>
            <CheckSquare size={20} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
          </div>
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)' }}>{t('myTasks.empty')}</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-faint)' }}>{t('myTasks.emptySubtitle')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {STATUS_ORDER.map((status) => {
            const group = tasksByStatus(status);
            if (group.length === 0) return null;
            return (
              <div
                key={status}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '0.0625rem solid var(--border)',
                  borderLeft: `0.125rem solid ${STATUS_COLOR[status]}`,
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}
              >
                {/* Group header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  background: `${STATUS_COLOR[status]}10`,
                  borderBottom: '0.0625rem solid var(--border)',
                }}>
                  <span style={{
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: STATUS_COLOR[status],
                  }}>
                    {t(`tasks.status.${status}`)}
                  </span>
                  <span style={{ fontSize: '0.625rem', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {group.length}
                  </span>
                </div>

                {/* Task rows */}
                <div>
                  {group.map((task, idx) => (
                    <div
                      key={task.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.625rem',
                        padding: '0.5rem 0.75rem',
                        borderTop: idx > 0 ? '0.0625rem solid var(--border)' : 'none',
                      }}
                    >
                      {/* Priority */}
                      <span style={{
                        flexShrink: 0,
                        fontSize: '0.5625rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: PRIORITY_COLOR[task.priority],
                        background: PRIORITY_BG[task.priority],
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.0625rem 0.3125rem',
                      }}>
                        {t(`tasks.priority.${task.priority}`)}
                      </span>

                      {/* Title + description */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: 0, fontSize: '0.75rem', fontWeight: 500, color: 'var(--text)',
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        }}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p style={{
                            margin: '0.0625rem 0 0', fontSize: '0.6875rem', color: 'var(--text-faint)',
                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                          }}>
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Story points */}
                      {task.storyPoints != null ? (
                        <span style={{
                          flexShrink: 0,
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          color: 'var(--text-faint)',
                          background: 'var(--bg-hover)',
                          border: '0.0625rem solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.0625rem 0.3125rem',
                          fontFamily: 'var(--font-mono)',
                          minWidth: '1.75rem',
                          textAlign: 'center',
                        }}>
                          {task.storyPoints}
                        </span>
                      ) : (
                        <span style={{ flexShrink: 0, width: '1.75rem' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}