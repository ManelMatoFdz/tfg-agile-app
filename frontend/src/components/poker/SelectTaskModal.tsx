import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search } from 'lucide-react';
import { tasksApi } from '../../api/tasks';
import type { Task, TaskPriority } from '../../types';

const PRIORITY_COLOR: Record<TaskPriority, { color: string; bg: string }> = {
  CRITICAL: { color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
  HIGH: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  MEDIUM: { color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
  LOW: { color: '#94A3B8', bg: '#EDF0F4' },
};

interface Props {
  projectId: string;
  onClose: () => void;
  onSelect: (task: Task) => void | Promise<void>;
}

export default function SelectTaskModal({ projectId, onClose, onSelect }: Props) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    tasksApi.getByProject(projectId)
      .then((allTasks) => {
        setTasks(allTasks.filter((t) => t.status !== 'DONE' && !t.parentId));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleSelect = async (task: Task) => {
    setSubmitting(true);
    try {
      await onSelect(task);
      onClose();
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15,23,42,0.4)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'fade-in 200ms ease both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          margin: '0 16px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid #E2E8F0',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Search size={16} style={{ color: '#2563EB' }} />
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1E293B' }}>
              {t('poker.room.selectTask')}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, border: 'none', background: 'transparent',
              borderRadius: 8, cursor: 'pointer', color: '#94A3B8',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#EDF0F4'; e.currentTarget.style.color = '#1E293B'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div style={{
                width: 28, height: 28,
                border: '3px solid #E2E8F0',
                borderTopColor: '#2563EB',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
            </div>
          ) : tasks.length === 0 ? (
            <p style={{ fontSize: 14, color: '#94A3B8', padding: '40px 0', textAlign: 'center' }}>
              {t('poker.room.noTasks')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tasks.map((task) => {
                const pc = PRIORITY_COLOR[task.priority];
                return (
                  <button
                    key={task.id}
                    onClick={() => handleSelect(task)}
                    disabled={submitting}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 14px',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.5 : 1,
                      fontFamily: 'inherit',
                      transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!submitting) {
                        e.currentTarget.style.borderColor = '#2563EB';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.08)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.title}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {task.storyPoints != null && (
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: '#2563EB',
                            background: 'rgba(37,99,235,0.08)',
                            padding: '2px 8px',
                            borderRadius: 999,
                          }}>
                            {task.storyPoints} SP
                          </span>
                        )}
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: pc.color,
                          background: pc.bg,
                          padding: '2px 8px',
                          borderRadius: 999,
                        }}>
                          {t(`tasks.priority.${task.priority}`)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end',
          padding: '14px 24px', borderTop: '1px solid #E2E8F0',
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px', fontSize: 13, fontWeight: 500,
              color: '#64748B', background: 'transparent',
              border: '1px solid #E2E8F0', borderRadius: 8,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#EDF0F4'; e.currentTarget.style.color = '#1E293B'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}