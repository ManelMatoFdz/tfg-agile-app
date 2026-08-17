import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Zap, ClipboardList, ArrowRight, ListChecks, TrendingUp } from 'lucide-react';
import type { Sprint, Task, TaskType } from '../../../types';
import { sprintsApi, type VelocityDto } from '../../../api/sprints';
import TaskCard from '../../../components/kanban/TaskCard';
import Alert from '../../../components/ui/Alert';
import { useProjectMember } from '../../../hooks/useProjectMember';
import { useProjectMembers } from '../../../hooks/useProjectMembers';

const TYPE_COLOR: Record<TaskType, string> = {
  STORY: '#7C3AED',
  TASK:  '#2563EB',
  BUG:   '#DC2626',
};

export default function SprintPlanningPage() {
  const { t } = useTranslation();
  const { workspaceId, projectId, sprintId } = useParams<{
    workspaceId: string;
    projectId: string;
    sprintId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { canPlanSprint } = useProjectMember(projectId);
  const { userMap } = useProjectMembers(projectId);

  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [backlog, setBacklog] = useState<Task[]>([]);
  const [sprintTasks, setSprintTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [velocity, setVelocity] = useState<VelocityDto | null>(null);

  // Drag & drop state
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<'backlog' | 'sprint' | null>(null);
  const [backlogOver, setBacklogOver] = useState(false);
  const [sprintOver, setSprintOver] = useState(false);
  const dragRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!projectId || !sprintId) return;
    setLoading(true);
    try {
      const [sprintData, backlogData, tasksData] = await Promise.all([
        sprintsApi.getSprint(sprintId),
        sprintsApi.getBacklog(projectId),
        sprintsApi.getSprintStories(sprintId),
      ]);
      setSprint(sprintData);
      setBacklog(backlogData.filter((t: Task) => t.ready));
      setSprintTasks(tasksData);
    } catch {
      setError(t('projects.sprints.loadError'));
    } finally {
      setLoading(false);
    }
  }, [projectId, sprintId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!projectId) return;
    sprintsApi.getVelocity(projectId).then(setVelocity).catch(() => {});
  }, [projectId]);

  const handleAddToSprint = async (taskId: string) => {
    if (!sprintId || moving) return;
    setMoving(taskId);
    try {
      const added = await sprintsApi.assignTasksToSprint(sprintId, [taskId]);
      setSprintTasks((prev) => [...prev, ...added]);
      setBacklog((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      setError(t('projects.sprints.planning.error'));
    } finally {
      setMoving(null);
    }
  };

  const handleRemoveFromSprint = async (taskId: string) => {
    if (!sprintId || moving) return;
    setMoving(taskId);
    try {
      const returned = await sprintsApi.removeTaskFromSprint(sprintId, taskId);
      setSprintTasks((prev) => prev.filter((t) => t.id !== taskId));
      setBacklog((prev) => [...prev, returned]);
    } catch {
      setError(t('projects.sprints.planning.error'));
    } finally {
      setMoving(null);
    }
  };

  // Drag handlers
  const handleDragStart = (taskId: string, source: 'backlog' | 'sprint') => {
    if (!canPlanSprint) return;
    setDragTaskId(taskId);
    setDragSource(source);
    dragRef.current = true;
  };

  const handleDragEnd = () => {
    setDragTaskId(null);
    setDragSource(null);
    setBacklogOver(false);
    setSprintOver(false);
    dragRef.current = false;
  };

  const handleDropOnSprint = (e: React.DragEvent) => {
    e.preventDefault();
    setSprintOver(false);
    if (dragTaskId && dragSource === 'backlog') {
      handleAddToSprint(dragTaskId);
    }
    handleDragEnd();
  };

  const handleDropOnBacklog = (e: React.DragEvent) => {
    e.preventDefault();
    setBacklogOver(false);
    if (dragTaskId && dragSource === 'sprint') {
      handleRemoveFromSprint(dragTaskId);
    }
    handleDragEnd();
  };

  const openTask = (task: Task) =>
    navigate(
      `/workspaces/${workspaceId}/projects/${task.projectId ?? projectId}/tasks/${task.id}`,
      { state: { from: location.pathname + location.search, task } },
    );

  const totalCommitted = sprintTasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const totalBacklog = backlog.reduce((s, t) => s + (t.storyPoints ?? 0), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{
          width: 28, height: 28,
          border: '3px solid var(--border)', borderTopColor: 'var(--accent-text)',
          borderRadius: '50%', animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Breadcrumb + back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => navigate(`/workspaces/${workspaceId}/projects/${projectId}/sprints`)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 12px', fontSize: 13, fontWeight: 500,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
        >
          <ChevronLeft size={14} strokeWidth={2} />
          {t('projects.sprints.title')}
        </button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{
            margin: 0, fontSize: 24, fontWeight: 700,
            color: 'var(--text)', letterSpacing: '-0.02em',
          }}>
            {t('projects.sprints.planning.title')}: {sprint?.name}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>
            {t('projects.sprints.planning.subtitle')}
          </p>
        </div>

        {/* Commitment + Velocity badges */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
            {/* Commitment */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: velocity && velocity.completedSprints > 0
                ? 'var(--radius-md) 0 0 var(--radius-md)'
                : 'var(--radius-md)',
              borderRight: velocity && velocity.completedSprints > 0 ? 'none' : undefined,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--text-faint)',
              }}>
                {t('projects.sprints.planning.commitment')}
              </span>
              <span style={{
                fontSize: 18, fontWeight: 700,
                color: velocity && velocity.completedSprints > 0 && totalCommitted > velocity.averageVelocity * 1.2
                  ? 'var(--ochre)' : 'var(--accent)',
                fontFamily: 'var(--font-mono)',
              }}>
                {totalCommitted} pts
              </span>
            </div>
            {/* Average velocity */}
            {velocity && velocity.completedSprints > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '0 var(--radius-md) var(--radius-md) 0',
              }}>
                <TrendingUp size={13} strokeWidth={2} style={{ color: 'var(--text-faint)' }} />
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--text-faint)',
                }}>
                  {t('projects.sprints.planning.avgVelocity')}
                </span>
                <span style={{
                  fontSize: 18, fontWeight: 700, color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {velocity.averageVelocity} pts
                </span>
              </div>
            )}
          </div>
          <Link
            to={`/workspaces/${workspaceId}/projects/${projectId}/sprints/${sprintId}/backlog`}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', fontSize: 12, fontWeight: 600,
              background: 'var(--bg-elevated)', color: 'var(--text-muted)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              textDecoration: 'none', cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
          >
            <ListChecks size={14} strokeWidth={2} />
            {t('projects.sprints.planning.viewSprintBacklog')}
          </Link>
        </div>
      </div>

      {/* Sprint Goal */}
      {sprint?.goal && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          background: 'var(--accent-muted)', border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px',
        }}>
          <Zap size={14} strokeWidth={2} style={{ color: 'var(--accent-text)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t('projects.sprints.planning.goal')}
            </span>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text)' }}>
              {sprint.goal}
            </p>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, minHeight: 400 }}>
        {/* Left: Product Backlog */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClipboardList size={18} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              {t('projects.backlog.title')}
            </h3>
            <span style={{
              fontSize: 11, fontWeight: 700, color: 'var(--accent-fg)',
              background: 'var(--accent)', padding: '2px 8px',
              borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-mono)',
            }}>
              {backlog.length} {t('projects.sprints.planning.items')}
            </span>
            {totalBacklog > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text-faint)',
                fontFamily: 'var(--font-mono)',
              }}>
                · {totalBacklog} pts
              </span>
            )}
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); if (dragSource === 'sprint') setBacklogOver(true); }}
            onDragEnter={(e) => { e.preventDefault(); if (dragSource === 'sprint') setBacklogOver(true); }}
            onDragLeave={() => setBacklogOver(false)}
            onDrop={handleDropOnBacklog}
            style={{
              flex: 1, overflowY: 'auto',
              background: 'var(--bg)',
              border: backlogOver ? '2px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: 12,
              display: 'flex', flexDirection: 'column', gap: 8,
              transition: 'border-color 150ms, background 150ms',
              ...(backlogOver ? { background: 'var(--accent-muted)' } : {}),
            }}
          >
            {backlog.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 16px' }}>
                <ClipboardList size={32} strokeWidth={1.5} style={{ color: 'var(--text-faint)', marginBottom: 12 }} />
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-faint)', textAlign: 'center' }}>
                  {t('projects.sprints.planning.noBacklog')}
                </p>
              </div>
            ) : (
              backlog.map((task) => (
                <div
                  key={task.id}
                  draggable={canPlanSprint}
                  onDragStart={() => handleDragStart(task.id, 'backlog')}
                  onDragEnd={handleDragEnd}
                  style={{
                    opacity: dragTaskId === task.id ? 0.4 : 1,
                    cursor: canPlanSprint ? 'grab' : 'default',
                    transition: 'opacity 150ms',
                  }}
                >
                  <TaskCard
                    task={task}
                    assignee={task.assigneeId ? userMap[task.assigneeId] : undefined}
                    columnColor={TYPE_COLOR[task.type ?? 'TASK']}
                    onClick={() => { if (!dragRef.current) openTask(task); }}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Sprint Backlog */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap size={18} strokeWidth={2} style={{ color: 'var(--accent-text)' }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              {sprint?.name} {t('projects.sprints.planning.backlog')}
            </h3>
            <span style={{
              fontSize: 11, fontWeight: 700, color: 'var(--accent-fg)',
              background: 'var(--accent)', padding: '2px 8px',
              borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-mono)',
            }}>
              {sprintTasks.length} {t('projects.sprints.planning.items')}
            </span>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); if (dragSource === 'backlog') setSprintOver(true); }}
            onDragEnter={(e) => { e.preventDefault(); if (dragSource === 'backlog') setSprintOver(true); }}
            onDragLeave={() => setSprintOver(false)}
            onDrop={handleDropOnSprint}
            style={{
              flex: 1, overflowY: 'auto',
              background: 'var(--bg)',
              border: sprintOver ? '2px solid var(--accent)' : '2px dashed var(--border)',
              borderRadius: 'var(--radius-lg)', padding: 12,
              display: 'flex', flexDirection: 'column', gap: 8,
              transition: 'border-color 150ms, background 150ms',
              ...(sprintOver ? { background: 'var(--accent-muted)' } : {}),
            }}
          >
            {sprintTasks.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 16px' }}>
                <div style={{
                  width: 48, height: 48,
                  borderRadius: '50%', border: '2px dashed var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12,
                }}>
                  <ArrowRight size={20} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-faint)', textAlign: 'center' }}>
                  {t('projects.sprints.planning.dropHere')}
                </p>
              </div>
            ) : (
              sprintTasks.map((task) => (
                <div
                  key={task.id}
                  draggable={canPlanSprint}
                  onDragStart={() => handleDragStart(task.id, 'sprint')}
                  onDragEnd={handleDragEnd}
                  style={{
                    opacity: dragTaskId === task.id ? 0.4 : 1,
                    cursor: canPlanSprint ? 'grab' : 'default',
                    transition: 'opacity 150ms',
                  }}
                >
                  <TaskCard
                    task={task}
                    assignee={task.assigneeId ? userMap[task.assigneeId] : undefined}
                    columnColor={TYPE_COLOR[task.type ?? 'TASK']}
                    onClick={() => { if (!dragRef.current) openTask(task); }}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}