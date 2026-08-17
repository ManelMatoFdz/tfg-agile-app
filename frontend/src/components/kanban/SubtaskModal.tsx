import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CornerDownRight } from 'lucide-react';
import type { Task, BoardColumn } from '../../types';
import type { UpdateTaskDto } from '../../api/tasks';
import { tasksApi } from '../../api/tasks';
import { useProjectMembers } from '../../hooks/useProjectMembers';
import { getStatusColor } from '../../hooks/useBoardColumns';
import { AssigneeAvatar, AssigneeDropdown } from './AssigneePicker';
import { sidebarLabel, fieldStyle, readOnlyFieldStyle, focusHandler, blurHandler } from './taskFieldStyles';

interface Props {
  subtask: Task;
  columns: BoardColumn[];
  readOnly?: boolean;
  onClose: () => void;
  onUpdated?: (updated: Task) => void;
  onDeleted?: (taskId: string) => void;
}

export default function SubtaskModal({ subtask, columns, readOnly = false, onClose, onUpdated, onDeleted }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(subtask.title);
  const [description, setDescription] = useState(subtask.description ?? '');
  const [assigneeId, setAssigneeId] = useState(subtask.assigneeId ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { members, userMap } = useProjectMembers(subtask.projectId);

  const doneStatuses = columns.filter(c => c.doneEquivalent).map(c => c.name);
  const isDone = doneStatuses.includes(subtask.status) || subtask.completedAt != null;

  const handleSave = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const dto: UpdateTaskDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority: subtask.priority,
        assigneeId: assigneeId || null,
      };
      const updated = await tasksApi.update(subtask.id, dto);
      onUpdated?.(updated);
      onClose();
    } catch {
      setError(t('tasks.modal.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDone = async () => {
    setLoading(true);
    try {
      const updated = await tasksApi.toggleSubtaskDone(subtask.id);
      onUpdated?.(updated);
      onClose();
    } catch {
      setError(t('tasks.modal.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await tasksApi.delete(subtask.id);
      onDeleted?.(subtask.id);
      onClose();
    } catch {
      setError(t('tasks.modal.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const statusColor = getStatusColor(subtask.status, columns);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fade-in 200ms ease both',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'scale-in var(--duration-panel) var(--ease-out) both',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CornerDownRight size={16} strokeWidth={2} style={{ color: '#2563EB' }} />
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {t('tasks.subtaskModal.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 'var(--radius-md)',
              border: 'none', background: 'transparent', color: 'var(--text-faint)',
              cursor: 'pointer', transition: 'color 150ms, background 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'visible', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{
              fontSize: 12, fontWeight: 500, color: '#DC2626',
              background: 'rgba(220,38,38,0.06)', borderLeft: '3px solid #DC2626',
              borderRadius: 'var(--radius-md)', padding: '8px 12px',
            }}>
              {error}
            </div>
          )}

          {/* Status toggle + badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 600, color: statusColor,
              background: `${statusColor}15`, border: `1px solid ${statusColor}33`,
              borderRadius: 'var(--radius-sm)', padding: '3px 9px',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }} />
              {subtask.status}
            </span>
            {!readOnly && (
              <button
                type="button"
                onClick={handleToggleDone}
                disabled={loading}
                style={{
                  fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)',
                  padding: '5px 12px', borderRadius: 'var(--radius-md)',
                  border: `1px solid ${isDone ? '#D9770640' : '#16A34A40'}`,
                  background: isDone ? '#D9770614' : '#16A34A14',
                  color: isDone ? '#D97706' : '#16A34A',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 150ms',
                }}
              >
                {isDone ? t('tasks.subtaskModal.markNotDone') : t('tasks.subtaskModal.markDone')}
              </button>
            )}
          </div>

          {/* Title */}
          <div>
            <label style={sidebarLabel}>{t('tasks.modal.titlePlaceholder')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={readOnly}
              style={readOnly ? readOnlyFieldStyle : fieldStyle}
              onFocus={e => { if (!readOnly) focusHandler(e); }}
              onBlur={blurHandler}
            />
          </div>

          {/* Description */}
          <div>
            <label style={sidebarLabel}>{t('tasks.modal.description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={readOnly ? '--' : t('tasks.modal.descriptionPlaceholder')}
              rows={3}
              readOnly={readOnly}
              style={{
                ...(readOnly ? readOnlyFieldStyle : fieldStyle),
                resize: 'vertical',
                minHeight: 60,
              }}
              onFocus={e => { if (!readOnly) focusHandler(e); }}
              onBlur={blurHandler}
            />
          </div>

          {/* Assignee */}
          {members.length > 0 && (
            <div>
              <label style={sidebarLabel}>{t('tasks.modal.assignee')}</label>
              {readOnly ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {assigneeId && userMap[assigneeId] ? (
                    <>
                      <AssigneeAvatar name={userMap[assigneeId].fullName ?? userMap[assigneeId].username} avatarUrl={userMap[assigneeId].avatarUrl} size={22} />
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>{userMap[assigneeId].fullName ?? userMap[assigneeId].username}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>{t('tasks.modal.unassigned')}</span>
                  )}
                </div>
              ) : (
                <AssigneeDropdown
                  value={assigneeId}
                  onChange={setAssigneeId}
                  members={members}
                  userMap={userMap}
                  placeholder={t('tasks.modal.unassigned')}
                  compact
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', borderTop: '1px solid var(--border)',
          background: 'var(--bg)', flexShrink: 0,
          borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
        }}>
          <div>
            {!readOnly && (
              confirmDelete ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('tasks.modal.deleteConfirm')}</span>
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    style={{ fontSize: 12, fontWeight: 600, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                  >
                    {t('common.delete')}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{ fontSize: 12, fontWeight: 600, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                >
                  {t('tasks.modal.deleteTask')}
                </button>
              )
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: '7px 16px', fontSize: 13, fontWeight: 600,
                borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                transition: 'background 150ms, color 150ms',
                ...(readOnly
                  ? { background: 'var(--accent)', color: '#FFFFFF', border: 'none' }
                  : { background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-strong)' }),
              }}
            >
              {readOnly ? t('common.close') : t('common.cancel')}
            </button>
            {!readOnly && (
              <button
                onClick={handleSave}
                disabled={loading || !title.trim()}
                style={{
                  padding: '7px 16px', fontSize: 13, fontWeight: 600,
                  background: 'var(--accent)', color: '#FFFFFF', border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: loading || !title.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !title.trim() ? 0.5 : 1,
                  fontFamily: 'var(--font-sans)', transition: 'background 150ms',
                }}
              >
                {loading ? '...' : t('tasks.modal.save')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}