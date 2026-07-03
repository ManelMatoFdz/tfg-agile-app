import { useTranslation } from 'react-i18next';
import type { Task, TaskPriority } from '../../types';
import type { UserSummary } from '../../types';
import { AssigneeAvatar } from './TaskModal';

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; border: string; icon: string }> = {
  CRITICAL: { color: '#DC2626', border: '#DC2626', icon: '!!' },
  HIGH:     { color: '#D97706', border: '#D97706', icon: '!' },
  MEDIUM:   { color: '#2563EB', border: '#2563EB', icon: '-' },
  LOW:      { color: '#94A3B8', border: '#CBD5E1', icon: '' },
};

interface Props {
  task: Task;
  assignee?: UserSummary;
  onClick: () => void;
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'DONE') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(task.dueDate) < today;
}

export default function TaskCard({ task, assignee, onClick }: Props) {
  const { t } = useTranslation();
  const overdue = isOverdue(task);
  const hasFooter = task.storyPoints != null || assignee || overdue;
  const config = PRIORITY_CONFIG[task.priority];

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        display: 'block',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${config.border}`,
        borderRadius: 'var(--radius-card)',
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = 'var(--shadow-md)';
        el.style.borderColor = 'var(--border-strong)';
        el.style.borderLeftColor = config.border;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = 'var(--shadow-sm)';
        el.style.borderColor = 'var(--border)';
        el.style.borderLeftColor = config.border;
      }}
    >
      {/* Priority badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: config.color,
          background: `${config.color}12`,
          borderRadius: 'var(--radius-sm)',
          padding: '1px 6px',
        }}>
          {t(`tasks.priority.${task.priority}`)}
        </span>
        {task.storyPoints != null && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--accent)',
            background: 'var(--accent-muted)',
            borderRadius: 'var(--radius-pill)',
            width: 24,
            height: 24,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {task.storyPoints}
          </span>
        )}
      </div>

      <p style={{
        margin: 0,
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--text)',
        lineHeight: 1.4,
        letterSpacing: '-0.01em',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {task.title}
      </p>

      {task.description && (
        <p style={{
          margin: '4px 0 0',
          fontSize: 12,
          color: 'var(--text-faint)',
          lineHeight: 1.35,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}>
          {task.description}
        </p>
      )}

      {hasFooter && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {overdue && (
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#DC2626',
                background: 'rgba(220,38,38,0.08)',
                borderRadius: 'var(--radius-pill)',
                padding: '2px 8px',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>
                {t('tasks.card.overdue')}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {assignee && (
              <AssigneeAvatar
                name={assignee.fullName ?? assignee.username}
                size={22}
              />
            )}
          </div>
        </div>
      )}
    </button>
  );
}