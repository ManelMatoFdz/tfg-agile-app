import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { X, ChevronDown, UserCircle, BookOpen, CheckSquare, Bug, Plus, PlayCircle } from 'lucide-react';
import type { Task, TaskPriority, TaskType, BoardColumn, Label } from '../../types';
import type { CreateTaskDto, UpdateTaskDto } from '../../api/tasks';
import { tasksApi } from '../../api/tasks';
import { labelsApi } from '../../api/labels';
import { useProjectMembers } from '../../hooks/useProjectMembers';
import { useProjectMember } from '../../hooks/useProjectMember';
import TaskComments from './TaskComments';
import TaskActivityFeed from './TaskActivityFeed';
import { getStatusLabel, getStatusColor } from '../../hooks/useBoardColumns';

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const TASK_TYPES: TaskType[] = ['STORY', 'TASK', 'BUG'];

const TYPE_CONFIG: Record<TaskType, { icon: typeof BookOpen; color: string }> = {
  STORY: { icon: BookOpen, color: '#7C3AED' },
  TASK:  { icon: CheckSquare, color: '#2563EB' },
  BUG:   { icon: Bug, color: '#DC2626' },
};

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: '#94A3B8',
  MEDIUM: '#2563EB',
  HIGH: '#D97706',
  CRITICAL: '#DC2626',
};

const sidebarLabel: React.CSSProperties = {
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
  padding: '8px 10px',
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

const focusHandler = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = 'var(--accent)';
  e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-muted)';
};
const blurHandler = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = 'var(--border)';
  e.currentTarget.style.boxShadow = 'none';
};

interface Props {
  task?: Task | null;
  projectId?: string;
  columns?: BoardColumn[];
  defaultStatus?: string;
  defaultType?: TaskType;
  parentId?: string;
  readOnly?: boolean;
  onClose: () => void;
  onSave?: (dto: CreateTaskDto | UpdateTaskDto) => Promise<void>;
  onMove?: (status: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function TaskModal({ task, projectId, columns = [], defaultStatus = 'TODO', defaultType = 'TASK', parentId, readOnly = false, onClose, onSave, onMove, onDelete }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const isEdit = !!task;
  const isSubtask = !!(task?.parentId ?? parentId);
  const isStoryWithChildren = task?.type === 'STORY' && (task?.subtaskCount ?? 0) > 0;

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'MEDIUM');
  const [taskType, setTaskType] = useState<TaskType>(task?.type ?? (parentId ? 'TASK' : defaultType));
  const [status, setStatus] = useState<string>(task?.status ?? defaultStatus);
  const [assigneeId, setAssigneeId] = useState<string>(task?.assigneeId ?? '');
  const [ready, setReady] = useState<boolean>(task?.ready ?? false);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(
    task?.labels?.map((l) => l.id) ?? [],
  );
  const [projectLabels, setProjectLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');

  const { members, userMap } = useProjectMembers(projectId);
  const { isAdmin } = useProjectMember(projectId);

  useEffect(() => {
    if (!projectId) return;
    labelsApi.getByProject(projectId).then(setProjectLabels).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (!task || task.type !== 'STORY' || task.subtaskCount === 0) return;
    tasksApi.getSubtasks(task.id).then(setSubtasks).catch(() => {});
  }, [task]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const dto: CreateTaskDto | UpdateTaskDto = isEdit
        ? {
            title: title.trim(),
            description: description.trim() || undefined,
            priority,
            assigneeId: assigneeId || null,
            labelIds: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
            ready,
          }
        : {
            title: title.trim(),
            description: description.trim() || undefined,
            priority,
            type: parentId ? 'TASK' : taskType,
            parentId: parentId || undefined,
            assigneeId: assigneeId || undefined,
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

  const handleAddSubtask = async () => {
    if (!subtaskTitle.trim() || !projectId || !task) return;
    try {
      const created = await tasksApi.create(projectId, {
        title: subtaskTitle.trim(),
        type: 'TASK',
        parentId: task.id,
      });
      setSubtasks((prev) => [...prev, created]);
      setSubtaskTitle('');
      setShowSubtaskForm(false);
    } catch {
      setError(t('tasks.modal.loadError'));
    }
  };

  const completedAtFormatted = task?.completedAt
    ? new Date(task.completedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const createdAtFormatted = task?.createdAt
    ? new Date(task.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  // For create mode, use single-column layout
  const isTwoColumn = isEdit;

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
        width: isTwoColumn ? '85vw' : '100%',
        maxWidth: isTwoColumn ? 1060 : 600,
        height: isTwoColumn ? '85vh' : undefined,
        maxHeight: '85vh',
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
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isEdit && task && (() => {
              const cfg = TYPE_CONFIG[task.type ?? 'TASK'];
              const Icon = cfg.icon;
              return <Icon size={16} strokeWidth={2} style={{ color: cfg.color }} />;
            })()}
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {readOnly ? t('tasks.modal.titleView') : isEdit ? t('tasks.modal.titleEdit') : t('tasks.modal.titleCreate')}
            </h2>
          </div>
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
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: isTwoColumn ? 'flex' : 'block',
        }}>
          {/* Main content (left) */}
          <div style={{
            flex: isTwoColumn ? 1 : undefined,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            minWidth: 0,
            ...(isTwoColumn ? { borderRight: '1px solid var(--border)' } : {}),
          }}>
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

            {/* Parent badge for subtasks */}
            {task?.parentTitle && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                background: 'var(--bg-hover)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{'↳'} {t('tasks.modal.partOf')}:</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{task.parentTitle}</span>
              </div>
            )}

            {/* Story auto-status info */}
            {isStoryWithChildren && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                background: 'rgba(124,58,237,0.06)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(124,58,237,0.15)',
              }}>
                <BookOpen size={14} strokeWidth={2} style={{ color: '#7C3AED', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#7C3AED' }}>{t('tasks.modal.storyStatusDerived')}</span>
              </div>
            )}

            {/* Title */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('tasks.modal.titlePlaceholder')}
                readOnly={readOnly}
                autoFocus={!readOnly}
                style={{
                  ...(readOnly ? readOnlyFieldStyle : fieldStyle),
                  fontSize: 16,
                  fontWeight: 600,
                  padding: '10px 12px',
                  border: readOnly ? '1px solid var(--border)' : '1px solid var(--border)',
                }}
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
                rows={4}
                readOnly={readOnly}
                style={{
                  ...(readOnly ? readOnlyFieldStyle : fieldStyle),
                  resize: 'vertical',
                  minHeight: 80,
                }}
                onFocus={e => { if (!readOnly) focusHandler(e); }}
                onBlur={blurHandler}
              />
            </div>

            {/* Type selector — only on create, not for subtasks */}
            {!isEdit && !parentId && (
              <div>
                <label style={sidebarLabel}>{t('tasks.modal.type')}</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {TASK_TYPES.map((tt) => {
                    const cfg = TYPE_CONFIG[tt];
                    const Icon = cfg.icon;
                    const selected = taskType === tt;
                    return (
                      <button
                        key={tt}
                        type="button"
                        onClick={() => setTaskType(tt)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                          padding: '8px 10px',
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: 'var(--font-sans)',
                          border: `1.5px solid ${selected ? cfg.color : 'var(--border)'}`,
                          borderRadius: 'var(--radius-md)',
                          background: selected ? `${cfg.color}0D` : 'var(--bg)',
                          color: selected ? cfg.color : 'var(--text-muted)',
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                        }}
                      >
                        <Icon size={14} strokeWidth={2} />
                        {t(`tasks.type.${tt}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Create mode: priority + assignee inline */}
            {!isEdit && (
              <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label style={sidebarLabel}>{t('tasks.modal.priority')}</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    style={fieldStyle}
                    onFocus={focusHandler}
                    onBlur={blurHandler}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{t(`tasks.priority.${p}`)}</option>
                    ))}
                  </select>
                </div>
                {members.length > 0 && (
                  <div>
                    <label style={sidebarLabel}>{t('tasks.modal.assignee')}</label>
                    <AssigneeDropdown
                      value={assigneeId}
                      onChange={setAssigneeId}
                      members={members}
                      userMap={userMap}
                      placeholder={t('tasks.modal.unassigned')}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Create mode: labels */}
            {!isEdit && projectLabels.length > 0 && (
              <div>
                <label style={sidebarLabel}>{t('tasks.modal.labels')}</label>
                <LabelMultiSelect
                  labels={projectLabels}
                  selected={selectedLabelIds}
                  onChange={setSelectedLabelIds}
                />
              </div>
            )}

            {/* Subtasks section — only for STORY in a sprint */}
            {isEdit && task?.type === 'STORY' && task?.sprintId && (() => {
              const pct = task.subtaskCount > 0 ? Math.round((task.completedSubtaskCount / task.subtaskCount) * 100) : 0;
              const allDone = task.subtaskCount > 0 && task.completedSubtaskCount === task.subtaskCount;
              const barColor = allDone ? '#16A34A' : '#3B82F6';
              return (
                <div style={{
                  borderTop: '1px solid var(--border)',
                  paddingTop: 16,
                }}>
                  <div style={{
                    background: '#F8F9FA',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                  }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <label style={{ ...sidebarLabel, margin: 0 }}>
                      {t('tasks.modal.subtasks')}
                    </label>
                    {task.subtaskCount > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)' }}>
                        {task.completedSubtaskCount}/{task.subtaskCount} {t('tasks.modal.subtaskCompleted')}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {task.subtaskCount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <div style={{
                        flex: 1,
                        height: 6,
                        background: '#E5E7EB',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: barColor,
                          borderRadius: 3,
                          transition: 'width 300ms ease',
                        }} />
                      </div>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: barColor,
                        fontFamily: 'var(--font-mono)',
                        minWidth: 32,
                        textAlign: 'right',
                      }}>
                        {pct}%
                      </span>
                    </div>
                  )}

                  {/* Subtask list */}
                  {subtasks.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      maxHeight: 240,
                      overflowY: 'auto',
                    }}>
                      {subtasks.map((st) => {
                        const isDone = st.status === 'DONE';
                        return (
                          <div key={st.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 14px',
                          }}>
                            {/* Visual-only checkbox */}
                            <span style={{
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              border: isDone ? 'none' : '2px solid #CBD5E1',
                              background: isDone ? '#3B82F6' : '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              {isDone && (
                                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                  <path d="M2 5.5L4.5 8L9 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </span>
                            <span style={{
                              flex: 1,
                              fontSize: 13,
                              fontWeight: 400,
                              color: isDone ? '#94A3B8' : '#1F2937',
                              textDecoration: isDone ? 'line-through' : 'none',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                            }}>
                              {st.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {task.subtaskCount === 0 && !showSubtaskForm && (
                    <p style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic', margin: 0 }}>
                      {t('tasks.modal.noSubtasks')}
                    </p>
                  )}

                  {/* Add subtask link / inline form */}
                  {!readOnly && !showSubtaskForm && (
                    <button
                      type="button"
                      onClick={() => setShowSubtaskForm(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 10,
                        padding: 0,
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: 'var(--font-sans)',
                        background: 'none',
                        color: 'var(--accent)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'opacity 150ms',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      {t('tasks.modal.addSubtask')}
                    </button>
                  )}

                  {showSubtaskForm && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <input
                        type="text"
                        value={subtaskTitle}
                        onChange={(e) => setSubtaskTitle(e.target.value)}
                        placeholder={t('tasks.modal.titlePlaceholder')}
                        autoFocus
                        style={{ ...fieldStyle, flex: 1, padding: '6px 10px', fontSize: 12 }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtask(); if (e.key === 'Escape') { setShowSubtaskForm(false); setSubtaskTitle(''); } }}
                        onFocus={focusHandler}
                        onBlur={blurHandler}
                      />
                      <button
                        type="button"
                        onClick={handleAddSubtask}
                        disabled={!subtaskTitle.trim()}
                        style={{
                          padding: '6px 14px',
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: 'var(--font-sans)',
                          background: 'var(--accent)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          cursor: subtaskTitle.trim() ? 'pointer' : 'not-allowed',
                          opacity: subtaskTitle.trim() ? 1 : 0.5,
                        }}
                      >
                        {t('common.add')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowSubtaskForm(false); setSubtaskTitle(''); }}
                        style={{
                          padding: '6px 14px',
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: 'var(--font-sans)',
                          background: 'var(--bg-elevated)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                        }}
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  )}
                  </div>{/* end gray bg */}
                </div>
              );
            })()}

            {/* Comments — only for existing tasks */}
            {isEdit && projectId && task && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <TaskComments
                  taskId={task.id}
                  projectId={projectId}
                  members={members}
                  userMap={userMap}
                  isAdmin={isAdmin}
                  readOnly={readOnly}
                />
              </div>
            )}

            {/* Activity log — only for existing tasks */}
            {isEdit && task && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <TaskActivityFeed
                  taskId={task.id}
                  comments={[]}
                  userMap={userMap}
                />
              </div>
            )}
          </div>

          {/* Sidebar (right) — only for edit mode */}
          {isTwoColumn && (
            <div style={{
              width: 280,
              flexShrink: 0,
              padding: '20px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 22,
              overflowY: 'auto',
            }}>
              {/* Start Planning Poker — only for non-subtask tasks, hidden in readOnly */}
              {!readOnly && !isSubtask && workspaceId && projectId && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/workspaces/${workspaceId}/projects/${projectId}/poker`);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'var(--font-sans)',
                    background: 'var(--accent)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
                >
                  <PlayCircle size={16} strokeWidth={2} />
                  {t('tasks.modal.startPoker')}
                </button>
              )}

              {/* Status (read-only pill — status changes only via board drag) */}
              <div>
                <label style={sidebarLabel}>{t('tasks.modal.status')}</label>
                {(() => {
                  const sColor = getStatusColor(status, columns);
                  return (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 600,
                      color: sColor,
                      background: `${sColor}15`,
                      border: `1px solid ${sColor}33`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '3px 9px',
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: sColor, flexShrink: 0 }} />
                      {getStatusLabel(status, columns, t)}
                    </span>
                  );
                })()}
              </div>

              {/* Priority */}
              <div>
                <label style={sidebarLabel}>{t('tasks.modal.priority')}</label>
                {readOnly ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: PRIORITY_COLOR[priority],
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: PRIORITY_COLOR[priority] }}>
                      {t(`tasks.priority.${priority}`)}
                    </span>
                  </div>
                ) : (
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    style={{ ...fieldStyle, fontSize: 12, padding: '7px 10px' }}
                    onFocus={focusHandler}
                    onBlur={blurHandler}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{t(`tasks.priority.${p}`)}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Type (read-only badge) */}
              <div>
                <label style={sidebarLabel}>{t('tasks.modal.type')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {(() => {
                    const cfg = TYPE_CONFIG[task?.type ?? 'TASK'];
                    const Icon = cfg.icon;
                    return (
                      <>
                        <Icon size={14} strokeWidth={2} style={{ color: cfg.color }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: cfg.color }}>{t(`tasks.type.${task?.type ?? 'TASK'}`)}</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Assignee */}
              {members.length > 0 && (
                <div>
                  <label style={sidebarLabel}>{t('tasks.modal.assignee')}</label>
                  {readOnly ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {assigneeId && userMap[assigneeId] ? (
                        <>
                          <AssigneeAvatar name={userMap[assigneeId].fullName ?? userMap[assigneeId].username} avatarUrl={userMap[assigneeId].avatarUrl} size={24} />
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

              {/* Labels */}
              {projectLabels.length > 0 && (
                <div>
                  <label style={sidebarLabel}>{t('tasks.modal.labels')}</label>
                  {readOnly ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
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
                      compact
                    />
                  )}
                </div>
              )}

              {/* Story Points */}
              {!isSubtask && (
                <div>
                  <label style={sidebarLabel}>{t('tasks.modal.storyPoints')}</label>
                  {task?.storyPoints != null ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t('tasks.modal.storyPointsPoker')}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-faint)' }}>{t('tasks.modal.storyPointsUnestimated')}</span>
                  )}
                </div>
              )}

              {/* Ready for sprint */}
              {!isSubtask && task && (
                <div>
                  <label style={sidebarLabel}>{t('tasks.modal.ready')}</label>
                  <button
                    onClick={readOnly ? undefined : () => setReady(r => !r)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      background: ready ? '#16A34A14' : '#D9770614',
                      color: ready ? '#16A34A' : '#D97706',
                      border: `1px solid ${ready ? '#16A34A40' : '#D9770640'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: readOnly ? 'default' : 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: ready ? '#16A34A' : '#D97706',
                    }} />
                    {ready ? t('tasks.modal.readyLabel') : t('tasks.modal.notReadyLabel')}
                  </button>
                </div>
              )}

              {/* Completed at */}
              {completedAtFormatted && (
                <div>
                  <label style={sidebarLabel}>{t('tasks.modal.completedAt')}</label>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{completedAtFormatted}</span>
                </div>
              )}

              {/* Created at */}
              {createdAtFormatted && (
                <div>
                  <label style={sidebarLabel}>{t('tasks.modal.createdAt')}</label>
                  <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{createdAtFormatted}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg)',
          flexShrink: 0,
          borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
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
                padding: '8px 18px',
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
                  padding: '8px 18px',
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
  compact = false,
}: {
  value: string;
  onChange: (id: string) => void;
  members: { userId: string }[];
  userMap: Record<string, { username: string; fullName?: string; avatarUrl?: string }>;
  placeholder: string;
  compact?: boolean;
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
  const btnStyle = compact
    ? { ...fieldStyle, fontSize: 12, padding: '6px 10px' }
    : fieldStyle;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          ...btnStyle,
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
            <AssigneeAvatar name={selectedName!} avatarUrl={selected.avatarUrl} size={compact ? 20 : 22} />
            <span style={{ flex: 1, color: 'var(--text)', fontSize: compact ? 12 : 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedName}</span>
          </>
        ) : (
          <>
            <UserCircle size={compact ? 20 : 22} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
            <span style={{ flex: 1, color: 'var(--text-faint)', fontSize: compact ? 12 : 13 }}>{placeholder}</span>
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
      display: 'inline-block',
      fontSize: isSm ? 10 : 11,
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: label.color,
      background: `${label.color}14`,
      border: `1px solid ${label.color}40`,
      borderRadius: 'var(--radius-sm)',
      padding: isSm ? '1px 8px' : '2px 10px',
      whiteSpace: 'nowrap',
      lineHeight: '16px',
    }}>
      {label.name}
    </span>
  );
}

function LabelMultiSelect({
  labels,
  selected,
  onChange,
  compact = false,
}: {
  labels: Label[];
  selected: string[];
  onChange: (ids: string[]) => void;
  compact?: boolean;
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

  const btnStyle = compact
    ? { ...fieldStyle, fontSize: 12, padding: '6px 10px', minHeight: 34 }
    : { ...fieldStyle, minHeight: 40 };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          ...btnStyle,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          background: 'var(--bg)',
        }}
      >
        {selected.length === 0 ? (
          <span style={{ color: 'var(--text-faint)', fontSize: compact ? 12 : 13 }}>—</span>
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