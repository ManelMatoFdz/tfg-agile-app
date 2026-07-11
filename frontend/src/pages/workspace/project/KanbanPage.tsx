import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Columns, Clock, AlertTriangle, Settings, Filter as FilterIcon } from 'lucide-react';
import { sprintsApi } from '../../../api/sprints';
import { boardColumnsApi } from '../../../api/boardColumns';
import { labelsApi } from '../../../api/labels';
import type { Sprint, Task, BoardColumn, Label, UserSummary } from '@/types';
import KanbanBoard from '../../../components/kanban/KanbanBoard';
import TaskFilterBar, { type TaskFilters, EMPTY_FILTERS, hasActiveFilters } from '../../../components/kanban/TaskFilterBar';
import Alert from '../../../components/ui/Alert';
import { useProjectMember } from '../../../hooks/useProjectMember';
import { useProjectMembers } from '../../../hooks/useProjectMembers';

const FILTER_STORAGE_KEY = (pid: string) => `filters_${pid}_board`;

function loadBoardFilters(projectId: string): TaskFilters {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY(projectId));
    if (raw) return { ...EMPTY_FILTERS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...EMPTY_FILTERS };
}

export default function KanbanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();

  const { canMoveTask, canDeleteSprintTask, isAdmin, isScrumMaster } = useProjectMember(projectId);
  const { members, userMap } = useProjectMembers(projectId);

  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<TaskFilters>(() => projectId ? loadBoardFilters(projectId) : { ...EMPTY_FILTERS });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const activeSprintRef = useRef<Sprint | null>(null);

  // Load labels
  useEffect(() => {
    if (!projectId) return;
    labelsApi.getByProject(projectId).then(setLabels).catch(() => {});
  }, [projectId]);

  const fetchSprintTasks = useCallback(
    async (sprint: Sprint | null, f: TaskFilters) => {
      if (!sprint) {
        setAllTasks([]);
        setTasks([]);
        return;
      }
      try {
        const fetched = await sprintsApi.getSprintTasks(sprint.id, hasActiveFilters(f) ? f : undefined);
        setAllTasks(fetched);
        setTasks(fetched);
      } catch {
        setError(t('projects.kanban.loadError'));
      }
    },
    [t],
  );

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const fetchColumns = boardColumnsApi.getColumns(projectId).then(setColumns).catch(() => {});

    const fetchSprint = sprintsApi
      .listSprints(projectId)
      .then(async (sprints) => {
        const active = sprints.find((s) => s.status === 'ACTIVE') ?? null;
        setActiveSprint(active);
        activeSprintRef.current = active;
        await fetchSprintTasks(active, filters);
      })
      .catch(() => setError(t('projects.kanban.loadError')));

    Promise.all([fetchColumns, fetchSprint]).finally(() => setLoading(false));
  }, [projectId, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshTasks = async () => {
    const sprint = activeSprintRef.current;
    if (!sprint) return;
    try {
      const fresh = await sprintsApi.getSprintTasks(sprint.id, hasActiveFilters(filters) ? filters : undefined);
      setAllTasks(fresh);
      setTasks((prev) => {
        if (JSON.stringify(fresh) === JSON.stringify(prev)) return prev;
        return fresh;
      });
    } catch {
      // silent
    }
  };

  const handleFilterChange = useCallback(
    (next: TaskFilters) => {
      setFilters(next);
      if (projectId) localStorage.setItem(FILTER_STORAGE_KEY(projectId), JSON.stringify(next));

      if (debounceRef.current) clearTimeout(debounceRef.current);
      const sprint = activeSprintRef.current;
      if (next.search !== filters.search && next.search.length > 0) {
        debounceRef.current = setTimeout(() => fetchSprintTasks(sprint, next), 300);
      } else {
        fetchSprintTasks(sprint, next);
      }
    },
    [projectId, filters.search, fetchSprintTasks],
  );

  const memberSummaries: UserSummary[] = members.map((m) => userMap[m.userId]).filter(Boolean) as UserSummary[];

  const formatDate = (date: string | null | undefined) =>
    date ? new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : null;

  const sprintOverdueDays = (() => {
    if (!activeSprint?.endDate) return 0;
    const end = new Date(activeSprint.endDate);
    end.setHours(23, 59, 59, 999);
    const today = new Date();
    return today > end ? Math.ceil((today.getTime() - end.getTime()) / 86_400_000) : 0;
  })();

  const daysRemaining = (() => {
    if (!activeSprint?.endDate) return null;
    const end = new Date(activeSprint.endDate);
    end.setHours(23, 59, 59, 999);
    const today = new Date();
    if (today > end) return null;
    return Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
  })();

  const canConfigureBoard = isAdmin || isScrumMaster;

  return (
    <div>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: 28,
            height: 28,
            border: '3px solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : !activeSprint ? (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '64px 32px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            width: 56,
            height: 56,
            background: 'var(--accent-muted)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Columns size={24} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
            {t('projects.kanban.noActiveSprint')}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-muted)', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
            {t('projects.kanban.noActiveSprintSub')}{' '}
            {workspaceId && projectId && (
              <Link
                to={`/workspaces/${workspaceId}/projects/${projectId}/sprints`}
                style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
              >
                {t('projects.sprints.title')}
              </Link>
            )}
          </p>
        </div>
      ) : (
        <>
          {/* Active sprint header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 20px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                {activeSprint.name}
              </span>

              <span style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--success-bg)',
                color: 'var(--success)',
              }}>
                {t('projects.sprints.status.ACTIVE')}
              </span>

              {activeSprint.goal && (
                <span style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  maxWidth: 280,
                }}>
                  {activeSprint.goal}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {(activeSprint.startDate || activeSprint.endDate) && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                }}>
                  <Clock size={13} strokeWidth={1.75} />
                  {formatDate(activeSprint.startDate) ?? '--'} - {formatDate(activeSprint.endDate) ?? '--'}
                </span>
              )}

              {daysRemaining != null && (
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: daysRemaining <= 3 ? 'var(--warning)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {daysRemaining}d left
                </span>
              )}

              {canConfigureBoard && (
                <button
                  onClick={() => navigate(`/workspaces/${workspaceId}/projects/${projectId}/board-settings`)}
                  title={t('projects.boardSettings.title')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'background 150ms, color 150ms, border-color 150ms',
                    padding: 0,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text)';
                    e.currentTarget.style.borderColor = 'var(--border-strong)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--bg-elevated)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <Settings size={15} strokeWidth={1.75} />
                </button>
              )}
            </div>
          </div>

          {sprintOverdueDays > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', marginBottom: 16,
              background: 'var(--warning-bg)',
              border: '1px solid var(--warning)',
              borderRadius: 'var(--radius-md)',
            }}>
              <AlertTriangle size={16} strokeWidth={2} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 13, color: 'var(--warning)', fontWeight: 500 }}>
                {t('projects.kanban.overdueBanner', { days: sprintOverdueDays, pending: tasks.filter((tt) => !columns.some((c) => c.doneEquivalent && c.name === tt.status)).length })}
              </p>
            </div>
          )}

          {/* Filter bar */}
          <div style={{ marginBottom: 12 }}>
            <TaskFilterBar
              filters={filters}
              onChange={handleFilterChange}
              members={memberSummaries}
              labels={labels}
            />
          </div>

          {/* Empty state for filters */}
          {!loading && tasks.length === 0 && hasActiveFilters(filters) ? (
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '64px 32px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{
                width: 56, height: 56,
                background: 'var(--accent-muted)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <FilterIcon size={24} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
              </div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                {t('tasks.filters.noResults')}
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                {t('tasks.filters.noResultsSub')}
              </p>
            </div>
          ) : (
            <KanbanBoard
              projectId={projectId!}
              tasks={tasks}
              columns={columns}
              onTasksChange={setTasks}
              onRefresh={refreshTasks}
              disableCreate={true}
              canMove={canMoveTask}
              canDelete={canDeleteSprintTask}
              readOnly={!canMoveTask}
            />
          )}
        </>
      )}
    </div>
  );
}