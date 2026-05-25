import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Task, TaskStatus, TaskPriority } from '../../types';
import type { CreateTaskDto, UpdateTaskDto } from '../../api/tasks';
import { useProjectMembers } from '../../hooks/useProjectMembers';

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: 'text-gray-500',
  MEDIUM: 'text-blue-500',
  HIGH: 'text-amber-500',
  CRITICAL: 'text-red-500',
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg glass-card-strong p-6 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {readOnly ? t('tasks.modal.titleView') : isEdit ? t('tasks.modal.titleEdit') : t('tasks.modal.titleCreate')}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('tasks.modal.titleField')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('tasks.modal.titlePlaceholder')}
            readOnly={readOnly}
            className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white/60 ${readOnly ? 'text-gray-700 cursor-default' : 'focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400'}`}
            autoFocus={!readOnly}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('tasks.modal.description')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={readOnly ? '—' : t('tasks.modal.descriptionPlaceholder')}
            rows={3}
            readOnly={readOnly}
            className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white/60 resize-none ${readOnly ? 'text-gray-700 cursor-default' : 'focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400'}`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('tasks.modal.priority')}</label>
            {readOnly ? (
              <div className="flex items-center px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white/60">
                <span className={`font-medium ${PRIORITY_COLORS[priority]}`}>{t(`tasks.priority.${priority}`)}</span>
              </div>
            ) : (
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 bg-white/60"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{t(`tasks.priority.${p}`)}</option>
                ))}
              </select>
            )}
          </div>

          {/* Status (edit only, sprint tasks) */}
          {isEdit && onMove && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tasks.modal.status')}</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 bg-white/60"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{t(`tasks.status.${s}`)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Assignee */}
          {members.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tasks.modal.assignee')}</label>
              {readOnly ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white/60">
                  {assigneeId && userMap[assigneeId] ? (
                    <>
                      <AssigneeAvatar name={userMap[assigneeId].fullName ?? userMap[assigneeId].username} size={18} />
                      <span className="text-gray-700">{userMap[assigneeId].fullName ?? userMap[assigneeId].username}</span>
                    </>
                  ) : (
                    <span className="text-gray-400 italic">{t('tasks.modal.unassigned')}</span>
                  )}
                </div>
              ) : (
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 bg-white/60"
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

          {/* Due date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('tasks.modal.dueDate')}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white/60 text-gray-700">
                {dueDate
                  ? new Date(dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                  : <span className="text-gray-400 italic">—</span>}
              </div>
            ) : (
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 bg-white/60"
              />
            )}
          </div>

          {/* Story points (read-only, set via Planning Poker) */}
          {isEdit && (
            <div className={members.length > 0 ? 'col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tasks.modal.storyPoints')}</label>
              <div className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50/60 text-gray-500">
                {task?.storyPoints != null
                  ? <><span className="font-semibold text-gray-800">{task.storyPoints}</span><span className="text-xs">{t('tasks.modal.storyPointsPoker')}</span></>
                  : <span className="italic">{t('tasks.modal.storyPointsUnestimated')}</span>
                }
              </div>
            </div>
          )}

          {/* Completed at (read-only, informative) */}
          {isEdit && completedAtFormatted && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tasks.modal.completedAt')}</label>
              <div className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50/60 text-gray-600">
                {completedAtFormatted}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {!readOnly && isEdit && onDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{t('tasks.modal.deleteConfirm')}</span>
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                  >
                    {t('common.delete')}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                >
                  {t('tasks.modal.deleteTask')}
                </button>
              )
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer ${readOnly ? 'bg-primary-600 text-white hover:bg-primary-700' : 'text-gray-600 hover:text-gray-800'}`}
            >
              {readOnly ? t('common.close') : t('common.cancel')}
            </button>
            {!readOnly && (
              <button
                onClick={handleSave}
                disabled={loading || !title.trim()}
                className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
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

// ── Assignee avatar (initials + deterministic color) ──────────────────────────

const AVATAR_COLORS = [
  '#e85d2f', '#6b2d5c', '#4a6741', '#c9a449', '#1e3a5f',
  '#3b82f6', '#f59e0b', '#22c55e', '#a855f7', '#ef4444',
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
      borderRadius: '50%',
      background: color,
      color: '#fff',
      fontSize: size * 0.42,
      fontWeight: 700,
      flexShrink: 0,
      letterSpacing: '-0.02em',
    }}>
      {initials}
    </span>
  );
}