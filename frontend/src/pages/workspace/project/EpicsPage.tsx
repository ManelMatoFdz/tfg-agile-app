import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Target, Plus, Pencil, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
import type { Epic, EpicStatus, Task, TaskPriority } from '../../../types';
import { epicsApi } from '../../../api/epics';
import type { CreateEpicDto, UpdateEpicDto } from '../../../api/epics';
import Alert from '../../../components/ui/Alert';
import PageTitle from '../../../components/motion/PageTitle';
import { useProjectMember } from '../../../hooks/useProjectMember';
import { useBoardColumns, getStatusColor } from '../../../hooks/useBoardColumns';
import TaskModal from '../../../components/kanban/TaskModal';
import { tasksApi } from '../../../api/tasks';
import type { CreateTaskDto, UpdateTaskDto } from '../../../api/tasks';

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: '#6B7280',
  MEDIUM: '#2563EB',
  HIGH: '#D97706',
  CRITICAL: '#DC2626',
};

const STATUS_COLORS: Record<EpicStatus, string> = {
  OPEN: '#6B7280',
  IN_PROGRESS: '#2563EB',
  DONE: '#16A34A',
};

const EPIC_COLORS = [
  '#6B7280', '#2563EB', '#7C3AED', '#DC2626', '#D97706',
  '#16A34A', '#0891B2', '#DB2777', '#4F46E5', '#EA580C',
];

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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 6,
};

export default function EpicsPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const { canCreateTask } = useProjectMember(projectId);
  const columns = useBoardColumns(projectId);

  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<EpicStatus | 'ALL'>('ALL');

  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [epicTasksMap, setEpicTasksMap] = useState<Record<string, Task[]>>({});
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set());
  const [modalTask, setModalTask] = useState<Task | null | undefined>(undefined);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6B7280');
  const [status, setStatus] = useState<EpicStatus>('OPEN');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchEpics = () => {
    if (!projectId) return;
    setLoading(true);
    epicsApi.getByProject(projectId)
      .then(setEpics)
      .catch(() => setError(t('projects.epics.loadError')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEpics(); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleModalSave = async (dto: CreateTaskDto | UpdateTaskDto) => {
    if (!modalTask) return;
    await tasksApi.update(modalTask.id, dto as UpdateTaskDto);
    // Refresh tasks for the affected epic
    if (modalTask.epicId && projectId) {
      const refreshed = await epicsApi.getTasks(projectId, modalTask.epicId);
      setEpicTasksMap(prev => ({ ...prev, [modalTask.epicId!]: refreshed }));
    }
    fetchEpics();
  };

  const handleModalDelete = async () => {
    if (!modalTask || !projectId) return;
    await tasksApi.delete(modalTask.id);
    if (modalTask.epicId) {
      setEpicTasksMap(prev => ({
        ...prev,
        [modalTask.epicId!]: (prev[modalTask.epicId!] ?? []).filter(t => t.id !== modalTask.id),
      }));
    }
    setModalTask(undefined);
    fetchEpics();
  };

  const toggleEpicTasks = async (epicId: string) => {
    if (expandedEpics.has(epicId)) {
      setExpandedEpics(prev => { const s = new Set(prev); s.delete(epicId); return s; });
      return;
    }
    setExpandedEpics(prev => new Set(prev).add(epicId));
    if (epicTasksMap[epicId] !== undefined || !projectId) return;
    setLoadingTasks(prev => new Set(prev).add(epicId));
    try {
      const tasks = await epicsApi.getTasks(projectId, epicId);
      setEpicTasksMap(prev => ({ ...prev, [epicId]: tasks }));
    } catch {
      setEpicTasksMap(prev => ({ ...prev, [epicId]: [] }));
    } finally {
      setLoadingTasks(prev => { const s = new Set(prev); s.delete(epicId); return s; });
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setColor('#6B7280');
    setStatus('OPEN');
    setStartDate('');
    setTargetDate('');
    setEditingEpic(null);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (epic: Epic) => {
    setName(epic.name);
    setDescription(epic.description ?? '');
    setColor(epic.color);
    setStatus(epic.status);
    setStartDate(epic.startDate ?? '');
    setTargetDate(epic.targetDate ?? '');
    setEditingEpic(epic);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !projectId) return;
    setSaving(true);
    try {
      if (editingEpic) {
        const dto: UpdateEpicDto = {
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          status,
          startDate: startDate || undefined,
          targetDate: targetDate || undefined,
        };
        await epicsApi.update(projectId, editingEpic.id, dto);
      } else {
        const dto: CreateEpicDto = {
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          startDate: startDate || undefined,
          targetDate: targetDate || undefined,
        };
        await epicsApi.create(projectId, dto);
      }
      resetForm();
      fetchEpics();
    } catch {
      setError(t('projects.epics.loadError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (epicId: string) => {
    if (!projectId) return;
    try {
      await epicsApi.delete(projectId, epicId);
      setConfirmDeleteId(null);
      fetchEpics();
    } catch {
      setError(t('projects.epics.loadError'));
    }
  };

  const filtered = statusFilter === 'ALL'
    ? epics
    : epics.filter(e => e.status === statusFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Target size={22} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
            <PageTitle as="h2" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
              {t('projects.epics.title')}
            </PageTitle>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>
            {t('projects.epics.subtitle')}
          </p>
        </div>
        {canCreateTask && (
          <button
            onClick={openCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
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
            <Plus size={16} strokeWidth={2} />
            {t('projects.epics.newEpic')}
          </button>
        )}
      </div>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['ALL', 'OPEN', 'IN_PROGRESS', 'DONE'] as const).map(s => {
          const active = statusFilter === s;
          const sColor = s === 'ALL' ? 'var(--text-muted)' : STATUS_COLORS[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '5px 14px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 'var(--radius-pill)',
                border: `1.5px solid ${active ? sColor : 'var(--border)'}`,
                background: active ? `${s === 'ALL' ? 'var(--bg-hover)' : sColor + '12'}` : 'var(--bg-elevated)',
                color: active ? (s === 'ALL' ? 'var(--text)' : sColor) : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              {s === 'ALL' ? t('projects.epics.filterAll') : t(`projects.epics.statusLabel.${s}`)}
            </button>
          );
        })}
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {editingEpic ? t('projects.epics.editEpic') : t('projects.epics.newEpic')}
            </h3>
            <button
              onClick={resetForm}
              style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 4 }}
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>{t('projects.epics.name')}</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('projects.epics.namePlaceholder')}
                autoFocus
                style={fieldStyle}
              />
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>{t('projects.epics.description')}</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('projects.epics.descriptionPlaceholder')}
                rows={3}
                style={{ ...fieldStyle, resize: 'vertical', minHeight: 60 }}
              />
            </div>

            {/* Color + Status row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Color */}
              <div>
                <label style={labelStyle}>{t('projects.epics.color')}</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {EPIC_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 'var(--radius-md)',
                        background: c,
                        border: color === c ? '2.5px solid var(--text)' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'border-color 150ms',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Status (only on edit) */}
              {editingEpic && (
                <div>
                  <label style={labelStyle}>{t('projects.epics.status')}</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as EpicStatus)}
                    style={fieldStyle}
                  >
                    {(['OPEN', 'IN_PROGRESS', 'DONE'] as EpicStatus[]).map(s => (
                      <option key={s} value={s}>{t(`projects.epics.statusLabel.${s}`)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Dates row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>{t('projects.epics.startDate')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>{t('projects.epics.targetDate')}</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  style={fieldStyle}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button
                onClick={resetForm}
                style={{
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                style={{
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'var(--accent)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
                  opacity: saving || !name.trim() ? 0.5 : 1,
                  fontFamily: 'var(--font-sans)',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => { if (!saving && name.trim()) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
              >
                {saving ? '...' : editingEpic ? t('common.save') : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Epic list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: 28, height: 28,
            border: '3px solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : filtered.length === 0 ? (
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
            <Target size={24} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
            {t('projects.epics.noEpics')}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            {t('projects.epics.noEpicsSubtitle')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(epic => {
            const pct = epic.totalTasks > 0
              ? Math.round((epic.doneTasks / epic.totalTasks) * 100)
              : 0;
            const allDone = epic.totalTasks > 0 && epic.doneTasks === epic.totalTasks;
            const barColor = allDone ? '#16A34A' : epic.color;
            const sColor = STATUS_COLORS[epic.status];

            return (
              <div
                key={epic.id}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderLeft: `4px solid ${epic.color}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px 24px',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'box-shadow 150ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
              >
                {/* Top row: name + status + actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}>
                      {epic.name}
                    </h3>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: sColor,
                      background: `${sColor}12`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '2px 8px',
                      flexShrink: 0,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: sColor }} />
                      {t(`projects.epics.statusLabel.${epic.status}`)}
                    </span>
                  </div>

                  {canCreateTask && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 12 }}>
                      <button
                        onClick={() => openEdit(epic)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 30, height: 30, borderRadius: 'var(--radius-md)',
                          border: 'none', background: 'transparent',
                          color: 'var(--text-faint)', cursor: 'pointer',
                          transition: 'color 150ms, background 150ms',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                      {confirmDeleteId === epic.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {t('projects.epics.deleteConfirm').split('?')[0]}?
                          </span>
                          <button
                            onClick={() => handleDelete(epic.id)}
                            style={{
                              fontSize: 11, fontWeight: 600, color: '#DC2626',
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontFamily: 'var(--font-sans)',
                            }}
                          >
                            {t('common.delete')}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            style={{
                              fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontFamily: 'var(--font-sans)',
                            }}
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(epic.id)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 30, height: 30, borderRadius: 'var(--radius-md)',
                            border: 'none', background: 'transparent',
                            color: 'var(--text-faint)', cursor: 'pointer',
                            transition: 'color 150ms, background 150ms',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.background = 'rgba(220,38,38,0.06)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Description */}
                {epic.description && (
                  <p style={{
                    margin: '0 0 12px',
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {epic.description}
                  </p>
                )}

                {/* Progress bar + task toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                  <button
                    onClick={() => toggleEpicTasks(epic.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      whiteSpace: 'nowrap',
                      fontFamily: 'var(--font-sans)',
                      transition: 'color 150ms, background 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
                  >
                    {expandedEpics.has(epic.id)
                      ? <ChevronDown size={12} strokeWidth={2} />
                      : <ChevronRight size={12} strokeWidth={2} />
                    }
                    {epic.doneTasks}/{epic.totalTasks} {t('projects.epics.tasks')}
                  </button>
                </div>

                {/* Dates */}
                {(epic.startDate || epic.targetDate) && (
                  <div style={{
                    display: 'flex',
                    gap: 16,
                    marginTop: 10,
                    fontSize: 11,
                    color: 'var(--text-faint)',
                  }}>
                    {epic.startDate && (
                      <span>{t('projects.epics.startDate')}: {epic.startDate}</span>
                    )}
                    {epic.targetDate && (
                      <span>{t('projects.epics.targetDate')}: {epic.targetDate}</span>
                    )}
                  </div>
                )}

                {/* Task list (collapsible) */}
                {expandedEpics.has(epic.id) && (
                  <div style={{
                    marginTop: 14,
                    borderTop: '1px solid var(--border)',
                    paddingTop: 12,
                  }}>
                    {loadingTasks.has(epic.id) ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                        <div style={{
                          width: 16, height: 16,
                          border: '2px solid var(--border)',
                          borderTopColor: 'var(--accent)',
                          borderRadius: '50%',
                          animation: 'spin 0.7s linear infinite',
                        }} />
                      </div>
                    ) : !epicTasksMap[epic.id] || epicTasksMap[epic.id].length === 0 ? (
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                        {t('projects.epics.noTasks')}
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {epicTasksMap[epic.id].map(task => {
                          const statusColor = getStatusColor(task.status, columns);
                          return (
                            <div
                              key={task.id}
                              onClick={() => setModalTask(task)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '5px 8px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg)',
                                border: '1px solid var(--border)',
                                cursor: 'pointer',
                                transition: 'border-color 150ms, background 150ms',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)'; }}
                            >
                              <span style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: statusColor, flexShrink: 0,
                              }} />
                              <span style={{
                                fontSize: 12,
                                color: 'var(--text)',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                                minWidth: 0,
                              }}>
                                {task.title}
                              </span>
                              <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: PRIORITY_COLOR[task.priority],
                                background: `${PRIORITY_COLOR[task.priority]}14`,
                                padding: '1px 6px',
                                borderRadius: 'var(--radius-sm)',
                                flexShrink: 0,
                                letterSpacing: '0.04em',
                                marginLeft: 8,
                              }}>
                                {task.priority}
                              </span>
                              <span style={{ flex: 1 }} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          projectId={projectId}
          columns={columns}
          defaultStatus="TODO"
          onClose={() => setModalTask(undefined)}
          onSave={handleModalSave}
          onMove={undefined}
          onDelete={canCreateTask && modalTask ? handleModalDelete : undefined}
        />
      )}
    </div>
  );
}