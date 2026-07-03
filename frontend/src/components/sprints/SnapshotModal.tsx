import { useTranslation } from 'react-i18next';
import { X, Archive } from 'lucide-react';
import type { SprintTaskSnapshot, TaskPriority, TaskStatus } from '../../types';

const STATUS_COLOR: Record<TaskStatus, string> = {
  TODO:        'var(--text-faint)',
  IN_PROGRESS: 'var(--ink-blue)',
  IN_REVIEW:   'var(--ochre)',
  DONE:        'var(--success)',
};

const PRIORITY_STYLE: Record<TaskPriority, { color: string; bg: string }> = {
  CRITICAL: { color: 'var(--danger)', bg: 'var(--danger-bg)' },
  HIGH:     { color: 'var(--ochre)', bg: 'var(--warning-bg)' },
  MEDIUM:   { color: 'var(--ink-blue)', bg: 'var(--info-bg)' },
  LOW:      { color: 'var(--text-faint)', bg: 'var(--bg-hover)' },
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 4,
};

interface Props {
  snapshot: SprintTaskSnapshot;
  onClose: () => void;
}

export default function SnapshotModal({ snapshot, onClose }: Props) {
  const { t } = useTranslation();
  const pStyle = PRIORITY_STYLE[snapshot.priority];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        backgroundColor: 'var(--bg-overlay)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        animation: 'fade-in 200ms ease both',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-md)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 12px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {t('tasks.modal.titleView')}
          </h2>
          <button
            onClick={onClose}
            style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', display: 'flex' }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Returned to backlog banner */}
          {snapshot.returnedToBacklog && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--ochre-soft)', border: '1px solid var(--ochre)',
              borderRadius: 'var(--radius-sm)', padding: '7px 10px',
            }}>
              <Archive size={12} strokeWidth={2} style={{ color: 'var(--ochre)', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 11, color: 'var(--ochre)' }}>
                {t('projects.sprints.report.returnedBanner')}
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label style={labelStyle}>{t('tasks.modal.titleField')}</label>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 }}>
              {snapshot.title}
            </p>
          </div>

          {/* Description */}
          {snapshot.description && (
            <div>
              <label style={labelStyle}>{t('tasks.modal.description')}</label>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {snapshot.description}
              </p>
            </div>
          )}

          {/* Meta row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>{t('tasks.modal.priority')}</label>
              <span style={{
                display: 'inline-block', fontSize: 11, fontWeight: 600,
                color: pStyle.color, background: pStyle.bg,
                border: `1px solid ${pStyle.color}33`,
                borderRadius: 'var(--radius-sm)', padding: '2px 8px',
              }}>
                {t(`tasks.priority.${snapshot.priority}`)}
              </span>
            </div>
            <div>
              <label style={labelStyle}>{t('tasks.modal.status')}</label>
              <span style={{
                display: 'inline-block', fontSize: 11, fontWeight: 600,
                color: STATUS_COLOR[snapshot.statusAtEnd],
                background: `${STATUS_COLOR[snapshot.statusAtEnd]}15`,
                border: `1px solid ${STATUS_COLOR[snapshot.statusAtEnd]}33`,
                borderRadius: 'var(--radius-sm)', padding: '2px 8px',
              }}>
                {t(`tasks.status.${snapshot.statusAtEnd}`)}
              </span>
            </div>
            <div>
              <label style={labelStyle}>{t('tasks.modal.storyPoints')}</label>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                {snapshot.storyPoints != null ? `${snapshot.storyPoints} pts` : '—'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 18px 14px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', fontSize: 12, fontWeight: 500,
              background: 'var(--accent)', color: 'var(--accent-fg)',
              border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}