import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, X, Plus, PlayCircle, Lock, Link2, Search,
  GitBranch, GitCommit, GitPullRequest, ExternalLink,
} from 'lucide-react';
import type { Task, TaskPriority, Label, Epic, TaskDependency, GitEvent, Sprint } from '../../../types';
import type { UpdateTaskDto } from '../../../api/tasks';
import { tasksApi } from '../../../api/tasks';
import { sprintsApi } from '../../../api/sprints';
import { labelsApi } from '../../../api/labels';
import { epicsApi } from '../../../api/epics';
import { dependenciesApi } from '../../../api/dependencies';
import { gitApi, taskGitRef } from '../../../api/git';
import { useProjectMembers } from '../../../hooks/useProjectMembers';
import { useProjectMember } from '../../../hooks/useProjectMember';
import { useBoardColumns, getStatusLabel, getStatusColor } from '../../../hooks/useBoardColumns';
import TaskComments from '../../../components/kanban/TaskComments';
import TaskActivityFeed from '../../../components/kanban/TaskActivityFeed';
import SubtaskModal from '../../../components/kanban/SubtaskModal';
import { PRIORITIES, TYPE_CONFIG, PRIORITY_COLOR } from '../../../components/kanban/taskConstants';
import { sidebarLabel, fieldStyle, readOnlyFieldStyle, focusHandler, blurHandler } from '../../../components/kanban/taskFieldStyles';
import { AssigneeAvatar, AssigneeDropdown } from '../../../components/kanban/AssigneePicker';
import { LabelChip, LabelMultiSelect } from '../../../components/kanban/LabelPicker';
import { EpicDropdown } from '../../../components/kanban/EpicPicker';

type PageState = 'loading' | 'ready' | 'notfound' | 'forbidden' | 'error';

const sectionStyle: React.CSSProperties = {
  borderTop: '1px solid var(--border)',
  paddingTop: 20,
};

function httpStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

export default function TaskDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId, projectId, taskId } = useParams<{ workspaceId: string; projectId: string; taskId: string }>();

  const seededTask = (location.state as { task?: Task } | null)?.task;
  const seed = seededTask?.id === taskId ? seededTask : undefined;
  const backTo = (location.state as { from?: string } | null)?.from;

  const [task, setTask] = useState<Task | null>(seed ?? null);
  const [pageState, setPageState] = useState<PageState>(seed ? 'ready' : 'loading');

  // Form state
  const [title, setTitle] = useState(seed?.title ?? '');
  const [description, setDescription] = useState(seed?.description ?? '');
  const [definitionOfDone, setDefinitionOfDone] = useState(seed?.definitionOfDone ?? '');
  const [priority, setPriority] = useState<TaskPriority>(seed?.priority ?? 'MEDIUM');
  const [assigneeId, setAssigneeId] = useState(seed?.assigneeId ?? '');
  const [ready, setReady] = useState(seed?.ready ?? false);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(seed?.labels?.map((l) => l.id) ?? []);
  const [epicId, setEpicId] = useState(seed?.epicId ?? '');

  // Related data
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [projectLabels, setProjectLabels] = useState<Label[]>([]);
  const [projectEpics, setProjectEpics] = useState<Epic[]>([]);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [gitEvents, setGitEvents] = useState<GitEvent[]>([]);
  const [allProjectTasks, setAllProjectTasks] = useState<Task[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [selectedSubtask, setSelectedSubtask] = useState<Task | null>(null);
  const [toggledSubtaskIds, setToggledSubtaskIds] = useState<Set<string>>(new Set());
  const [showDepSearch, setShowDepSearch] = useState(false);
  const [depSearchQuery, setDepSearchQuery] = useState('');
  const [showGitLinkForm, setShowGitLinkForm] = useState(false);
  const [gitLinkUrl, setGitLinkUrl] = useState('');

  const columns = useBoardColumns(projectId);
  const { members, userMap } = useProjectMembers(projectId);
  const perms = useProjectMember(projectId);

  // ── Data loading ───────────────────────────────────────────────────────────
  // Every effect keys on `taskId`, never on `task`: navigating between tasks
  // reuses this component instance and stale sections would otherwise persist.

  const hydrate = useCallback((fresh: Task) => {
    setTask(fresh);
    setTitle(fresh.title);
    setDescription(fresh.description ?? '');
    setDefinitionOfDone(fresh.definitionOfDone ?? '');
    setPriority(fresh.priority);
    setAssigneeId(fresh.assigneeId ?? '');
    setReady(fresh.ready);
    setSelectedLabelIds(fresh.labels?.map((l) => l.id) ?? []);
    setEpicId(fresh.epicId ?? '');
    setToggledSubtaskIds(new Set());
  }, []);

  const loadTask = useCallback(() => {
    if (!taskId) return;
    tasksApi
      .getById(taskId)
      .then((fresh) => {
        hydrate(fresh);
        setPageState('ready');
      })
      .catch((err) => {
        const status = httpStatus(err);
        setPageState(status === 404 ? 'notfound' : status === 403 ? 'forbidden' : 'error');
      });
  }, [taskId, hydrate]);

  useEffect(() => {
    setPageState((prev) => (prev === 'ready' ? prev : 'loading'));
    loadTask();
  }, [loadTask]);

  useEffect(() => {
    if (!projectId) return;
    labelsApi.getByProject(projectId).then(setProjectLabels).catch(() => {});
    epicsApi.getByProject(projectId).then(setProjectEpics).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (!taskId) return;
    setSubtasks([]);
    setDependencies([]);
    setGitEvents([]);
    setAllProjectTasks([]);
    tasksApi.getSubtasks(taskId).then(setSubtasks).catch(() => {});
    dependenciesApi.getByTask(taskId).then(setDependencies).catch(() => {});
    gitApi.getTaskEvents(taskId).then(setGitEvents).catch(() => {});
  }, [taskId]);

  const sprintId = task?.sprintId ?? null;
  useEffect(() => {
    if (!sprintId) {
      setSprint(null);
      return;
    }
    sprintsApi.getSprint(sprintId).then(setSprint).catch(() => setSprint(null));
  }, [sprintId]);

  // ── URL guards ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!task || !workspaceId) return;
    if (task.parentId) {
      // A subtask id landed in the URL: subtasks live inside their parent's page.
      navigate(`/workspaces/${workspaceId}/projects/${task.projectId}/tasks/${task.parentId}`, {
        replace: true,
        state: { from: backTo, openSubtaskId: task.id },
      });
      return;
    }
    if (task.projectId !== projectId) {
      navigate(`/workspaces/${workspaceId}/projects/${task.projectId}/tasks/${task.id}`, {
        replace: true,
        state: { from: backTo },
      });
    }
  }, [task, workspaceId, projectId, navigate, backTo]);

  // Open a subtask directly when redirected here from a subtask URL.
  const openSubtaskId = (location.state as { openSubtaskId?: string } | null)?.openSubtaskId;
  useEffect(() => {
    if (!openSubtaskId || subtasks.length === 0) return;
    const found = subtasks.find((s) => s.id === openSubtaskId);
    if (found) setSelectedSubtask(found);
  }, [openSubtaskId, subtasks]);

  // ── Derived permissions ────────────────────────────────────────────────────

  const inSprint = !!task?.sprintId;
  const sprintUnknown = inSprint && !sprint;
  const isCompletedSprint = sprint?.status === 'COMPLETED';
  const isActiveSprint = sprint?.status === 'ACTIVE';

  const canEdit = perms.loading || sprintUnknown
    ? false
    : !inSprint
      ? perms.canEditBacklogTask
      : isCompletedSprint
        ? false
        : isActiveSprint
          ? perms.canEditSprintTask
          : perms.canEditSprintTask || perms.canEditBacklogTask;

  const canDelete = perms.loading || sprintUnknown
    ? false
    : !inSprint
      ? perms.canDeleteBacklogTask
      : isCompletedSprint
        ? false
        : isActiveSprint
          ? perms.canDeleteSprintTask
          : perms.canDeleteSprintTask || perms.canDeleteBacklogTask;

  const readOnlyReason = perms.loading || canEdit
    ? null
    : isCompletedSprint
      ? t('tasks.detail.readOnlyCompleted')
      : t('tasks.detail.readOnlyPermission');

  // ── Dirty tracking ─────────────────────────────────────────────────────────

  const isDirty = useMemo(() => {
    if (!task) return false;
    if (toggledSubtaskIds.size > 0) return true;
    return (
      title !== task.title ||
      description !== (task.description ?? '') ||
      definitionOfDone !== (task.definitionOfDone ?? '') ||
      priority !== task.priority ||
      assigneeId !== (task.assigneeId ?? '') ||
      ready !== task.ready ||
      epicId !== (task.epicId ?? '') ||
      [...selectedLabelIds].sort().join(',') !== (task.labels ?? []).map((l) => l.id).sort().join(',')
    );
  }, [task, title, description, definitionOfDone, priority, assigneeId, ready, epicId, selectedLabelIds, toggledSubtaskIds]);

  // ── Actions ────────────────────────────────────────────────────────────────

  // El router es declarativo (<BrowserRouter>), asi que useBlocker no esta
  // disponible: la guarda se aplica en cada salida que controlamos.
  const guardedNavigate = (go: () => void) => {
    if (isDirty) setPendingNav(() => go);
    else go();
  };

  const goBack = () => guardedNavigate(() =>
    navigate(backTo ?? `/workspaces/${workspaceId}/projects/${projectId}/board`));

  const handleSave = useCallback(async () => {
    if (!task || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const dto: UpdateTaskDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assigneeId: assigneeId || null,
        // El backend ignora labelIds y definitionOfDone cuando llegan null
        // (TaskService.update), asi que hay que enviar [] y '' para poder
        // vaciarlos: con undefined no se podia quitar la ultima etiqueta.
        labelIds: selectedLabelIds,
        ready,
        definitionOfDone: definitionOfDone.trim(),
      };
      await tasksApi.update(task.id, dto);
      if (epicId !== (task.epicId ?? '')) {
        await epicsApi.assignToTask(task.id, epicId || null);
      }
      for (const stId of toggledSubtaskIds) {
        await tasksApi.toggleSubtaskDone(stId);
      }
      loadTask();
    } catch {
      setError(t('tasks.detail.loadError'));
      // Partial writes are possible (update + epic + N toggles are not atomic):
      // refetch so the UI reflects whatever actually landed.
      loadTask();
    } finally {
      setSaving(false);
    }
  }, [task, title, description, definitionOfDone, priority, assigneeId,
    selectedLabelIds, ready, epicId, toggledSubtaskIds, loadTask, t]);

  const canSave = canEdit && !!title.trim() && isDirty && !saving;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (canSave) handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canSave, handleSave]);

  // Cubre recarga, cierre de pestana y enlaces externos.
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const handleDelete = async () => {
    if (!task) return;
    setSaving(true);
    try {
      await tasksApi.delete(task.id);
      navigate(backTo ?? `/workspaces/${workspaceId}/projects/${projectId}/board`, { replace: true });
    } catch {
      setError(t('tasks.detail.loadError'));
      setSaving(false);
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
      setError(t('tasks.detail.loadError'));
    }
  };

  const handleAddDependency = async (blockedTaskId: string) => {
    if (!task) return;
    try {
      const dep = await dependenciesApi.create(task.id, blockedTaskId);
      setDependencies((prev) => [...prev, dep]);
      setShowDepSearch(false);
      setDepSearchQuery('');
    } catch {
      setError(t('tasks.modal.dependencyError'));
    }
  };

  const handleRemoveDependency = async (depId: string) => {
    if (!task) return;
    try {
      await dependenciesApi.delete(task.id, depId);
      setDependencies((prev) => prev.filter((d) => d.id !== depId));
    } catch {
      setError(t('tasks.modal.dependencyError'));
    }
  };

  const handleLinkGitEvent = async () => {
    if (!task || !gitLinkUrl.trim()) return;
    try {
      const event = await gitApi.link(task.id, gitLinkUrl.trim());
      setGitEvents((prev) => [event, ...prev.filter((e) => e.id !== event.id)]);
      setGitLinkUrl('');
      setShowGitLinkForm(false);
    } catch {
      setError(t('tasks.modal.gitLinkError'));
    }
  };

  const handleUnlinkGitEvent = async (eventId: string) => {
    if (!task) return;
    try {
      await gitApi.unlink(task.id, eventId);
      setGitEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch {
      setError(t('tasks.modal.gitLinkError'));
    }
  };

  const openDepSearch = async () => {
    if (!projectId) return;
    setShowDepSearch(true);
    if (allProjectTasks.length === 0) {
      try {
        setAllProjectTasks(await tasksApi.getByProject(projectId));
      } catch { /* ignore */ }
    }
  };

  const openSiblingTask = (siblingId: string) => guardedNavigate(() => {
    navigate(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${siblingId}`, {
      state: { from: location.pathname },
    });
  });

  // ── Derived view data ──────────────────────────────────────────────────────

  const depSearchResults = allProjectTasks.filter((candidate) => {
    if (!task || candidate.id === task.id) return false;
    const alreadyLinked = dependencies.some((d) =>
      (d.blockingTaskId === candidate.id && d.blockedTaskId === task.id) ||
      (d.blockedTaskId === candidate.id && d.blockingTaskId === task.id));
    if (alreadyLinked) return false;
    if (!depSearchQuery.trim()) return false;
    return candidate.title.toLowerCase().includes(depSearchQuery.toLowerCase());
  }).slice(0, 8);

  const blockedByDeps = dependencies.filter((d) => d.blockedTaskId === task?.id);
  const blocksDeps = dependencies.filter((d) => d.blockingTaskId === task?.id);

  const formatDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  // ── Non-ready states ───────────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ height: 32, width: 200, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 24 }}>
          <div style={{ height: 380, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }} />
          <div style={{ height: 380, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }} />
        </div>
      </div>
    );
  }

  if (pageState !== 'ready' || !task) {
    const heading = pageState === 'forbidden' ? t('tasks.detail.forbidden')
      : pageState === 'notfound' ? t('tasks.detail.notFound')
        : t('tasks.detail.loadError');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, padding: '48px 0' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{heading}</h2>
        {pageState === 'notfound' && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{t('tasks.detail.notFoundHint')}</p>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button onClick={goBack} style={secondaryBtn}>{t('common.back')}</button>
          {pageState === 'error' && (
            <button onClick={() => { setPageState('loading'); loadTask(); }} style={primaryBtn}>
              {t('tasks.detail.retry')}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Ready ──────────────────────────────────────────────────────────────────

  const typeCfg = TYPE_CONFIG[task.type ?? 'TASK'];
  const TypeIcon = typeCfg.icon;
  const statusColor = getStatusColor(task.status, columns);
  const saveDisabled = !canSave;

  const doneColumnNames = columns.filter((c) => c.doneEquivalent).map((c) => c.name);
  const isSubtaskDone = (s: Task) =>
    doneColumnNames.length > 0 ? doneColumnNames.includes(s.status) : s.completedAt != null;
  const totalSubs = subtasks.length || task.subtaskCount;
  const doneSubs = subtasks.length > 0 ? subtasks.filter(isSubtaskDone).length : task.completedSubtaskCount;
  const subPct = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;
  const subBarColor = totalSubs > 0 && doneSubs === totalSubs ? '#16A34A' : '#3B82F6';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Action bar */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '10px 0',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <button onClick={goBack} style={{ ...secondaryBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={14} strokeWidth={2} />
            {t('common.back')}
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sprint ? `${t('tasks.detail.inSprint')} · ${sprint.name}` : t('tasks.detail.inBacklog')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {isDirty && (
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
              color: '#D97706', background: '#D9770614', border: '1px solid #D9770640',
              borderRadius: 'var(--radius-sm)', padding: '2px 8px',
            }}>
              {t('tasks.detail.unsavedBadge')}
            </span>
          )}
          {canDelete && (
            confirmDelete ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('tasks.modal.deleteConfirm')}</span>
                <button onClick={handleDelete} disabled={saving} style={dangerLinkBtn}>{t('common.delete')}</button>
                <button onClick={() => setConfirmDelete(false)} style={mutedLinkBtn}>{t('common.cancel')}</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={dangerLinkBtn}>{t('tasks.modal.deleteTask')}</button>
            )
          )}
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saveDisabled}
              style={{ ...primaryBtn, cursor: saveDisabled ? 'not-allowed' : 'pointer', opacity: saveDisabled ? 0.5 : 1 }}
            >
              {saving ? '...' : t('tasks.modal.save')}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          fontSize: 13, fontWeight: 500, color: '#DC2626',
          background: 'rgba(220,38,38,0.06)', borderLeft: '3px solid #DC2626',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
        }}>
          {error}
        </div>
      )}

      {readOnlyReason && (
        <div style={{
          fontSize: 12, color: 'var(--text-muted)',
          background: 'var(--bg-hover)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '8px 12px',
        }}>
          {readOnlyReason}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 24, alignItems: 'start' }}>
        {/* ── Main ─────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label={t('tasks.modal.titlePlaceholder')}
              placeholder={t('tasks.modal.titlePlaceholder')}
              readOnly={!canEdit}
              style={{
                ...(canEdit ? fieldStyle : readOnlyFieldStyle),
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                padding: '10px 12px',
              }}
              onFocus={(e) => { if (canEdit) focusHandler(e); }}
              onBlur={blurHandler}
            />
          </div>

          <div>
            <label style={sidebarLabel}>{t('tasks.modal.description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={canEdit ? t('tasks.modal.descriptionPlaceholder') : '--'}
              rows={5}
              readOnly={!canEdit}
              style={{ ...(canEdit ? fieldStyle : readOnlyFieldStyle), resize: 'vertical', minHeight: 100 }}
              onFocus={(e) => { if (canEdit) focusHandler(e); }}
              onBlur={blurHandler}
            />
          </div>

          <div>
            <label style={sidebarLabel}>{t('tasks.modal.definitionOfDone')}</label>
            <textarea
              value={definitionOfDone}
              onChange={(e) => setDefinitionOfDone(e.target.value)}
              placeholder={canEdit ? t('tasks.modal.dodPlaceholder') : '--'}
              rows={3}
              readOnly={!canEdit}
              style={{ ...(canEdit ? fieldStyle : readOnlyFieldStyle), resize: 'vertical', minHeight: 70 }}
              onFocus={(e) => { if (canEdit) focusHandler(e); }}
              onBlur={blurHandler}
            />
          </div>

          {/* Subtasks */}
          {task.sprintId && (
            <div style={sectionStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <label style={{ ...sidebarLabel, margin: 0 }}>{t('tasks.modal.subtasks')}</label>
                {totalSubs > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)' }}>
                    {doneSubs}/{totalSubs} {t('tasks.modal.subtaskCompleted')}
                  </span>
                )}
              </div>

              {totalSubs > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${subPct}%`, background: subBarColor, borderRadius: 3, transition: 'width 300ms ease' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: subBarColor, fontFamily: 'var(--font-mono)', minWidth: 32, textAlign: 'right' }}>
                    {subPct}%
                  </span>
                </div>
              )}

              {subtasks.map((st) => {
                const done = isSubtaskDone(st);
                const stAssignee = st.assigneeId ? userMap[st.assigneeId] : null;
                const stAssigneeName = stAssignee ? (stAssignee.fullName ?? stAssignee.username) : null;
                return (
                  <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 2px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!canEdit) return;
                        const firstCol = columns.length > 0 ? columns[0].name : 'TODO';
                        const firstDoneCol = doneColumnNames.length > 0 ? doneColumnNames[0] : 'DONE';
                        setSubtasks((prev) => prev.map((s) => {
                          if (s.id !== st.id) return s;
                          const wasDone = isSubtaskDone(s);
                          return {
                            ...s,
                            status: wasDone ? firstCol : firstDoneCol,
                            completedAt: wasDone ? null : new Date().toISOString(),
                          };
                        }));
                        setToggledSubtaskIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(st.id)) next.delete(st.id);
                          else next.add(st.id);
                          return next;
                        });
                      }}
                      style={{
                        width: 18, height: 18, borderRadius: 4,
                        border: done ? 'none' : '2px solid var(--border-strong)',
                        background: done ? '#3B82F6' : 'var(--bg-elevated)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, cursor: canEdit ? 'pointer' : 'default', padding: 0,
                        transition: 'background 150ms, border-color 150ms',
                      }}
                    >
                      {done && (
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                          <path d="M2 5.5L4.5 8L9 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <span
                      onClick={() => setSelectedSubtask(st)}
                      style={{
                        flex: 1, fontSize: 13,
                        color: done ? 'var(--text-faint)' : 'var(--text)',
                        textDecoration: done ? 'line-through' : 'none',
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        cursor: 'pointer',
                      }}
                    >
                      {st.title}
                    </span>
                    {stAssigneeName && <AssigneeAvatar name={stAssigneeName} avatarUrl={stAssignee?.avatarUrl} size={20} />}
                  </div>
                );
              })}

              {totalSubs === 0 && !showSubtaskForm && (
                <p style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic', margin: 0 }}>
                  {t('tasks.modal.noSubtasks')}
                </p>
              )}

              {canEdit && !showSubtaskForm && (
                <button type="button" onClick={() => setShowSubtaskForm(true)} style={{ ...linkBtn, marginTop: 10 }}>
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSubtask();
                      if (e.key === 'Escape') { setShowSubtaskForm(false); setSubtaskTitle(''); }
                    }}
                    onFocus={focusHandler}
                    onBlur={blurHandler}
                  />
                  <button type="button" onClick={handleAddSubtask} disabled={!subtaskTitle.trim()} style={{ ...primaryBtn, opacity: subtaskTitle.trim() ? 1 : 0.5 }}>
                    {t('common.add')}
                  </button>
                  <button type="button" onClick={() => { setShowSubtaskForm(false); setSubtaskTitle(''); }} style={secondaryBtn}>
                    {t('common.cancel')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Dependencies */}
          <div style={sectionStyle}>
            <label style={sidebarLabel}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Link2 size={11} strokeWidth={2} />
                {t('tasks.modal.dependencies')}
              </span>
            </label>

            {blockedByDeps.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <span style={depGroupLabel('#DC2626')}>{t('tasks.modal.blockedBy')}</span>
                {blockedByDeps.map((dep) => (
                  <div key={dep.id} style={depRow('#DC2626')}>
                    <Lock size={12} strokeWidth={2} style={{ color: '#DC2626', flexShrink: 0 }} />
                    <button type="button" onClick={() => openSiblingTask(dep.blockingTaskId)} style={depTitleBtn}>
                      {dep.blockingTaskTitle}
                    </button>
                    <span style={depStatus}>{dep.blockingTaskStatus}</span>
                    {canEdit && (
                      <button type="button" onClick={() => handleRemoveDependency(dep.id)} style={iconBtn}>
                        <X size={12} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {blocksDeps.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <span style={depGroupLabel('#D97706')}>{t('tasks.modal.blocks')}</span>
                {blocksDeps.map((dep) => (
                  <div key={dep.id} style={depRow('#D97706')}>
                    <Link2 size={12} strokeWidth={2} style={{ color: '#D97706', flexShrink: 0 }} />
                    <button type="button" onClick={() => openSiblingTask(dep.blockedTaskId)} style={depTitleBtn}>
                      {dep.blockedTaskTitle}
                    </button>
                    <span style={depStatus}>{dep.blockedTaskStatus}</span>
                    {canEdit && (
                      <button type="button" onClick={() => handleRemoveDependency(dep.id)} style={iconBtn}>
                        <X size={12} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {dependencies.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic', margin: '0 0 8px' }}>
                {t('tasks.modal.noDependencies')}
              </p>
            )}

            {canEdit && !showDepSearch && (
              <button type="button" onClick={openDepSearch} style={linkBtn}>
                <Plus size={12} strokeWidth={2.5} />
                {t('tasks.modal.addDependency')}
              </button>
            )}

            {showDepSearch && (
              <div style={{ maxWidth: 420 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={12} strokeWidth={2} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                    <input
                      type="text"
                      value={depSearchQuery}
                      onChange={(e) => setDepSearchQuery(e.target.value)}
                      placeholder={t('tasks.modal.searchTask')}
                      autoFocus
                      style={{ ...fieldStyle, fontSize: 12, padding: '6px 8px 6px 26px' }}
                      onFocus={focusHandler}
                      onBlur={blurHandler}
                      onKeyDown={(e) => { if (e.key === 'Escape') { setShowDepSearch(false); setDepSearchQuery(''); } }}
                    />
                  </div>
                  <button type="button" onClick={() => { setShowDepSearch(false); setDepSearchQuery(''); }} style={iconBtn}>
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
                {depSearchResults.length > 0 && (
                  <div style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
                    maxHeight: 200, overflowY: 'auto', padding: '2px 0',
                  }}>
                    {depSearchResults.map((candidate) => {
                      const cfg = TYPE_CONFIG[candidate.type ?? 'TASK'];
                      const CIcon = cfg.icon;
                      return (
                        <button
                          key={candidate.id}
                          type="button"
                          onClick={() => handleAddDependency(candidate.id)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 10px', border: 'none', background: 'transparent',
                            cursor: 'pointer', textAlign: 'left', transition: 'background 100ms',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <CIcon size={12} strokeWidth={2} style={{ color: cfg.color, flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {candidate.title}
                          </span>
                          <span style={depStatus}>{candidate.status}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Git activity */}
          <div style={sectionStyle}>
            <label style={sidebarLabel}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <GitBranch size={11} strokeWidth={2} />
                {t('tasks.modal.gitActivity')}
              </span>
            </label>

            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: 'var(--text-faint)', display: 'block', marginBottom: 3 }}>
                {t('tasks.modal.gitRef')}
              </span>
              <code style={{
                fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text)',
                background: 'var(--bg-hover)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '2px 7px',
              }}>
                {taskGitRef(task.id)}
              </code>
            </div>

            {gitEvents.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic', margin: '0 0 8px' }}>
                {t('tasks.modal.noGitActivity')}
              </p>
            ) : (
              <div style={{ marginBottom: 8 }}>
                {gitEvents.map((event) => {
                  const EventIcon = event.type === 'PULL_REQUEST' ? GitPullRequest
                    : event.type === 'BRANCH' ? GitBranch : GitCommit;
                  return (
                    <div key={event.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', marginBottom: 4,
                      background: 'var(--bg-hover)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      <EventIcon size={12} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <a
                        href={event.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 12, fontWeight: 500, color: 'var(--text)', textDecoration: 'none',
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        }}
                      >
                        <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{event.title}</span>
                        <ExternalLink size={10} strokeWidth={2} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                      </a>
                      {event.status && <span style={depStatus}>{event.status}</span>}
                      {canEdit && (
                        <button type="button" onClick={() => handleUnlinkGitEvent(event.id)} style={iconBtn}>
                          <X size={12} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {canEdit && !showGitLinkForm && (
              <button type="button" onClick={() => setShowGitLinkForm(true)} style={linkBtn}>
                <Plus size={12} strokeWidth={2.5} />
                {t('tasks.modal.linkManually')}
              </button>
            )}

            {showGitLinkForm && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 420 }}>
                <input
                  type="text"
                  value={gitLinkUrl}
                  onChange={(e) => setGitLinkUrl(e.target.value)}
                  placeholder={t('tasks.modal.gitUrlPlaceholder')}
                  autoFocus
                  style={{ ...fieldStyle, fontSize: 12, padding: '6px 8px' }}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleLinkGitEvent(); }
                    if (e.key === 'Escape') { setShowGitLinkForm(false); setGitLinkUrl(''); }
                  }}
                />
                <button type="button" onClick={handleLinkGitEvent} style={iconBtn}>
                  <Plus size={14} strokeWidth={2.5} />
                </button>
                <button type="button" onClick={() => { setShowGitLinkForm(false); setGitLinkUrl(''); }} style={iconBtn}>
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>

          {/* Comments */}
          {projectId && (
            <div style={sectionStyle}>
              <TaskComments
                taskId={task.id}
                projectId={projectId}
                members={members}
                userMap={userMap}
                isAdmin={perms.isAdmin}
                readOnly={!canEdit}
              />
            </div>
          )}

          {/* Activity feed */}
          <div style={sectionStyle}>
            <TaskActivityFeed taskId={task.id} comments={[]} userMap={userMap} labels={projectLabels} />
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div style={{
          position: 'sticky',
          top: 64,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          <div>
            <label style={sidebarLabel}>{t('tasks.modal.status')}</label>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 600, color: statusColor,
              background: `${statusColor}15`, border: `1px solid ${statusColor}33`,
              borderRadius: 'var(--radius-sm)', padding: '3px 9px',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
              {getStatusLabel(task.status, columns, t)}
            </span>
          </div>

          <div>
            <label style={sidebarLabel}>{t('tasks.modal.type')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TypeIcon size={14} strokeWidth={2} style={{ color: typeCfg.color }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: typeCfg.color }}>{t(`tasks.type.${task.type ?? 'TASK'}`)}</span>
            </div>
          </div>

          <div>
            <label style={sidebarLabel}>{t('tasks.modal.priority')}</label>
            {canEdit ? (
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
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLOR[priority], flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: PRIORITY_COLOR[priority] }}>{t(`tasks.priority.${priority}`)}</span>
              </div>
            )}
          </div>

          {members.length > 0 && (
            <div>
              <label style={sidebarLabel}>{t('tasks.modal.assignee')}</label>
              {canEdit ? (
                <AssigneeDropdown
                  value={assigneeId}
                  onChange={setAssigneeId}
                  members={members}
                  userMap={userMap}
                  placeholder={t('tasks.modal.unassigned')}
                  compact
                />
              ) : (
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
              )}
            </div>
          )}

          {projectLabels.length > 0 && (
            <div>
              <label style={sidebarLabel}>{t('tasks.modal.labels')}</label>
              {canEdit ? (
                <LabelMultiSelect labels={projectLabels} selected={selectedLabelIds} onChange={setSelectedLabelIds} compact />
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selectedLabelIds.length === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>—</span>
                  ) : (
                    selectedLabelIds.map((id) => {
                      const lbl = projectLabels.find((l) => l.id === id);
                      return lbl ? <LabelChip key={id} label={lbl} /> : null;
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {projectEpics.length > 0 && (
            <div>
              <label style={sidebarLabel}>{t('tasks.modal.epic')}</label>
              {canEdit ? (
                <EpicDropdown value={epicId} onChange={setEpicId} epics={projectEpics} placeholder={t('tasks.modal.noEpic')} />
              ) : (() => {
                const epic = projectEpics.find((e) => e.id === epicId);
                if (!epic) {
                  return <span style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>{t('tasks.modal.noEpic')}</span>;
                }
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: epic.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: epic.color }}>{epic.name}</span>
                  </div>
                );
              })()}
            </div>
          )}

          <div>
            <label style={sidebarLabel}>{t('tasks.modal.storyPoints')}</label>
            {task.storyPoints != null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontWeight: 700, color: 'var(--accent-text)', background: 'var(--accent-muted)',
                  borderRadius: 'var(--radius-pill)', width: 28, height: 28,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontFamily: 'var(--font-mono)',
                }}>
                  {task.storyPoints}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t('tasks.modal.storyPointsPoker')}</span>
              </div>
            ) : (
              <span style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-faint)' }}>{t('tasks.modal.storyPointsUnestimated')}</span>
            )}
            {canEdit && workspaceId && projectId && (
              <button
                type="button"
                onClick={() => guardedNavigate(() =>
                  navigate(`/workspaces/${workspaceId}/projects/${projectId}/poker`))}
                style={{ ...linkBtn, marginTop: 8 }}
              >
                <PlayCircle size={13} strokeWidth={2} />
                {t('tasks.modal.startPoker')}
              </button>
            )}
          </div>

          <div>
            <label style={sidebarLabel}>{t('tasks.modal.ready')}</label>
            <button
              type="button"
              onClick={canEdit ? () => setReady((r) => !r) : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                background: ready ? '#16A34A14' : '#D9770614',
                color: ready ? '#16A34A' : '#D97706',
                border: `1px solid ${ready ? '#16A34A40' : '#D9770640'}`,
                borderRadius: 'var(--radius-md)',
                cursor: canEdit ? 'pointer' : 'default',
                transition: 'all 150ms',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: ready ? '#16A34A' : '#D97706' }} />
              {ready ? t('tasks.modal.readyLabel') : t('tasks.modal.notReadyLabel')}
            </button>
          </div>

          {formatDate(task.completedAt) && (
            <div>
              <label style={sidebarLabel}>{t('tasks.modal.completedAt')}</label>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{formatDate(task.completedAt)}</span>
            </div>
          )}

          <div>
            <label style={sidebarLabel}>{t('tasks.modal.createdAt')}</label>
            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{formatDate(task.createdAt)}</span>
          </div>
        </div>
      </div>

      {selectedSubtask && (
        <SubtaskModal
          subtask={selectedSubtask}
          columns={columns}
          readOnly={!canEdit}
          onClose={() => setSelectedSubtask(null)}
          onUpdated={(updated) => setSubtasks((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))}
          onDeleted={(deletedId) => setSubtasks((prev) => prev.filter((s) => s.id !== deletedId))}
        />
      )}

      {/* Confirmacion de salida con cambios sin guardar */}
      {pendingNav && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setPendingNav(null)}
        >
          <div
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '24px 28px',
              maxWidth: 420, width: '90%', boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>
              {t('tasks.detail.unsavedTitle')}
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {t('tasks.detail.unsavedBody')}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setPendingNav(null)} style={secondaryBtn}>
                {t('tasks.detail.unsavedStay')}
              </button>
              <button
                type="button"
                onClick={() => { const go = pendingNav; setPendingNav(null); go(); }}
                style={{ ...primaryBtn, background: '#ef4444' }}
              >
                {t('tasks.detail.unsavedDiscard')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Local styles ─────────────────────────────────────────────────────────────

const primaryBtn: React.CSSProperties = {
  padding: '7px 16px',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'var(--font-sans)',
  background: 'var(--accent)',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  transition: 'background 150ms',
};

const secondaryBtn: React.CSSProperties = {
  padding: '7px 14px',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'var(--font-sans)',
  background: 'var(--bg-elevated)',
  color: 'var(--text-muted)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  transition: 'background 150ms, color 150ms',
};

const dangerLinkBtn: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'var(--font-sans)',
  color: '#DC2626',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
};

const mutedLinkBtn: React.CSSProperties = {
  ...dangerLinkBtn,
  color: 'var(--text-muted)',
};

const linkBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: 0,
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'var(--font-sans)',
  background: 'none',
  color: 'var(--accent-text)',
  border: 'none',
  cursor: 'pointer',
};

const iconBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 2,
  display: 'flex',
  color: 'var(--text-faint)',
  flexShrink: 0,
};

const depStatus: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  color: 'var(--text-faint)',
  textTransform: 'uppercase',
  flexShrink: 0,
};

const depTitleBtn: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  textAlign: 'left',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'var(--font-sans)',
  color: 'var(--text)',
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
};

const depGroupLabel = (color: string): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color,
  display: 'block',
  marginBottom: 4,
});

const depRow = (color: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 10px',
  marginBottom: 4,
  background: `${color}08`,
  border: `1px solid ${color}20`,
  borderRadius: 'var(--radius-sm)',
});