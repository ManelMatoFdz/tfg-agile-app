import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Sprint, Task, TaskPriority, TaskStatus } from '../../../types';
import { sprintsApi, type CreateSprintDto } from '../../../api/sprints';
import { tasksApi, type UpdateTaskDto, type CreateTaskDto } from '../../../api/tasks';
import TaskModal from '../../../components/kanban/TaskModal';
import Alert from '../../../components/ui/Alert';

// ── Shared style maps ────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  CRITICAL: 'bg-red-100 text-red-600',
  HIGH: 'bg-amber-100 text-amber-600',
  MEDIUM: 'bg-blue-100 text-blue-600',
  LOW: 'bg-gray-100 text-gray-500',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-gray-100 text-gray-500',
  IN_PROGRESS: 'bg-blue-100 text-blue-600',
  IN_REVIEW: 'bg-amber-100 text-amber-600',
  DONE: 'bg-emerald-100 text-emerald-600',
};

const SPRINT_BORDER: Record<Sprint['status'], string> = {
  PLANNING: 'border-gray-200',
  ACTIVE: 'border-primary-300',
  COMPLETED: 'border-gray-100',
};

const SPRINT_STATUS_BADGE: Record<Sprint['status'], string> = {
  PLANNING: 'bg-gray-100 text-gray-500',
  ACTIVE: 'bg-primary-100 text-primary-700',
  COMPLETED: 'bg-emerald-100 text-emerald-600',
};

// ── CreateSprintModal ────────────────────────────────────────────────────────

interface CreateSprintModalProps {
  projectId: string;
  onClose: () => void;
  onCreate: (sprint: Sprint) => void;
}

function CreateSprintModal({ projectId, onClose, onCreate }: CreateSprintModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const dto: CreateSprintDto = {
        name: name.trim(),
        goal: goal.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const sprint = await sprintsApi.createSprint(projectId, dto);
      onCreate(sprint);
      onClose();
    } catch {
      setError(t('projects.sprints.create.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md glass-card-strong p-6 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t('projects.sprints.create.title')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.sprints.create.name')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('projects.sprints.create.namePlaceholder')}
            autoFocus
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 bg-white/60"
          />
        </div>

        {/* Goal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('projects.sprints.create.goal')}{' '}
            <span className="text-gray-400 font-normal">({t('common.optional')})</span>
          </label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={t('projects.sprints.create.goalPlaceholder')}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 bg-white/60 resize-none"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('projects.sprints.create.startDate')}{' '}
              <span className="text-gray-400 font-normal">({t('common.optional')})</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 bg-white/60"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('projects.sprints.create.endDate')}{' '}
              <span className="text-gray-400 font-normal">({t('common.optional')})</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 bg-white/60"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors cursor-pointer">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {loading ? '...' : t('projects.sprints.create.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SprintPlanningModal ──────────────────────────────────────────────────────

interface SprintPlanningModalProps {
  sprintId: string;
  projectId: string;
  existingTaskIds: Set<string>;
  onClose: () => void;
  onAdd: (tasks: Task[]) => void;
}

function SprintPlanningModal({ sprintId, projectId, existingTaskIds, onClose, onAdd }: SprintPlanningModalProps) {
  const { t } = useTranslation();
  const [backlog, setBacklog] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sprintsApi
      .getBacklog(projectId)
      .then((tasks) => setBacklog(tasks.filter((t) => !existingTaskIds.has(t.id))))
      .catch(() => setError(t('projects.sprints.planning.error')))
      .finally(() => setLoading(false));
  }, [projectId, existingTaskIds, t]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const added = await sprintsApi.assignTasksToSprint(sprintId, [...selected]);
      onAdd(added);
      onClose();
    } catch {
      setError(t('projects.sprints.planning.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg glass-card-strong p-6 flex flex-col max-h-[80vh] animate-fade-in">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-gray-900">{t('projects.sprints.planning.title')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-4">{t('projects.sprints.planning.subtitle')}</p>

        {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</div>}

        {/* Backlog list */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : backlog.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">{t('projects.sprints.planning.noBacklog')}</p>
          ) : (
            backlog.map((task) => (
              <label
                key={task.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.has(task.id)}
                  onChange={() => toggle(task.id)}
                  className="w-4 h-4 rounded accent-primary-600 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-gray-400 truncate">{task.description}</p>
                  )}
                </div>
                <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                  {t(`tasks.priority.${task.priority}`)}
                </span>
                {task.storyPoints != null && (
                  <span className="flex-shrink-0 text-xs text-gray-400">{task.storyPoints}pts</span>
                )}
              </label>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
          <span className="text-sm text-gray-400">
            {selected.size > 0 && `${selected.size} ${t('projects.sprints.planning.selected')}`}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors cursor-pointer">
              {t('common.cancel')}
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || selected.size === 0}
              className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {saving ? '...' : t('projects.sprints.planning.addSelected')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SprintsPage ──────────────────────────────────────────────────────────────

export default function SprintsPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sprintTasks, setSprintTasks] = useState<Record<string, Task[]>>({});
  const [loadingTasksId, setLoadingTasksId] = useState<string | null>(null);
  const [planningSprintId, setPlanningSprintId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<Task | null | undefined>(undefined);
  const [editTaskSprintId, setEditTaskSprintId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'activate' | 'complete'; sprintId: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load sprints
  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    sprintsApi
      .listSprints(projectId)
      .then(setSprints)
      .catch(() => setError(t('projects.sprints.loadError')))
      .finally(() => setLoading(false));
  }, [projectId, t]);

  // Expand/collapse sprint and load its tasks lazily
  const handleExpand = async (sprintId: string) => {
    if (expandedId === sprintId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(sprintId);
    if (!sprintTasks[sprintId]) {
      setLoadingTasksId(sprintId);
      try {
        const tasks = await sprintsApi.getSprintTasks(sprintId);
        setSprintTasks((prev) => ({ ...prev, [sprintId]: tasks }));
      } catch {
        setError(t('projects.sprints.loadError'));
      } finally {
        setLoadingTasksId(null);
      }
    }
  };

  // Activate sprint
  const handleActivate = async (sprintId: string) => {
    setActionLoading(true);
    try {
      const updated = await sprintsApi.activateSprint(sprintId);
      setSprints((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setConfirmAction(null);
    } catch {
      setError(t('projects.sprints.activateError'));
    } finally {
      setActionLoading(false);
    }
  };

  // Complete sprint
  const handleComplete = async (sprintId: string) => {
    setActionLoading(true);
    try {
      const updated = await sprintsApi.completeSprint(sprintId);
      setSprints((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      // Tasks not DONE went back to backlog, clear cached tasks
      setSprintTasks((prev) => ({ ...prev, [sprintId]: [] }));
      setConfirmAction(null);
    } catch {
      setError(t('projects.sprints.completeError'));
    } finally {
      setActionLoading(false);
    }
  };

  // Remove task from sprint
  const handleRemoveFromSprint = async (sprintId: string, taskId: string) => {
    try {
      await sprintsApi.removeTaskFromSprint(sprintId, taskId);
      setSprintTasks((prev) => ({
        ...prev,
        [sprintId]: (prev[sprintId] ?? []).filter((t) => t.id !== taskId),
      }));
    } catch {
      setError(t('projects.sprints.loadError'));
    }
  };

  // Task modal: save (edit)
  const handleSaveTask = async (dto: CreateTaskDto | UpdateTaskDto) => {
    if (!editTask) return;
    const updated = await tasksApi.update(editTask.id, dto as UpdateTaskDto);
    if (editTaskSprintId) {
      setSprintTasks((prev) => ({
        ...prev,
        [editTaskSprintId]: (prev[editTaskSprintId] ?? []).map((t) =>
          t.id === updated.id ? updated : t
        ),
      }));
    }
  };

  // Task modal: move status
  const handleMoveTask = async (status: TaskStatus) => {
    if (!editTask) return;
    const updated = await tasksApi.move(editTask.id, { status, position: 0 });
    if (editTaskSprintId) {
      setSprintTasks((prev) => ({
        ...prev,
        [editTaskSprintId]: (prev[editTaskSprintId] ?? []).map((t) =>
          t.id === updated.id ? updated : t
        ),
      }));
    }
  };

  // Task modal: delete
  const handleDeleteTask = async () => {
    if (!editTask) return;
    await tasksApi.delete(editTask.id);
    if (editTaskSprintId) {
      setSprintTasks((prev) => ({
        ...prev,
        [editTaskSprintId]: (prev[editTaskSprintId] ?? []).filter((t) => t.id !== editTask.id),
      }));
    }
  };

  // Sprint planning: add tasks
  const handleAddToSprint = (sprintId: string, added: Task[]) => {
    setSprintTasks((prev) => ({
      ...prev,
      [sprintId]: [...(prev[sprintId] ?? []), ...added],
    }));
  };

  const formatDate = (date: string | null | undefined) =>
    date ? new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  const isExpandable = (sprint: Sprint) => sprint.status !== 'COMPLETED' || (sprintTasks[sprint.id]?.length ?? 0) > 0;

  const totalPoints = (sprintId: string) =>
    (sprintTasks[sprintId] ?? []).reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

  return (
    <div className="space-y-4">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900">{t('projects.sprints.title')}</h2>
          {!loading && (
            <span className="text-xs font-medium text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
              {sprints.length} {sprints.length === 1 ? t('projects.sprints.sprint') : t('projects.sprints.sprintsCount')}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('projects.sprints.newSprint')}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sprints.length === 0 ? (
        <div className="glass-card-strong p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">{t('projects.sprints.noSprints')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('projects.sprints.noSprintsSubtitle')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sprints.map((sprint) => {
            const isExpanded = expandedId === sprint.id;
            const tasks = sprintTasks[sprint.id] ?? [];
            const isLoadingTasks = loadingTasksId === sprint.id;
            const pts = totalPoints(sprint.id);
            const startFmt = formatDate(sprint.startDate);
            const endFmt = formatDate(sprint.endDate);
            const confirmThis = confirmAction?.sprintId === sprint.id ? confirmAction.type : null;

            return (
              <div
                key={sprint.id}
                className={`glass-card-strong overflow-hidden border-l-4 ${SPRINT_BORDER[sprint.status]}`}
              >
                {/* Sprint header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Expand toggle */}
                  <button
                    onClick={() => handleExpand(sprint.id)}
                    className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 truncate">{sprint.name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SPRINT_STATUS_BADGE[sprint.status]}`}>
                        {t(`projects.sprints.status.${sprint.status}`)}
                      </span>
                      {isExpanded && tasks.length > 0 && (
                        <span className="text-xs text-gray-400">
                          {tasks.length} {tasks.length === 1 ? t('projects.sprints.task') : t('projects.sprints.tasks')}
                          {pts > 0 && ` · ${pts} pts`}
                        </span>
                      )}
                    </div>
                    {(startFmt || endFmt || sprint.goal) && (
                      <div className="flex items-center gap-3 mt-0.5">
                        {(startFmt || endFmt) && (
                          <span className="text-xs text-gray-400">
                            {startFmt ?? '—'} → {endFmt ?? '—'}
                          </span>
                        )}
                        {sprint.goal && (
                          <span className="text-xs text-gray-400 truncate italic">{sprint.goal}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {sprint.status === 'PLANNING' && (
                      confirmThis === 'activate' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{t('projects.sprints.activateConfirm')}</span>
                          <button
                            onClick={() => handleActivate(sprint.id)}
                            disabled={actionLoading}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors cursor-pointer"
                          >
                            {t('common.confirm')}
                          </button>
                          <button
                            onClick={() => setConfirmAction(null)}
                            className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmAction({ type: 'activate', sprintId: sprint.id })}
                          className="px-3 py-1 text-xs font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors cursor-pointer"
                        >
                          {t('projects.sprints.activate')}
                        </button>
                      )
                    )}
                    {sprint.status === 'ACTIVE' && (
                      <>
                        <Link
                          to={`/workspaces/${workspaceId}/projects/${projectId}/sprints/${sprint.id}/board`}
                          className="px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                          </svg>
                          {t('projects.sprints.viewBoard')}
                        </Link>
                        {confirmThis === 'complete' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{t('projects.sprints.completeConfirm')}</span>
                            <button
                              onClick={() => handleComplete(sprint.id)}
                              disabled={actionLoading}
                              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                            >
                              {t('common.confirm')}
                            </button>
                            <button
                              onClick={() => setConfirmAction(null)}
                              className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmAction({ type: 'complete', sprintId: sprint.id })}
                            className="px-3 py-1 text-xs font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                          >
                            {t('projects.sprints.complete')}
                          </button>
                        )}
                      </>
                    )}
                  {/* View report — shown for all statuses */}
                  <Link
                    to={`/workspaces/${workspaceId}/projects/${projectId}/sprints/${sprint.id}/report`}
                    className="px-3 py-1 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {t('projects.sprints.viewReport')}
                  </Link>
                </div>
              </div>

                {/* Expanded: task list */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {isLoadingTasks ? (
                      <div className="flex justify-center py-6">
                        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : tasks.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-5">{t('projects.sprints.noTasks')}</p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {tasks.map((task) => (
                          <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/60 transition-colors group">
                            {/* Priority */}
                            <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                              {t(`tasks.priority.${task.priority}`)}
                            </span>

                            {/* Title */}
                            <button
                              onClick={() => { setEditTask(task); setEditTaskSprintId(sprint.id); }}
                              className="flex-1 min-w-0 text-left"
                            >
                              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-700 transition-colors">
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-gray-400 truncate">{task.description}</p>
                              )}
                            </button>

                            {/* Status */}
                            <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status]}`}>
                              {t(`tasks.status.${task.status}`)}
                            </span>

                            {/* Story points */}
                            {task.storyPoints != null ? (
                              <span className="flex-shrink-0 text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full w-14 text-center">
                                {task.storyPoints} pts
                              </span>
                            ) : (
                              <span className="flex-shrink-0 w-14" />
                            )}

                            {/* Remove from sprint */}
                            {sprint.status !== 'COMPLETED' && (
                              <button
                                onClick={() => handleRemoveFromSprint(sprint.id, task.id)}
                                title={t('projects.sprints.removeTask')}
                                className="flex-shrink-0 p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Sprint planning button */}
                    {sprint.status !== 'COMPLETED' && (
                      <div className="px-4 py-2.5 border-t border-gray-50">
                        <button
                          onClick={() => { setPlanningSprintId(sprint.id); if (!sprintTasks[sprint.id]) handleExpand(sprint.id); }}
                          className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {t('projects.sprints.addTasks')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showCreate && projectId && (
        <CreateSprintModal
          projectId={projectId}
          onClose={() => setShowCreate(false)}
          onCreate={(sprint) => setSprints((prev) => [...prev, sprint])}
        />
      )}

      {planningSprintId && projectId && (
        <SprintPlanningModal
          sprintId={planningSprintId}
          projectId={projectId}
          existingTaskIds={new Set((sprintTasks[planningSprintId] ?? []).map((t) => t.id))}
          onClose={() => setPlanningSprintId(null)}
          onAdd={(added) => handleAddToSprint(planningSprintId, added)}
        />
      )}

      {editTask !== undefined && (
        <TaskModal
          task={editTask}
          defaultStatus="TODO"
          onClose={() => { setEditTask(undefined); setEditTaskSprintId(null); }}
          onSave={handleSaveTask}
          onMove={editTask ? handleMoveTask : undefined}
          onDelete={editTask ? handleDeleteTask : undefined}
        />
      )}
    </div>
  );
}
