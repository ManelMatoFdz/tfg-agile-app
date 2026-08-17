import { useTranslation } from 'react-i18next';
import { BookOpen, CheckSquare, Bug, Lock, GitBranch } from 'lucide-react';
import type { Task, TaskPriority, TaskType } from '../../types';
import type { UserSummary } from '../../types';
import { AssigneeAvatar } from './AssigneePicker';

const TYPE_ICON: Record<TaskType, { icon: typeof BookOpen; color: string }> = {
  STORY: { icon: BookOpen, color: '#7C3AED' },
  TASK:  { icon: CheckSquare, color: '#2563EB' },
  BUG:   { icon: Bug, color: '#DC2626' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; border: string }> = {
  CRITICAL: { color: '#DC2626', border: '#DC2626' },
  HIGH:     { color: '#D97706', border: '#D97706' },
  MEDIUM:   { color: '#2563EB', border: '#2563EB' },
  LOW:      { color: 'var(--text-faint)', border: 'var(--border-strong)' },
};

interface Props {
  task: Task;
  assignee?: UserSummary;
  columnColor?: string;
  onClick: () => void;
}

export default function TaskCard({ task, assignee, columnColor, onClick }: Props) {
  const { t } = useTranslation();
  const taskLabels = task.labels ?? [];
  const hasFooter = !!assignee || taskLabels.length > 0;
  const config = PRIORITY_CONFIG[task.priority];
  const typeConfig = TYPE_ICON[task.type ?? 'TASK'];
  const TypeIcon = typeConfig.icon;
  const leftBorderColor = columnColor ?? config.border;
  const MAX_VISIBLE_LABELS = 3;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        display: 'block',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${leftBorderColor}`,
        borderRadius: 'var(--radius-card)',
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = 'var(--shadow-md)';
        el.style.borderColor = 'var(--border-strong)';
        el.style.borderLeftColor = leftBorderColor;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = 'var(--shadow-sm)';
        el.style.borderColor = 'var(--border)';
        el.style.borderLeftColor = leftBorderColor;
      }}
    >
      {/* Type + Priority badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <TypeIcon size={13} strokeWidth={2} style={{ color: typeConfig.color, flexShrink: 0 }} />
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
        </div>
        {task.storyPoints != null && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--accent-text)',
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

      {/* Epic badge + Blocked indicator + Git activity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: task.epicName || task.blockedByCount > 0 || task.gitEventCount > 0 ? 4 : 0 }}>
        {task.epicName && task.epicColor && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: task.epicColor,
            background: `${task.epicColor}14`,
            border: `1px solid ${task.epicColor}40`,
            borderRadius: 'var(--radius-sm)',
            padding: '1px 7px',
            maxWidth: '100%',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            lineHeight: '14px',
          }}>
            <span style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: task.epicColor,
              flexShrink: 0,
            }} />
            {task.epicName}
          </span>
        )}
        {task.blockedByCount > 0 && (
          <span
            title={t('tasks.card.blocked')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#DC2626',
              background: '#DC262608',
              border: '1px solid #DC262625',
              borderRadius: 'var(--radius-sm)',
              padding: '1px 7px',
              lineHeight: '14px',
            }}
          >
            <Lock size={8} strokeWidth={2.5} />
            {t('tasks.card.blocked')}
          </span>
        )}
        {task.gitEventCount > 0 && (
          <span
            title={t('tasks.card.gitEvents')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--text-muted)',
              background: 'var(--bg-hover)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '1px 7px',
              lineHeight: '14px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <GitBranch size={8} strokeWidth={2.5} />
            {task.gitEventCount}
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

      {/* Subtask progress indicator */}
      {task.subtaskCount > 0 && (() => {
        const pct = Math.round((task.completedSubtaskCount / task.subtaskCount) * 100);
        const allDone = task.completedSubtaskCount === task.subtaskCount;
        const barColor = allDone ? '#16A34A' : '#3B82F6';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <div style={{
              flex: 1,
              height: 4,
              background: 'var(--border)',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: barColor,
                borderRadius: 2,
                transition: 'width 300ms ease',
              }} />
            </div>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-faint)',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap',
            }}>
              {task.completedSubtaskCount}/{task.subtaskCount}
            </span>
          </div>
        );
      })()}

      {hasFooter && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', minWidth: 0 }}>
            {taskLabels.slice(0, MAX_VISIBLE_LABELS).map((lbl) => (
              <span
                key={lbl.id}
                style={{
                  display: 'inline-block',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: lbl.color,
                  background: `${lbl.color}14`,
                  border: `1px solid ${lbl.color}40`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '1px 8px',
                  whiteSpace: 'nowrap',
                  lineHeight: '16px',
                }}
              >
                {lbl.name}
              </span>
            ))}
            {taskLabels.length > MAX_VISIBLE_LABELS && (
              <span style={{
                fontSize: 10, fontWeight: 600, color: 'var(--text-faint)',
                padding: '2px 6px', background: 'var(--bg-hover)',
                borderRadius: 'var(--radius-sm)',
                lineHeight: '16px',
              }}>
                +{taskLabels.length - MAX_VISIBLE_LABELS}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {assignee && (
              <AssigneeAvatar
                name={assignee.fullName ?? assignee.username}
                avatarUrl={assignee.avatarUrl}
                size={22}
              />
            )}
          </div>
        </div>
      )}
    </button>
  );
}