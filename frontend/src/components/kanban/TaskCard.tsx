import type { Task, TaskPriority } from '../../types';

/* Priority → left-border color (theme-independent) */
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f59e0b',
  MEDIUM:   '#3b82f6',
  LOW:      '#9ca3af',
};

interface Props {
  task: Task;
  onClick: () => void;
}

export default function TaskCard({ task, onClick }: Props) {
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

      {/* Footer — only shown if there's metadata */}
      {task.storyPoints != null && (
        <div style={{ marginTop: '0.3125rem', display: 'flex', justifyContent: 'flex-end' }}>
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
        </div>
      )}
    </button>
  );
}
