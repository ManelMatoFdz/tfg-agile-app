import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { GripVertical, Trash2, Plus, ArrowLeft, Check } from 'lucide-react';
import { boardColumnsApi } from '../../../api/boardColumns';
import { tasksApi } from '../../../api/tasks';
import { useProjectMember } from '../../../hooks/useProjectMember';
import type { BoardColumn } from '@/types';
import Alert from '../../../components/ui/Alert';
import type { AxiosError } from 'axios';

const COLOR_OPTIONS = [
  '#6B7280', '#2563EB', '#3B82F6', '#7C3AED',
  '#D97706', '#F59E0B', '#16A34A', '#22C55E',
  '#DC2626', '#0891B2', '#DB2777', '#EA580C',
];

export default function BoardSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const permissions = useProjectMember(projectId);

  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      boardColumnsApi.getColumns(projectId),
      tasksApi.getByProject(projectId),
    ])
      .then(([cols, tasks]) => {
        setColumns(cols);
        const counts: Record<string, number> = {};
        tasks.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
        setTaskCounts(counts);
      })
      .catch(() => setError(t('projects.boardSettings.loadError')))
      .finally(() => setLoading(false));
  }, [projectId, t]);

  const canEdit = permissions.isAdmin || permissions.isScrumMaster;

  const updateColumn = (index: number, patch: Partial<BoardColumn>) => {
    setColumns((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const addColumn = () => {
    const pos = columns.length;
    const newCol: BoardColumn = {
      id: crypto.randomUUID(),
      name: '',
      position: pos,
      color: COLOR_OPTIONS[pos % COLOR_OPTIONS.length],
      wipLimit: null,
      doneEquivalent: false,
    };
    setColumns((prev) => [...prev, newCol]);
  };

  const removeColumn = (index: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== index).map((c, i) => ({ ...c, position: i })));
  };

  const moveColumn = (from: number, to: number) => {
    if (to < 0 || to >= columns.length) return;
    setColumns((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr.map((c, i) => ({ ...c, position: i }));
    });
  };

  const handleSave = async () => {
    if (!projectId || !canEdit) return;

    // Validate
    const hasName = columns.every((c) => c.name.trim().length > 0);
    if (!hasName) {
      setError(t('projects.boardSettings.errorEmptyName'));
      return;
    }

    const hasDone = columns.some((c) => c.doneEquivalent);
    if (!hasDone) {
      setError(t('projects.boardSettings.errorNoDone'));
      return;
    }

    const names = columns.map((c) => c.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      setError(t('projects.boardSettings.errorDuplicateName'));
      return;
    }

    // Validate WIP limits against current task counts
    for (const col of columns) {
      if (col.wipLimit != null && col.wipLimit > 0) {
        const current = taskCounts[col.name] ?? 0;
        if (current > col.wipLimit) {
          setError(t('projects.boardSettings.errorWipExceeded', {
            column: col.name.replace(/_/g, ' '),
            current,
            limit: col.wipLimit,
          }));
          return;
        }
      }
    }

    setSaving(true);
    setError(null);
    try {
      const saved = await boardColumnsApi.saveColumns(
        projectId,
        columns.map((c, i) => ({ ...c, name: c.name.trim(), position: i })),
      );
      setColumns(saved);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const msg = axiosErr.response?.data?.message ?? '';
      if (msg.startsWith('WIP_LIMIT_EXCEEDED:')) {
        const parts = msg.split(':');
        setError(t('projects.boardSettings.errorWipExceeded', {
          column: (parts[1] ?? '').replace(/_/g, ' '),
          current: parts[2] ?? '?',
          limit: parts[3] ?? '?',
        }));
      } else {
        setError(t('projects.boardSettings.saveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{
          width: 28, height: 28,
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent-text)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, padding: '0 16px', boxSizing: 'border-box' }}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <button
            onClick={() => navigate(`/workspaces/${workspaceId}/projects/${projectId}/board`)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'background 150ms, color 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
              {t('projects.boardSettings.title')}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {t('projects.boardSettings.subtitle')}
            </p>
          </div>
        </div>

        {canEdit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={addColumn}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', fontSize: 13, fontWeight: 600,
                background: 'var(--bg-elevated)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'background 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
            >
              <Plus size={15} strokeWidth={2.5} />
              {t('projects.boardSettings.addColumn')}
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', fontSize: 13, fontWeight: 600,
                background: success ? 'var(--success)' : 'var(--accent)',
                color: '#fff',
                border: 'none', borderRadius: 'var(--radius-md)',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                transition: 'background 150ms, opacity 150ms',
              }}
              onMouseEnter={e => { if (!saving && !success) e.currentTarget.style.background = 'var(--accent-hover)'; }}
              onMouseLeave={e => { if (!success) e.currentTarget.style.background = 'var(--accent)'; }}
            >
              {success ? <Check size={15} strokeWidth={2.5} /> : null}
              {saving ? '...' : success ? t('projects.boardSettings.saved') : t('projects.boardSettings.save')}
            </button>
          </div>
        )}
      </div>

      {/* Workflow Columns */}
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {t('projects.boardSettings.workflowColumns')}
          </h2>
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-faint)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {t('projects.boardSettings.columnsActive', { count: columns.length })}
          </span>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {columns.length === 0 && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: '24px 0' }}>
              {t('projects.boardSettings.noColumns')}
            </p>
          )}

          {columns.map((col, i) => (
            <div
              key={col.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: '16px 24px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                borderLeft: `4px solid ${col.color}`,
                flexWrap: 'wrap',
              }}
            >
              {/* Drag handle (move up/down buttons) */}
              {canEdit && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <button
                    onClick={() => moveColumn(i, i - 1)}
                    disabled={i === 0}
                    style={{
                      border: 'none', background: 'none', padding: 0,
                      cursor: i === 0 ? 'default' : 'pointer',
                      color: i === 0 ? 'var(--text-faint)' : 'var(--text-muted)',
                      opacity: i === 0 ? 0.3 : 1,
                      fontSize: 10,
                    }}
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveColumn(i, i + 1)}
                    disabled={i === columns.length - 1}
                    style={{
                      border: 'none', background: 'none', padding: 0,
                      cursor: i === columns.length - 1 ? 'default' : 'pointer',
                      color: i === columns.length - 1 ? 'var(--text-faint)' : 'var(--text-muted)',
                      opacity: i === columns.length - 1 ? 0.3 : 1,
                      fontSize: 10,
                    }}
                  >
                    ▼
                  </button>
                </div>
              )}

              {!canEdit && (
                <GripVertical
                  size={18}
                  strokeWidth={2}
                  style={{ color: 'var(--text-faint)', opacity: 0.4, flexShrink: 0 }}
                />
              )}

              {/* Column name */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <span style={{
                  display: 'block', fontSize: 10, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: col.color, marginBottom: 2,
                }}>
                  {t('projects.boardSettings.columnName')}
                </span>
                {canEdit ? (
                  <input
                    type="text"
                    value={col.name}
                    onChange={(e) => updateColumn(i, { name: e.target.value })}
                    placeholder={t('projects.boardSettings.columnNamePlaceholder') || 'Column name'}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--text)',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      outline: 'none',
                      fontFamily: 'inherit',
                      transition: 'border-color 150ms',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                  />
                ) : (
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                    {col.name}
                  </span>
                )}
              </div>

              {/* Controls: color, WIP, done, delete */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0, width: canEdit ? 320 : 100 }}>
                {/* Color picker */}
                {canEdit && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: 'var(--text-faint)',
                    }}>
                      {t('projects.boardSettings.color')}
                    </span>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', width: 90 }}>
                      {COLOR_OPTIONS.map((c) => (
                        <button
                          key={c}
                          onClick={() => updateColumn(i, { color: c })}
                          style={{
                            width: 16, height: 16,
                            borderRadius: '50%',
                            background: c,
                            border: col.color === c ? '2px solid var(--text)' : '2px solid transparent',
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'border-color 100ms',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* WIP Limit */}
                {(() => {
                  const currentCount = taskCounts[col.name] ?? 0;
                  const wipExceeded = col.wipLimit != null && col.wipLimit > 0 && currentCount > col.wipLimit;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 72 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: wipExceeded ? '#DC2626' : 'var(--text-faint)', marginBottom: 2,
                        whiteSpace: 'nowrap',
                      }}>
                        WIP{currentCount > 0 ? ` (${currentCount})` : ''}
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={col.wipLimit ?? ''}
                        placeholder={t('projects.boardSettings.wipNone')}
                        readOnly={!canEdit}
                        onChange={(e) => {
                          const val = e.target.value;
                          const num = val === '' ? null : Math.max(1, parseInt(val));
                          updateColumn(i, { wipLimit: num });
                        }}
                        style={{
                          width: 72,
                          padding: '5px 10px',
                          fontSize: 13,
                          fontWeight: 500,
                          textAlign: 'center',
                          background: canEdit ? 'var(--bg)' : 'var(--bg-elevated)',
                          border: `1px solid ${wipExceeded ? '#DC2626' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-sm)',
                          color: wipExceeded ? '#DC2626' : 'var(--text)',
                          fontFamily: 'inherit',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  );
                })()}

                {/* Done equivalent checkbox */}
                {canEdit && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 34 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: 'var(--text-faint)',
                    }}>
                      Done
                    </span>
                    <input
                      type="checkbox"
                      checked={col.doneEquivalent}
                      onChange={(e) => updateColumn(i, { doneEquivalent: e.target.checked })}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
                    />
                  </div>
                )}

                {/* Delete */}
                {canEdit && (
                  <button
                    onClick={() => removeColumn(i)}
                    disabled={columns.length <= 1}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 34, height: 34,
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: columns.length <= 1 ? 'var(--text-faint)' : '#DC2626',
                      cursor: columns.length <= 1 ? 'not-allowed' : 'pointer',
                      opacity: columns.length <= 1 ? 0.3 : 1,
                      flexShrink: 0,
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={e => { if (columns.length > 1) e.currentTarget.style.background = 'rgba(220,38,38,0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Trash2 size={15} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}