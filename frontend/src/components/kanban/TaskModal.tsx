import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { Task, TaskStatus, TaskPriority } from '../../types';
import type { CreateTaskDto, UpdateTaskDto } from '../../api/tasks';
import { useProjectMembers } from '../../hooks/useProjectMembers';

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: '#94A3B8',
  MEDIUM: '#2563EB',
  HIGH: '#D97706',
  CRITICAL: '#DC2626',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 6,
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
  color: 'var(--text)',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  outline: 'none',
  boxSizing: 'border-box' as const,
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
};

const readOnlyFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  background: 'var(--bg-hover)',
  cursor: 'default',
};

interface Props {
  task?: Task | null;
  projectId?: string;
  defaultStatus?: TaskStatus;
  readOnly?: boolean;
  onClose: () => void;
  onSave?: (dto: CreateTaskDto | UpdateTaskDto) => Promise<void>;
  onMove?: (status: TaskStatus) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function TaskModal({ task, projectId, defaultStatus = 'TODO', readOnly = false, onClose, onSave, onMove, onDelete }: Props) {
  const { t } = useTranslation();
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'MEDIUM');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus);
  const [assigneeId, setAssigneeId] = useState<string>(task?.assigneeId ?? '');
  const [dueDate, setDueDate] = useState<string>(task?.dueDate ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { members, userMap } = useProjectMembers(projectId);

  const handleSave = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const dto = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
      };
      await onSave?.(dto);
      if (isEdit && onMove && status !== task?.status) {
        await onMove(status);
      }
      onClose();
    } catch {
      setError(t('tasks.modal.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setLoading(true);
    try {
      await onDelete();
      onClose();
    } catch {
      setError(t('tasks.modal.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const completedAtFormatted = task?.completedAt
    ? new Date(task.completedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
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
        maxWidth: 560,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'scale-in var(--duration-panel) var(--ease-out) both',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {readOnly ? t('tasks.modal.titleView') : isEdit ? t('tasks.modal.titleEdit') : t('tasks.modal.titleCreate')}
          </h2>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-faint)',
              cursor: 'pointer',
              transition: 'color 150ms, background 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {error && (
            <div style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#DC2626',
              background: 'rgba(220,38,38,0.06)',
              borderLeft: '3px solid #DC2626',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
            }}>
              {error}
            </div>
          )}

          <div>
            <label style={labelStyle}>{t('tasks.modal.titleField')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('tasks.modal.titlePlaceholder')}
              readOnly={readOnly}
              autoFocus={!readOnly}
              style={readOnly ? readOnlyFieldStyle : fieldStyle}
              onFocus={e => { if (!readOnly) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-muted)'; } }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          <div>
            <label style={labelStyle}>{t('tasks.modal.description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={readOnly ? '--' : t('tasks.modal.descriptionPlaceholder')}
              rows={3}
              readOnly={readOnly}
              style={{ ...(readOnly ? readOnlyFieldStyle : fieldStyle), resize: 'none' }}
              onFocus={e => { if (!readOnly) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-muted)'; } }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          <div className="task-modal-grid">
            <style>{`.task-modal-grid{display:grid;gap:14px;grid-template-columns:1fr 1fr}`}</style>

            <div>
              <label style={labelStyle}>{t('tasks.modal.priority')}</label>
              {readOnly ? (
                <div style={readOnlyFieldStyle}>
                  <span style={{ fontWeight: 600, color: PRIORITY_COLOR[priority] }}>{t(`tasks.priority.${priority}`)}</span>
                </div>
              ) : (
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  style={fieldStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-muted)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{t(`tasks.priority.${p}`)}</option>
                  ))}
                </select>
              )}
            </div>

            {isEdit && onMove && (
              <div>
                <label style={labelStyle}>{t('tasks.modal.status')}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  style={fieldStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-muted)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{t(`tasks.status.${s}`)}</option>
                  ))}
                </select>
              </div>
            )}

            {members.length > 0 && (
              <div>
                <label style={labelStyle}>{t('tasks.modal.assignee')}</label>
                {readOnly ? (
                  <div style={{ ...readOnlyFieldStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {assigneeId && userMap[assigneeId] ? (
                      <>
                        <AssigneeAvatar name={userMap[assigneeId].fullName ?? userMap[assigneeId].username} size={22} />
                        <span style={{ color: 'var(--text)' }}>{userMap[assigneeId].fullName ?? userMap[assigneeId].username}</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>{t('tasks.modal.unassigned')}</span>
                    )}
                  </div>
                ) : (
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    style={fieldStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-muted)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <option value="">{t('tasks.modal.unassigned')}</option>
                    {members.map((m) => {
                      const u = userMap[m.userId];
                      const label = u ? (u.fullName ?? u.username) : m.userId;
                      return <option key={m.userId} value={m.userId}>{label}</option>;
                    })}
                  </select>
                )}
              </div>
            )}

            <div>
              <label style={labelStyle}>{t('tasks.modal.dueDate')}</label>
              {readOnly ? (
                <div style={readOnlyFieldStyle}>
                  {dueDate
                    ? new Date(dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                    : <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>--</span>}
                </div>
              ) : (
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={fieldStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-muted)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              )}
            </div>

            {isEdit && (
              <div style={members.length > 0 ? { gridColumn: '1 / -1' } : undefined}>
                <label style={labelStyle}>{t('tasks.modal.storyPoints')}</label>
                <div style={{ ...readOnlyFieldStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {task?.storyPoints != null
                    ? <>
                        <span style={{
                          fontWeight: 700,
                          color: 'var(--accent)',
                          background: 'var(--accent-muted)',
                          borderRadius: 'var(--radius-pill)',
                          width: 28,
                          height: 28,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {task.storyPoints}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{t('tasks.modal.storyPointsPoker')}</span>
                      </>
                    : <span style={{ fontStyle: 'italic', color: 'var(--text-faint)' }}>{t('tasks.modal.storyPointsUnestimated')}</span>
                  }
                </div>
              </div>
            )}

            {isEdit && completedAtFormatted && (
              <div>
                <label style={labelStyle}>{t('tasks.modal.completedAt')}</label>
                <div style={readOnlyFieldStyle}>
                  {completedAtFormatted}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg)',
        }}>
          <div>
            {!readOnly && isEdit && onDelete && (
              confirmDelete ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('tasks.modal.deleteConfirm')}</span>
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    style={{
                      fontSize: 12, fontWeight: 600, color: '#DC2626',
                      background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      transition: 'opacity 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                  >
                    {t('common.delete')}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
                      background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      transition: 'opacity 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    fontSize: 12, fontWeight: 600, color: '#DC2626',
                    background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    transition: 'opacity 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
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
                padding: '9px 20px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'background 150ms, color 150ms',
                ...(readOnly
                  ? { background: 'var(--accent)', color: '#FFFFFF', border: 'none' }
                  : { background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-strong)' }),
              }}
              onMouseEnter={e => {
                if (readOnly) { e.currentTarget.style.background = 'var(--accent-hover)'; }
                else { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text)'; }
              }}
              onMouseLeave={e => {
                if (readOnly) { e.currentTarget.style.background = 'var(--accent)'; }
                else { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-muted)'; }
              }}
            >
              {readOnly ? t('common.close') : t('common.cancel')}
            </button>
            {!readOnly && (
              <button
                onClick={handleSave}
                disabled={loading || !title.trim()}
                style={{
                  padding: '9px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'var(--accent)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: loading || !title.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !title.trim() ? 0.5 : 1,
                  fontFamily: 'var(--font-sans)',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => { if (!loading && title.trim()) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
              >
                {loading ? '...' : isEdit ? t('tasks.modal.save') : t('tasks.modal.create')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const AVATAR_COLORS = [
  '#2563EB', '#7C3AED', '#16A34A', '#D97706', '#DC2626',
  '#0891B2', '#4F46E5', '#059669', '#EA580C', '#DB2777',
];

function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function AssigneeAvatar({ name, size = 22 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  const color = nameToColor(name);
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: 'var(--radius-pill)',
      background: color,
      color: '#FFFFFF',
      fontSize: size * 0.42,
      fontWeight: 700,
      flexShrink: 0,
      letterSpacing: '-0.02em',
    }}>
      {initials}
    </span>
  );
}