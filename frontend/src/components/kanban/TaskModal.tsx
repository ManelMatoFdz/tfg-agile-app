import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Task, TaskStatus, TaskPriority } from '../../types';
import type { CreateTaskDto, UpdateTaskDto } from '../../api/tasks';

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
  defaultStatus?: TaskStatus;
  onClose: () => void;
  onSave: (dto: CreateTaskDto | UpdateTaskDto) => Promise<void>;
  onMove?: (status: TaskStatus) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function TaskModal({ task, defaultStatus = 'TODO', onClose, onSave, onMove, onDelete }: Props) {
  const { t } = useTranslation();
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'MEDIUM');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus);
  const [storyPoints, setStoryPoints] = useState<string>(task?.storyPoints?.toString() ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const dto = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        storyPoints: storyPoints ? parseInt(storyPoints, 10) : null,
      };
      await onSave(dto);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg glass-card-strong p-6 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? t('tasks.modal.titleEdit') : t('tasks.modal.titleCreate')}
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
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 bg-white/60"
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('tasks.modal.description')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('tasks.modal.descriptionPlaceholder')}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 bg-white/60 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('tasks.modal.priority')}</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 bg-white/60"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{t(`tasks.priority.${p}`)}</option>
              ))}
            </select>
          </div>

          {/* Status (edit only) */}
          {isEdit && (
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

          {/* Story points */}
          <div className={isEdit ? 'col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('tasks.modal.storyPoints')}</label>
            <input
              type="number"
              min="0"
              max="100"
              value={storyPoints}
              onChange={(e) => setStoryPoints(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 bg-white/60"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {isEdit && onDelete && (
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
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !title.trim()}
              className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {loading ? '...' : isEdit ? t('tasks.modal.save') : t('tasks.modal.create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
