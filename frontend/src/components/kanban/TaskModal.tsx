import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown, UserCircle } from 'lucide-react';
import type { Task, TaskPriority, BoardColumn, Label } from '../../types';
import type { CreateTaskDto, UpdateTaskDto } from '../../api/tasks';
import { labelsApi } from '../../api/labels';
import { useProjectMembers } from '../../hooks/useProjectMembers';

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
  columns?: BoardColumn[];
  defaultStatus?: string;
  readOnly?: boolean;
  onClose: () => void;
  onSave?: (dto: CreateTaskDto | UpdateTaskDto) => Promise<void>;
  onMove?: (status: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function TaskModal({ task, projectId, columns = [], defaultStatus = 'TODO', readOnly = false, onClose, onSave, onMove, onDelete }: Props) {
  const { t } = useTranslation();
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'MEDIUM');
  const [status, setStatus] = useState<string>(task?.status ?? defaultStatus);
  const [assigneeId, setAssigneeId] = useState<string>(task?.assigneeId ?? '');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(
    task?.labels?.map((l) => l.id) ?? [],
  );
  const [projectLabels, setProjectLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { members, userMap } = useProjectMembers(projectId);

  useEffect(() => {
    if (!projectId) return;
    labelsApi.getByProject(projectId).then(setProjectLabels).catch(() => {});
  }, [projectId]);

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
        labelIds: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
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
        maxWidth: 720,
        minHeight: 480,
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

            {isEdit && onMove && columns.length > 0 && (
              <div>
                <label style={labelStyle}>{t('tasks.modal.status')}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={fieldStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-muted)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {columns.map((col) => (
                    <option key={col.name} value={col.name}>{col.name.replace(/_/g, ' ')}</option>
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
                        <AssigneeAvatar name={userMap[assigneeId].fullName ?? userMap[assigneeId].username} avatarUrl={userMap[assigneeId].avatarUrl} size={22} />
                        <span style={{ color: 'var(--text)' }}>{userMap[assigneeId].fullName ?? userMap[assigneeId].username}</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>{t('tasks.modal.unassigned')}</span>
                    )}
                  </div>
                ) : (
                  <AssigneeDropdown
                    value={assigneeId}
                    onChange={setAssigneeId}
                    members={members}
                    userMap={userMap}
                    placeholder={t('tasks.modal.unassigned')}
                  />
                )}
              </div>
            )}

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

          {/* Labels */}
          {projectLabels.length > 0 && (
            <div>
              <label style={labelStyle}>{t('tasks.modal.labels')}</label>
              {readOnly ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedLabelIds.length === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>—</span>
                  ) : (
                    selectedLabelIds.map((id) => {
                      const lbl = projectLabels.find((l) => l.id === id);
                      if (!lbl) return null;
                      return <LabelChip key={id} label={lbl} />;
                    })
                  )}
                </div>
              ) : (
                <LabelMultiSelect
                  labels={projectLabels}
                  selected={selectedLabelIds}
                  onChange={setSelectedLabelIds}
                />
              )}
            </div>
          )}
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

function AssigneeDropdown({
  value,
  onChange,
  members,
  userMap,
  placeholder,
}: {
  value: string;
  onChange: (id: string) => void;
  members: { userId: string }[];
  userMap: Record<string, { username: string; fullName?: string; avatarUrl?: string }>;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = value ? userMap[value] : null;
  const selectedName = selected ? (selected.fullName ?? selected.username) : null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          ...fieldStyle,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          background: 'var(--bg)',
        }}
      >
        {selected ? (
          <>
            <AssigneeAvatar name={selectedName!} avatarUrl={selected.avatarUrl} size={22} />
            <span style={{ flex: 1, color: 'var(--text)', fontSize: 13 }}>{selectedName}</span>
          </>
        ) : (
          <>
            <UserCircle size={22} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
            <span style={{ flex: 1, color: 'var(--text-faint)', fontSize: 13 }}>{placeholder}</span>
          </>
        )}
        <ChevronDown size={14} strokeWidth={2} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 50,
          maxHeight: 220,
          overflowY: 'auto',
          padding: '4px 0',
        }}>
          {/* Unassigned option */}
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              border: 'none',
              background: !value ? 'var(--accent-muted)' : 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 100ms',
            }}
            onMouseEnter={e => { if (value) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (value) e.currentTarget.style.background = 'transparent'; }}
          >
            <UserCircle size={26} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>{placeholder}</span>
          </button>

          {members.map((m) => {
            const u = userMap[m.userId];
            const name = u ? (u.fullName ?? u.username) : m.userId;
            const isSelected = m.userId === value;
            return (
              <button
                key={m.userId}
                type="button"
                onClick={() => { onChange(m.userId); setOpen(false); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  border: 'none',
                  background: isSelected ? 'var(--accent-muted)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <AssigneeAvatar name={name} avatarUrl={u?.avatarUrl} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u?.fullName ?? u?.username ?? m.userId}
                  </div>
                  {u?.fullName && (
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      @{u.username}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <span style={{ fontSize: 14, color: 'var(--accent)', flexShrink: 0 }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LabelChip({ label, size = 'sm' }: { label: Label; size?: 'sm' | 'md' }) {
  const isSm = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: isSm ? '1px 8px' : '2px 10px',
      fontSize: isSm ? 10 : 11,
      fontWeight: 600,
      color: label.color,
      background: `${label.color}14`,
      borderRadius: 'var(--radius-pill)',
      whiteSpace: 'nowrap',
      letterSpacing: '0.02em',
    }}>
      <span style={{ width: isSm ? 6 : 7, height: isSm ? 6 : 7, borderRadius: '50%', background: label.color, flexShrink: 0 }} />
      {label.name}
    </span>
  );
}

function LabelMultiSelect({
  labels,
  selected,
  onChange,
}: {
  labels: Label[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          ...fieldStyle,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          background: 'var(--bg)',
          minHeight: 40,
        }}
      >
        {selected.length === 0 ? (
          <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>—</span>
        ) : (
          selected.map((id) => {
            const lbl = labels.find((l) => l.id === id);
            if (!lbl) return null;
            return <LabelChip key={id} label={lbl} />;
          })
        )}
        <ChevronDown size={14} strokeWidth={2} style={{ color: 'var(--text-faint)', marginLeft: 'auto', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 50,
          maxHeight: 200,
          overflowY: 'auto',
          padding: '4px 0',
        }}>
          {labels.map((label) => {
            const isSelected = selected.includes(label.id);
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => toggle(label.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 12px',
                  border: 'none',
                  background: isSelected ? 'var(--accent-muted)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? 'var(--accent-muted)' : 'transparent'; }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: label.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                  {label.name}
                </span>
                {isSelected && (
                  <span style={{ fontSize: 14, color: 'var(--accent)', flexShrink: 0 }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AssigneeAvatar({ name, avatarUrl, size = 22 }: { name: string; avatarUrl?: string | null; size?: number }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: 'var(--radius-pill)',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    );
  }
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