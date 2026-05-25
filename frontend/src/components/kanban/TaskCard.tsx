import { useTranslation } from 'react-i18next';
import type { Task, TaskPriority } from '../../types';
import type { UserSummary } from '../../types';
import { AssigneeAvatar } from './TaskModal';

/* Priority → left-border color (theme-independent) */
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f59e0b',
  MEDIUM:   '#3b82f6',
  LOW:      '#9ca3af',
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

  return (
    <button
      onClick={onClick}
      style={{
        width:           '100%',
        textAlign:       'left',
        display:         'block',
        background:      'var(--bg-elevated)',
        border:          '1px solid var(--border)',
        borderLeft:      `0.125rem solid ${PRIORITY_COLOR[task.priority]}`,
        borderRadius:    'var(--radius-sm)',
        padding:         '0.4375rem 0.625rem',
        cursor:          'pointer',
        transition:      `background var(--duration), border-color var(--duration)`,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background    = 'var(--bg-hover)';
        el.style.borderColor   = `var(--border-strong)`;
        el.style.borderLeftColor = PRIORITY_COLOR[task.priority];
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background    = 'var(--bg-elevated)';
        el.style.borderColor   = 'var(--border)';
        el.style.borderLeftColor = PRIORITY_COLOR[task.priority];
      }}
    >
      {/* Title */}
      <p style={{
        margin:       0,
        fontSize:     '0.75rem',
        fontWeight:   500,
        color:        'var(--text)',
        lineHeight:   1.4,
        letterSpacing: '-0.01em',
        overflow:     'hidden',
        display:      '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {task.title}
      </p>

      {/* Description — 1 line only */}
      {task.description && (
        <p style={{
          margin:      '0.125rem 0 0',
          fontSize:    '0.6875rem',
          color:       'var(--text-faint)',
          lineHeight:  1.35,
          overflow:    'hidden',
          whiteSpace:  'nowrap',
          textOverflow: 'ellipsis',
        }}>
          {task.description}
        </p>
      )}

      {/* Footer */}
      {hasFooter && (
        <div style={{ marginTop: '0.3125rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {overdue && (
              <span style={{
                fontSize:    '0.5625rem',
                fontWeight:  700,
                color:       '#ef4444',
                background:  'rgba(239,68,68,0.08)',
                border:      '1px solid rgba(239,68,68,0.25)',
                borderRadius: 'var(--radius-sm)',
                padding:     '0 0.25rem',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                whiteSpace:  'nowrap',
              }}>
                {t('tasks.card.overdue')}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
            {task.storyPoints != null && (
              <span style={{
                fontFamily:  'var(--font-mono)',
                fontSize:    '0.625rem',
                fontWeight:  600,
                color:       'var(--text-faint)',
                background:  'var(--bg-hover)',
                border:      '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding:     '0.0625rem 0.3125rem',
                letterSpacing: 0,
              }}>
                {task.storyPoints}
              </span>
            )}
            {assignee && (
              <AssigneeAvatar
                name={assignee.fullName ?? assignee.username}
                size={18}
              />
            )}
          </div>
        </div>
      )}
    </button>
  );
}