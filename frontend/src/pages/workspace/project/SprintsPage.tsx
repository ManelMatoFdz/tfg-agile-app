import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, ChevronRight, LayoutDashboard, BarChart2, X, Zap } from 'lucide-react';
import type { Sprint, Task, TaskPriority, TaskStatus } from '../../../types';
import { sprintsApi, type CreateSprintDto } from '../../../api/sprints';
import { tasksApi, type UpdateTaskDto, type CreateTaskDto } from '../../../api/tasks';
import TaskModal from '../../../components/kanban/TaskModal';
import Alert from '../../../components/ui/Alert';
import { useProjectMember } from '../../../hooks/useProjectMember';

// ── Color maps (theme-independent hex) ───────────────────────────────────────

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f59e0b',
  MEDIUM:   '#3b82f6',
  LOW:      '#9ca3af',
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  TODO:        '#9ca3af',
  IN_PROGRESS: '#3b82f6',
  IN_REVIEW:   '#f59e0b',
  DONE:        '#22c55e',
};

const SPRINT_LEFT_COLOR: Record<Sprint['status'], string> = {
  PLANNING:  'var(--border)',
  ACTIVE:    'var(--accent)',
  COMPLETED: 'var(--success)',
};

// ── Shared input / button helpers ─────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  fontSize: 12,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 4,
};

const btnAccent: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5,
  padding: '5px 12px', fontSize: 12, fontWeight: 500,
  background: 'var(--accent)', color: '#fff',
  border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '5px 12px', fontSize: 12, fontWeight: 500,
  background: 'transparent', color: 'var(--text-muted)',
  border: 'none', cursor: 'pointer',
};

const btnOutline: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4,
  padding: '4px 10px', fontSize: 11, fontWeight: 500,
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-muted)', cursor: 'pointer',
};

// ── Overlay modal wrapper ─────────────────────────────────────────────────────

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        backgroundColor: 'var(--bg-overlay)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}

const modalBox: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-lg)',
};

// ── CreateSprintModal ─────────────────────────────────────────────────────────

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
    <ModalOverlay onClose={onClose}>
      <div style={{ ...modalBox, maxWidth: 440 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 12px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {t('projects.sprints.create.title')}
          </h2>
          <button onClick={onClose} style={{ ...btnSecondary, padding: 4, borderRadius: 'var(--radius-sm)' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && (
            <div style={{ fontSize: 11, color: 'var(--danger)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', padding: '6px 10px' }}>
              {error}
            </div>
          )}

          <div>
            <label style={labelStyle}>{t('projects.sprints.create.name')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder={t('projects.sprints.create.namePlaceholder')} autoFocus style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>
              {t('projects.sprints.create.goal')}{' '}
              <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>({t('common.optional')})</span>
            </label>
            <textarea value={goal} onChange={(e) => setGoal(e.target.value)}
              placeholder={t('projects.sprints.create.goalPlaceholder')} rows={2}
              style={{ ...inputStyle, resize: 'none' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>
                {t('projects.sprints.create.startDate')}{' '}
                <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>({t('common.optional')})</span>
              </label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>
                {t('projects.sprints.create.endDate')}{' '}
                <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>({t('common.optional')})</span>
              </label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '10px 18px 14px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={btnSecondary}>{t('common.cancel')}</button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            style={{ ...btnAccent, opacity: loading || !name.trim() ? 0.5 : 1, cursor: loading || !name.trim() ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!loading && name.trim()) (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; }}
          >
            {loading ? '…' : t('projects.sprints.create.submit')}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ── SprintPlanningModal ───────────────────────────────────────────────────────

interface SprintPlanningModalProps {
  sprintId: string;
  projectId: string;
  sprintGoal?: string | null;
  existingTaskIds: Set<string>;
  onClose: () => void;
  onAdd: (tasks: Task[]) => void;
}

function SprintPlanningModal({ sprintId, projectId, sprintGoal, existingTaskIds, onClose, onAdd }: SprintPlanningModalProps) {
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

  const selectedPoints = backlog
    .filter((t) => selected.has(t.id))
    .reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

  const unestimatedCount = backlog.filter((t) => t.storyPoints == null).length;

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ ...modalBox, maxWidth: 520, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 2rem)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 18px 10px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {t('projects.sprints.planning.title')}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-faint)' }}>
              {t('projects.sprints.planning.subtitle')}
            </p>
          </div>
          <button onClick={onClose} style={{ ...btnSecondary, padding: 4, borderRadius: 'var(--radius-sm)', marginTop: 1 }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '10px 18px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sprintGoal && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 6,
              background: 'var(--accent-muted)', border: '1px solid var(--accent)',
              borderRadius: 'var(--radius-sm)', padding: '6px 10px',
            }}>
              <Zap size={12} strokeWidth={2} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {t('projects.sprints.planning.goal')}: {sprintGoal}
              </p>
            </div>
          )}

          {!loading && unestimatedCount > 0 && (
            <div style={{
              fontSize: 11, color: '#d97706',
              background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)',
              borderRadius: 'var(--radius-sm)', padding: '5px 10px',
            }}>
              {t('projects.sprints.planning.unestimated', { count: unestimatedCount })}
            </div>
          )}

          {error && (
            <div style={{ fontSize: 11, color: 'var(--danger)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', padding: '5px 10px' }}>
              {error}
            </div>
          )}
        </div>

        {/* Backlog list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px', minHeight: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : backlog.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '40px 0' }}>
              {t('projects.sprints.planning.noBacklog')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {backlog.map((task) => (
                <label
                  key={task.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 8px', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(task.id)}
                    onChange={() => toggle(task.id)}
                    style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--accent)', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-faint)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {task.description}
                      </p>
                    )}
                  </div>
                  <span style={{
                    flexShrink: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                    color: PRIORITY_COLOR[task.priority],
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {t(`tasks.priority.${task.priority}`)}
                  </span>
                  {task.storyPoints != null ? (
                    <span style={{
                      flexShrink: 0, fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)',
                      color: 'var(--text-faint)', background: 'var(--bg-hover)',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1px 5px',
                    }}>
                      {task.storyPoints}
                    </span>
                  ) : (
                    <span style={{
                      flexShrink: 0, fontSize: 9, fontWeight: 600, letterSpacing: '0.03em',
                      color: '#d97706', background: 'rgba(217,119,6,0.08)',
                      border: '1px solid rgba(217,119,6,0.2)',
                      borderRadius: 'var(--radius-sm)', padding: '1px 5px',
                    }}>
                      {t('projects.sprints.planning.noEstimate')}
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 18px 14px', borderTop: '1px solid var(--border)', marginTop: 4,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
            {selected.size > 0 && `${selected.size} sel.${selectedPoints > 0 ? ` · ${selectedPoints} pts` : ''}`}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onClose} style={btnSecondary}>{t('common.cancel')}</button>
            <button
              onClick={handleAdd}
              disabled={saving || selected.size === 0}
              style={{ ...btnAccent, opacity: saving || selected.size === 0 ? 0.5 : 1, cursor: saving || selected.size === 0 ? 'not-allowed' : 'pointer' }}
              onMouseEnter={e => { if (!saving && selected.size > 0) (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; }}
            >
              {saving ? '…' : t('projects.sprints.planning.addSelected')}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ── SprintReviewModal ─────────────────────────────────────────────────────────

interface SprintReviewModalProps {
  sprint: Sprint;
  sprintTasks: Task[];
  onClose: () => void;
  onConfirm: (reviewNotes: string) => void;
  loading: boolean;
}

function SprintReviewModal({ sprint, sprintTasks, onClose, onConfirm, loading }: SprintReviewModalProps) {
  const { t } = useTranslation();
  const [reviewNotes, setReviewNotes] = useState('');

  const doneTasks = sprintTasks.filter((t) => t.status === 'DONE');
  const incompleteTasks = sprintTasks.filter((t) => t.status !== 'DONE');
  const donePoints = doneTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ ...modalBox, maxWidth: 500, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 2rem)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 12px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {t('projects.sprints.review.title')}
          </h2>
          <button onClick={onClose} style={{ ...btnSecondary, padding: 4, borderRadius: 'var(--radius-sm)' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { value: doneTasks.length, label: t('projects.sprints.review.done'), color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
              { value: incompleteTasks.length, label: t('projects.sprints.review.incomplete'), color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
              { value: donePoints, label: t('projects.sprints.review.velocity'), color: 'var(--accent)', bg: 'var(--accent-muted)' },
            ].map((stat) => (
              <div key={stat.label} style={{ background: stat.bg, borderRadius: 'var(--radius-md)', padding: '10px 8px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: stat.color, fontFamily: 'var(--font-mono)' }}>{stat.value}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: stat.color, opacity: 0.8 }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {incompleteTasks.length > 0 && (
            <div style={{
              fontSize: 11, color: '#d97706',
              background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)',
              borderRadius: 'var(--radius-sm)', padding: '6px 10px',
            }}>
              {t('projects.sprints.review.incompleteWarning', { count: incompleteTasks.length })}
            </div>
          )}

          <div>
            <label style={labelStyle}>
              {t('projects.sprints.review.notes')}{' '}
              <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>({t('common.optional')})</span>
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={t('projects.sprints.review.notesPlaceholder')}
              rows={4}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '10px 18px 14px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={btnSecondary}>{t('common.cancel')}</button>
          <button
            onClick={() => onConfirm(reviewNotes)}
            disabled={loading}
            style={{
              ...btnAccent, opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer',
              background: '#16a34a',
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#15803d'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#16a34a'; }}
          >
            {loading ? '…' : t('projects.sprints.review.complete')}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ── SprintsPage ───────────────────────────────────────────────────────────────

export default function SprintsPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();

  const { canManageSprint, canPlanSprint, canDeleteTask } = useProjectMember(projectId);

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sprintTasks, setSprintTasks] = useState<Record<string, Task[]>>({});
  const [loadingTasksId, setLoadingTasksId] = useState<string | null>(null);
  const [planningSprintId, setPlanningSprintId] = useState<string | null>(null);
  const [reviewSprintId, setReviewSprintId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<Task | null | undefined>(undefined);
  const [editTaskSprintId, setEditTaskSprintId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'activate'; sprintId: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    sprintsApi
      .listSprints(projectId)
      .then(setSprints)
      .catch(() => setError(t('projects.sprints.loadError')))
      .finally(() => setLoading(false));
  }, [projectId, t]);

  const handleExpand = async (sprintId: string) => {
    if (expandedId === sprintId) { setExpandedId(null); return; }
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

  const handleComplete = async (sprintId: string, reviewNotes?: string) => {
    setActionLoading(true);
    try {
      const updated = await sprintsApi.completeSprint(sprintId, reviewNotes ? { reviewNotes } : undefined);
      setSprints((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSprintTasks((prev) => ({ ...prev, [sprintId]: [] }));
      setReviewSprintId(null);
    } catch {
      setError(t('projects.sprints.completeError'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFromSprint = async (sprintId: string, taskId: string) => {
    try {
      await sprintsApi.removeTaskFromSprint(sprintId, taskId);
      setSprintTasks((prev) => ({ ...prev, [sprintId]: (prev[sprintId] ?? []).filter((t) => t.id !== taskId) }));
    } catch {
      setError(t('projects.sprints.loadError'));
    }
  };

  const handleSaveTask = async (dto: CreateTaskDto | UpdateTaskDto) => {
    if (!editTask) return;
    const updated = await tasksApi.update(editTask.id, dto as UpdateTaskDto);
    if (editTaskSprintId) {
      setSprintTasks((prev) => ({
        ...prev,
        [editTaskSprintId]: (prev[editTaskSprintId] ?? []).map((t) => (t.id === updated.id ? updated : t)),
      }));
    }
  };

  const handleMoveTask = async (status: TaskStatus) => {
    if (!editTask) return;
    const updated = await tasksApi.move(editTask.id, { status, position: 0 });
    if (editTaskSprintId) {
      setSprintTasks((prev) => ({
        ...prev,
        [editTaskSprintId]: (prev[editTaskSprintId] ?? []).map((t) => (t.id === updated.id ? updated : t)),
      }));
    }
  };

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

  const handleAddToSprint = (sprintId: string, added: Task[]) => {
    setSprintTasks((prev) => ({ ...prev, [sprintId]: [...(prev[sprintId] ?? []), ...added] }));
  };

  const formatDate = (date: string | null | undefined) =>
    date ? new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  const totalPoints = (sprintId: string) =>
    (sprintTasks[sprintId] ?? []).reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.015em' }}>
            {t('projects.sprints.title')}
          </h2>
          {!loading && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-faint)',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '1px 6px', fontFamily: 'var(--font-mono)',
            }}>
              {sprints.length}
            </span>
          )}
        </div>
        {canManageSprint && (
          <button
            onClick={() => setShowCreate(true)}
            style={btnAccent}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            <Plus size={12} strokeWidth={2.5} />
            {t('projects.sprints.newSprint')}
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : sprints.length === 0 ? (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Zap size={18} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>{t('projects.sprints.noSprints')}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>{t('projects.sprints.noSprintsSubtitle')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderLeft: `2px solid ${SPRINT_LEFT_COLOR[sprint.status]}`,
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}
              >
                {/* Sprint header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
                  {/* Expand */}
                  <button
                    onClick={() => handleExpand(sprint.id)}
                    style={{ flexShrink: 0, border: 'none', background: 'transparent', padding: 2, cursor: 'pointer', color: 'var(--text-faint)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-faint)'; }}
                  >
                    <ChevronRight
                      size={14}
                      strokeWidth={2}
                      style={{ transition: `transform var(--duration)`, transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    />
                  </button>

                  {/* Name + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                        {sprint.name}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                        color: sprint.status === 'ACTIVE' ? 'var(--accent)' : sprint.status === 'COMPLETED' ? '#16a34a' : 'var(--text-faint)',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {t(`projects.sprints.status.${sprint.status}`)}
                      </span>
                      {isExpanded && tasks.length > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                          {tasks.length} {tasks.length === 1 ? t('projects.sprints.task') : t('projects.sprints.tasks')}
                          {pts > 0 && ` · ${pts} pts`}
                        </span>
                      )}
                    </div>
                    {(startFmt || endFmt || sprint.goal) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 1 }}>
                        {(startFmt || endFmt) && (
                          <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                            {startFmt ?? '—'} → {endFmt ?? '—'}
                          </span>
                        )}
                        {sprint.goal && (
                          <span style={{ fontSize: 10, color: 'var(--text-faint)', fontStyle: 'italic', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 200 }}>
                            {sprint.goal}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {sprint.status === 'PLANNING' && canManageSprint && (
                      confirmThis === 'activate' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t('projects.sprints.activateConfirm')}</span>
                          <button
                            onClick={() => handleActivate(sprint.id)}
                            disabled={actionLoading}
                            style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            {t('common.confirm')}
                          </button>
                          <button
                            onClick={() => setConfirmAction(null)}
                            style={{ fontSize: 11, color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmAction({ type: 'activate', sprintId: sprint.id })}
                          style={{ ...btnOutline, color: 'var(--accent)', borderColor: 'var(--accent)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-muted)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          {t('projects.sprints.activate')}
                        </button>
                      )
                    )}

                    {sprint.status === 'ACTIVE' && (
                      <>
                        <Link
                          to={`/workspaces/${workspaceId}/projects/${projectId}/board`}
                          style={{ ...btnOutline, textDecoration: 'none' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <LayoutDashboard size={11} strokeWidth={1.75} />
                          {t('projects.sprints.viewBoard')}
                        </Link>
                        {canManageSprint && (
                          <button
                            onClick={() => { setReviewSprintId(sprint.id); if (!sprintTasks[sprint.id]) handleExpand(sprint.id); }}
                            style={{ ...btnOutline, color: '#16a34a', borderColor: '#16a34a' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(22,163,74,0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            {t('projects.sprints.complete')}
                          </button>
                        )}
                      </>
                    )}

                    <Link
                      to={`/workspaces/${workspaceId}/projects/${projectId}/sprints/${sprint.id}/report`}
                      style={{ ...btnOutline, textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <BarChart2 size={11} strokeWidth={1.75} />
                      {t('projects.sprints.viewReport')}
                    </Link>
                  </div>
                </div>

                {/* Expanded: task list */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {isLoadingTasks ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                        <div style={{ width: 18, height: 18, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      </div>
                    ) : tasks.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', padding: '20px 0' }}>
                        {t('projects.sprints.noTasks')}
                      </p>
                    ) : (
                      <div>
                        {tasks.map((task, idx) => (
                          <div
                            key={task.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '7px 12px',
                              borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            {/* Priority dot */}
                            <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[task.priority] }} />

                            {/* Title */}
                            <button
                              onClick={() => { setEditTask(task); setEditTaskSprintId(sprint.id); }}
                              style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-faint)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                  {task.description}
                                </p>
                              )}
                            </button>

                            {/* Status */}
                            <span style={{
                              flexShrink: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
                              textTransform: 'uppercase', color: STATUS_COLOR[task.status],
                              fontFamily: 'var(--font-mono)',
                            }}>
                              {t(`tasks.status.${task.status}`)}
                            </span>

                            {/* Story points */}
                            {task.storyPoints != null ? (
                              <span style={{
                                flexShrink: 0, fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)',
                                color: 'var(--text-faint)', background: 'var(--bg-hover)',
                                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1px 5px',
                              }}>
                                {task.storyPoints}
                              </span>
                            ) : (
                              <span style={{ flexShrink: 0, width: 28 }} />
                            )}

                            {/* Remove */}
                            {sprint.status !== 'COMPLETED' && canPlanSprint && (
                              <button
                                onClick={() => handleRemoveFromSprint(sprint.id, task.id)}
                                title={t('projects.sprints.removeTask')}
                                style={{
                                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  width: 20, height: 20, border: 'none', background: 'transparent',
                                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                  color: 'var(--text-faint)', opacity: 0,
                                  transition: `opacity var(--duration), background var(--duration), color var(--duration)`,
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--danger-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--danger)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-faint)'; }}
                                // Show on parent hover via CSS can't be done inline; use always visible at lower opacity
                              >
                                <X size={11} strokeWidth={2} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Sprint planning button */}
                    {sprint.status !== 'COMPLETED' && canPlanSprint && (
                      <div style={{ padding: '6px 12px 10px', borderTop: '1px solid var(--border)' }}>
                        <button
                          onClick={() => { setPlanningSprintId(sprint.id); if (!sprintTasks[sprint.id]) handleExpand(sprint.id); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 11, fontWeight: 500, color: 'var(--text-faint)',
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            transition: `color var(--duration)`,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                        >
                          <Plus size={11} strokeWidth={2.5} />
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
          sprintGoal={sprints.find((s) => s.id === planningSprintId)?.goal}
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
          onDelete={editTask && canDeleteTask ? handleDeleteTask : undefined}
        />
      )}

      {reviewSprintId && (() => {
        const sprint = sprints.find((s) => s.id === reviewSprintId);
        if (!sprint) return null;
        return (
          <SprintReviewModal
            sprint={sprint}
            sprintTasks={sprintTasks[reviewSprintId] ?? []}
            onClose={() => setReviewSprintId(null)}
            onConfirm={(notes) => handleComplete(reviewSprintId, notes)}
            loading={actionLoading}
          />
        );
      })()}
    </div>
  );
}