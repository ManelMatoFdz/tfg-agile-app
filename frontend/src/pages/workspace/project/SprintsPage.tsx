import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, X, Zap, BookOpen, CheckSquare, Bug,
  Calendar, BarChart2, Columns2, PlayCircle, CheckCircle2, CalendarClock,
  Pencil, Trash2, ListChecks,
} from 'lucide-react';
import type { Sprint, SprintTaskSnapshot, Task, TaskType } from '../../../types';

const TYPE_ICON_MAP: Record<TaskType, { icon: typeof BookOpen; color: string }> = {
  STORY: { icon: BookOpen, color: '#7C3AED' },
  TASK:  { icon: CheckSquare, color: '#2563EB' },
  BUG:   { icon: Bug, color: '#DC2626' },
};
import { sprintsApi, type CreateSprintDto } from '../../../api/sprints';
import { tasksApi, type UpdateTaskDto, type CreateTaskDto } from '../../../api/tasks';
import TaskModal from '../../../components/kanban/TaskModal';
import SnapshotModal from '../../../components/sprints/SnapshotModal';
import Alert from '../../../components/ui/Alert';
import PageTitle from '../../../components/motion/PageTitle';
import { useProjectMember } from '../../../hooks/useProjectMember';
import { useBoardColumns } from '../../../hooks/useBoardColumns';

// ── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 13,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 4,
};

const btnAccent: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', fontSize: 13, fontWeight: 600,
  background: 'var(--accent)', color: 'var(--accent-fg)',
  border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '5px 12px', fontSize: 12, fontWeight: 500,
  background: 'transparent', color: 'var(--text-muted)',
  border: 'none', cursor: 'pointer',
};

const btnOutline: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4,
  padding: '6px 12px', fontSize: 12, fontWeight: 500,
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-muted)', cursor: 'pointer',
};

// ── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, color, title }: {
  icon: typeof PlayCircle;
  color: string;
  title: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
      <Icon size={22} strokeWidth={2} style={{ color }} />
      <h3 style={{
        margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text)',
        letterSpacing: '-0.02em',
      }}>
        {title}
      </h3>
    </div>
  );
}

// ── Overlay modal wrapper ────────────────────────────────────────────────────

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
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
      {children}
    </div>
  );
}

const modalBox: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-md)',
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

  const canSubmit = name.trim() && startDate && endDate;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const dto: CreateSprintDto = {
        name: name.trim(),
        goal: goal.trim() || undefined,
        startDate,
        endDate,
      };
      const sprint = await sprintsApi.createSprint(projectId, dto);
      onCreate(sprint);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? '';
      if (msg.includes('SPRINT_DATES_OVERLAP')) {
        setError(t('projects.sprints.create.overlapError'));
      } else {
        setError(t('projects.sprints.create.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ ...modalBox, maxWidth: 480 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {t('projects.sprints.create.title')}
          </h2>
          <button onClick={onClose} style={{ ...btnSecondary, padding: 4, borderRadius: 'var(--radius-sm)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ fontSize: 12, color: 'var(--danger)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
              {error}
            </div>
          )}

          <div>
            <label style={labelStyle}>{t('projects.sprints.create.name')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder={t('projects.sprints.create.namePlaceholder')} autoFocus style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('projects.sprints.create.startDate')}</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('projects.sprints.create.endDate')}</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t('projects.sprints.create.goal')}</label>
            <textarea value={goal} onChange={(e) => setGoal(e.target.value)}
              placeholder={t('projects.sprints.create.goalPlaceholder')} rows={3}
              style={{ ...inputStyle, resize: 'none' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px 16px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={btnSecondary}>{t('common.cancel')}</button>
          <button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            style={{ ...btnAccent, opacity: loading || !canSubmit ? 0.5 : 1, cursor: loading || !canSubmit ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!loading && canSubmit) (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; }}
          >
            {loading ? '...' : t('projects.sprints.create.submit')}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ── EditSprintModal ──────────────────────────────────────────────────────────

interface EditSprintModalProps {
  sprint: Sprint;
  onClose: () => void;
  onUpdate: (sprint: Sprint) => void;
}

function EditSprintModal({ sprint, onClose, onUpdate }: EditSprintModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(sprint.name);
  const [goal, setGoal] = useState(sprint.goal ?? '');
  const [startDate, setStartDate] = useState(sprint.startDate ?? '');
  const [endDate, setEndDate] = useState(sprint.endDate ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = sprint.status === 'ACTIVE';
  const canSubmit = name.trim() && (isActive || (startDate && endDate));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await sprintsApi.updateSprint(sprint.id, {
        name: name.trim(),
        goal: goal.trim() || undefined,
        ...(isActive ? {} : { startDate: startDate || undefined, endDate: endDate || undefined }),
      });
      onUpdate(updated);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? '';
      if (msg.includes('SPRINT_DATES_OVERLAP')) {
        setError(t('projects.sprints.create.overlapError'));
      } else {
        setError(t('projects.sprints.edit.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ ...modalBox, maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {t('projects.sprints.edit.title')}
          </h2>
          <button onClick={onClose} style={{ ...btnSecondary, padding: 4, borderRadius: 'var(--radius-sm)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ fontSize: 12, color: 'var(--danger)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
              {error}
            </div>
          )}
          <div>
            <label style={labelStyle}>{t('projects.sprints.create.name')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder={t('projects.sprints.create.namePlaceholder')} autoFocus style={inputStyle} />
          </div>
          {!isActive && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>{t('projects.sprints.create.startDate')}</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t('projects.sprints.create.endDate')}</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
              </div>
            </div>
          )}
          <div>
            <label style={labelStyle}>{t('projects.sprints.create.goal')}</label>
            <textarea value={goal} onChange={(e) => setGoal(e.target.value)}
              placeholder={t('projects.sprints.create.goalPlaceholder')} rows={3}
              style={{ ...inputStyle, resize: 'none' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px 16px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={btnSecondary}>{t('common.cancel')}</button>
          <button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            style={{ ...btnAccent, opacity: loading || !canSubmit ? 0.5 : 1, cursor: loading || !canSubmit ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!loading && canSubmit) (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; }}
          >
            {loading ? '...' : t('projects.sprints.edit.submit')}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{
        height: 8, borderRadius: 4,
        background: 'var(--border)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 4,
          background: 'var(--accent)',
          width: `${pct}%`,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}

// ── Date formatter ───────────────────────────────────────────────────────────

function formatDateShort(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

// ── SprintsPage ──────────────────────────────────────────────────────────────

export default function SprintsPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();

  const { canManageSprint, canPlanSprint, canAddToActiveSprint, canEditSprintTask, canMoveTask, canDeleteSprintTask } = useProjectMember(projectId);
  const columns = useBoardColumns(projectId);

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editSprint, setEditSprint] = useState<Sprint | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [sprintTasks, setSprintTasks] = useState<Record<string, Task[]>>({});
  const [sprintSnapshots, setSprintSnapshots] = useState<Record<string, SprintTaskSnapshot[]>>({});
  const [editTask, setEditTask] = useState<Task | null | undefined>(undefined);
  const [editTaskSprintId, setEditTaskSprintId] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SprintTaskSnapshot | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmActivate, setConfirmActivate] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    sprintsApi
      .listSprints(projectId)
      .then(setSprints)
      .catch(() => setError(t('projects.sprints.loadError')))
      .finally(() => setLoading(false));
  }, [projectId, t]);

  // Auto-load tasks for active sprint
  const activeSprint = sprints.find((s) => s.status === 'ACTIVE');
  useEffect(() => {
    if (activeSprint && !sprintTasks[activeSprint.id]) {
      sprintsApi.getSprintTasks(activeSprint.id)
        .then((tasks) => setSprintTasks((prev) => ({ ...prev, [activeSprint.id]: tasks })))
        .catch(() => {});
    }
  }, [activeSprint, sprintTasks]);

  const handleDeleteSprint = async (sprintId: string) => {
    setActionLoading(true);
    try {
      await sprintsApi.deleteSprint(sprintId);
      setSprints((prev) => prev.filter((s) => s.id !== sprintId));
      setSprintTasks((prev) => { const next = { ...prev }; delete next[sprintId]; return next; });
      setConfirmDelete(null);
    } catch {
      setError(t('projects.sprints.deleteError'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateSprint = async (sprintId: string) => {
    setActionLoading(true);
    try {
      const updated = await sprintsApi.activateSprint(sprintId);
      setSprints((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
      setConfirmActivate(null);
      // Load tasks for newly active sprint
      sprintsApi.getSprintTasks(sprintId)
        .then((tasks) => setSprintTasks((prev) => ({ ...prev, [sprintId]: tasks })))
        .catch(() => {});
    } catch {
      setError(t('projects.sprints.activateError'));
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

  const handleMoveTask = async (status: string) => {
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

  // Categorize sprints
  const plannedSprints = sprints.filter((s) => s.status === 'PLANNING');
  const completedSprints = sprints.filter((s) => s.status === 'COMPLETED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <PageTitle as="h2" style={{ fontSize: 28, marginBottom: 4 }}>
            {t('projects.sprints.title')}
          </PageTitle>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--text-faint)' }}>
            {t('projects.sprints.subtitle')}
          </p>
        </div>
        {canManageSprint && (
          <button
            onClick={() => setShowCreate(true)}
            style={btnAccent}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            <Plus size={14} strokeWidth={2.5} />
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
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Zap size={22} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>{t('projects.sprints.noSprints')}</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-faint)' }}>{t('projects.sprints.noSprintsSubtitle')}</p>
        </div>
      ) : (
        <>
          {/* ── Active Sprint ── */}
          <div>
            <SectionHeader icon={PlayCircle} color="var(--accent)" title={t('projects.sprints.activeSprint')} />

            {activeSprint ? (() => {
              const tasks = sprintTasks[activeSprint.id] ?? [];
              const doneCount = tasks.filter((t) => t.status === 'DONE').length;
              const totalCount = tasks.length;
              const totalPts = tasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);

              return (
                <div style={{
                  marginTop: 12,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}>
                  <div style={{ display: 'flex', gap: 0 }}>
                    {/* Left: info */}
                    <div style={{ flex: 1, padding: '20px 24px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                          color: 'var(--accent)', background: 'var(--accent-muted)',
                          padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                        }}>
                          {t('projects.sprints.current')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                          {activeSprint.name}
                        </h3>
                        {canManageSprint && (
                          <button
                            onClick={() => setEditSprint(activeSprint)}
                            style={{ ...btnOutline, marginBottom: 8 }}
                            title={t('common.edit')}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <Pencil size={12} strokeWidth={2} />
                          </button>
                        )}
                      </div>
                      <p style={{
                        margin: '0 0 12px', fontSize: 13, color: 'var(--text-faint)',
                        fontStyle: activeSprint.goal ? 'normal' : 'italic',
                      }}>
                        {activeSprint.goal
                          ? `${t('projects.sprints.planning.goal')}: ${activeSprint.goal}`
                          : t('projects.sprints.noGoal')}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={14} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
                            {formatDateShort(activeSprint.startDate)} - {formatDateShort(activeSprint.endDate)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Zap size={14} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
                            {totalPts} {t('projects.sprints.storyPointsLabel')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: progress + report */}
                    <div style={{
                      flex: '0 0 40%', padding: '24px 28px',
                      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {t('projects.sprints.progress')}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
                          {t('projects.sprints.tasksDone', { done: doneCount, total: totalCount })}
                        </span>
                      </div>
                      <ProgressBar done={doneCount} total={totalCount} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link
                          to={`/workspaces/${workspaceId}/projects/${projectId}/sprints/${activeSprint.id}/backlog`}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '8px 14px', fontSize: 12, fontWeight: 500,
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text)', cursor: 'pointer',
                            textDecoration: 'none', flex: 1,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <ListChecks size={14} strokeWidth={2} />
                          {t('projects.sprints.sprintBacklog.button')}
                        </Link>
                        <Link
                          to={`/workspaces/${workspaceId}/projects/${projectId}/sprints/${activeSprint.id}/report`}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '8px 14px', fontSize: 12, fontWeight: 500,
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text)', cursor: 'pointer',
                            textDecoration: 'none', flex: 1,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <BarChart2 size={14} strokeWidth={2} />
                          {t('projects.sprints.viewReport')}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic' }}>
                {t('projects.sprints.noActiveSprint')}
              </p>
            )}
          </div>

          {/* ── Planned Sprints ── */}
          <div>
            <SectionHeader icon={CalendarClock} color="#E08A2E" title={t('projects.sprints.plannedSprints')} />

            {plannedSprints.length === 0 ? (
              <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic' }}>
                {t('projects.sprints.noPlanned')}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {plannedSprints.map((sprint) => {
                  const isDeleting = confirmDelete === sprint.id;

                  return (
                    <div
                      key={sprint.id}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px 20px',
                        display: 'flex', alignItems: 'center', gap: 16,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                          {sprint.name}
                        </h4>
                        <p style={{
                          margin: '0 0 8px', fontSize: 12, color: 'var(--text-faint)',
                          fontStyle: sprint.goal ? 'normal' : 'italic',
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        }}>
                          {sprint.goal
                            ? `${t('projects.sprints.planning.goal')}: ${sprint.goal}`
                            : t('projects.sprints.noGoal')}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={14} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
                              {formatDateShort(sprint.startDate)} - {formatDateShort(sprint.endDate)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {isDeleting ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{t('projects.sprints.deleteConfirm')}</span>
                            <button
                              onClick={() => handleDeleteSprint(sprint.id)}
                              disabled={actionLoading}
                              style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                              {t('common.delete')}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              style={{ fontSize: 12, color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        ) : canManageSprint && (
                          <>
                            <Link
                              to={`/workspaces/${workspaceId}/projects/${projectId}/sprints/${sprint.id}/planning`}
                              style={{ ...btnOutline, color: 'var(--accent)', borderColor: 'var(--accent)', textDecoration: 'none' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-muted)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <Columns2 size={12} strokeWidth={2} />
                              {t('projects.sprints.planning.title')}
                            </Link>
                            {sprint.startDate && new Date(sprint.startDate) <= new Date(new Date().toDateString()) && (
                              <button
                                onClick={() => setConfirmActivate(sprint.id)}
                                style={{ ...btnOutline, color: 'var(--success)', borderColor: 'var(--success)' }}
                                title={t('projects.sprints.activate')}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--success-bg, rgba(34,197,94,0.1))')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                <PlayCircle size={12} strokeWidth={2} />
                                {t('projects.sprints.activate')}
                              </button>
                            )}
                            <button
                              onClick={() => setEditSprint(sprint)}
                              style={btnOutline}
                              title={t('common.edit')}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <Pencil size={12} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(sprint.id)}
                              style={{ ...btnOutline, color: 'var(--danger)', borderColor: 'var(--danger)' }}
                              title={t('common.delete')}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-bg)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <Trash2 size={12} strokeWidth={2} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Completed Sprints ── */}
          <div>
            <SectionHeader icon={CheckCircle2} color="var(--success)" title={t('projects.sprints.completedSprints')} />

            {completedSprints.length === 0 ? (
              <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic' }}>
                {t('projects.sprints.noCompleted')}
              </p>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12, marginTop: 12,
              }}>
                {completedSprints.map((sprint) => {
                  const doneTasks = sprint.closedDoneTasks ?? 0;
                  const totalTasks = sprint.closedTotalTasks ?? 0;
                  const doneSP = sprint.closedDoneStoryPoints ?? 0;

                  return (
                    <Link
                      key={sprint.id}
                      to={`/workspaces/${workspaceId}/projects/${projectId}/sprints/${sprint.id}/report`}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px 18px',
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'border-color 0.15s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <CheckCircle2 size={14} strokeWidth={2} style={{ color: 'var(--success)' }} />
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                          {sprint.name}
                        </h4>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                          {formatDateShort(sprint.startDate)} - {formatDateShort(sprint.endDate)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {doneTasks}/{totalTasks} {t('projects.sprints.tasks')}
                        </span>
                        {doneSP > 0 && (
                          <span style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                            {doneSP} pts
                          </span>
                        )}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <ProgressBar done={doneTasks} total={totalTasks} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {showCreate && projectId && (
        <CreateSprintModal
          projectId={projectId}
          onClose={() => setShowCreate(false)}
          onCreate={(sprint) => setSprints((prev) => [...prev, sprint])}
        />
      )}

      {editSprint && (
        <EditSprintModal
          sprint={editSprint}
          onClose={() => setEditSprint(null)}
          onUpdate={(updated) => {
            setSprints((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
            setEditSprint(null);
          }}
        />
      )}

      {editTask !== undefined && (() => {
        const taskSprint = sprints.find((s) => s.id === editTaskSprintId);
        const isCompleted = taskSprint?.status === 'COMPLETED';
        const isActive = taskSprint?.status === 'ACTIVE';
        return (
          <TaskModal
            task={editTask}
            projectId={projectId}
            columns={columns}
            defaultStatus="TODO"
            readOnly={isCompleted || (isActive && !canEditSprintTask)}
            onClose={() => { setEditTask(undefined); setEditTaskSprintId(null); }}
            onSave={!isCompleted && canEditSprintTask ? handleSaveTask : undefined}
            onMove={editTask && isActive && canMoveTask ? handleMoveTask : undefined}
            onDelete={editTask && !isCompleted && canDeleteSprintTask ? handleDeleteTask : undefined}
          />
        );
      })()}

      {confirmActivate && (
        <ModalOverlay onClose={() => setConfirmActivate(null)}>
          <div style={{ ...modalBox, maxWidth: 420 }}>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                {t('projects.sprints.activateConfirm.title')}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {t('projects.sprints.activateConfirm.message')}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 24px 16px', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setConfirmActivate(null)} style={btnSecondary}>
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleActivateSprint(confirmActivate)}
                disabled={actionLoading}
                style={{ ...btnAccent, opacity: actionLoading ? 0.5 : 1 }}
              >
                {actionLoading ? '...' : t('projects.sprints.activate')}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {selectedSnapshot && (
        <SnapshotModal
          snapshot={selectedSnapshot}
          onClose={() => setSelectedSnapshot(null)}
          columns={columns}
        />
      )}
    </div>
  );
}