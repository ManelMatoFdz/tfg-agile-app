import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { Task, TaskPriority, TaskType, Label, Epic } from '../../types';
import type { CreateTaskDto } from '../../api/tasks';
import { tasksApi } from '../../api/tasks';
import { labelsApi } from '../../api/labels';
import { epicsApi } from '../../api/epics';
import { useProjectMembers } from '../../hooks/useProjectMembers';
import { PRIORITIES, TASK_TYPES, TYPE_CONFIG } from './taskConstants';
import { sidebarLabel, fieldStyle, focusHandler, blurHandler } from './taskFieldStyles';
import { AssigneeDropdown } from './AssigneePicker';
import { LabelMultiSelect } from './LabelPicker';
import { EpicDropdown } from './EpicPicker';

interface Props {
  projectId: string;
  defaultType?: TaskType;
  parentId?: string;
  onCreated?: (task: Task) => void;
  onClose: () => void;
}

export default function CreateTaskModal({ projectId, defaultType = 'TASK', parentId, onCreated, onClose }: Props) {
  const { t } = useTranslation();
  const isSubtask = !!parentId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [definitionOfDone, setDefinitionOfDone] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [taskType, setTaskType] = useState<TaskType>(parentId ? 'TASK' : defaultType);
  const [assigneeId, setAssigneeId] = useState('');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [epicId, setEpicId] = useState('');

  const [projectLabels, setProjectLabels] = useState<Label[]>([]);
  const [projectEpics, setProjectEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdHint, setCreatedHint] = useState(false);

  const { members, userMap } = useProjectMembers(projectId);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    labelsApi.getByProject(projectId).then(setProjectLabels).catch(() => {});
    epicsApi.getByProject(projectId).then(setProjectEpics).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const dto: CreateTaskDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        type: parentId ? 'TASK' : taskType,
        parentId: parentId || undefined,
        assigneeId: assigneeId || undefined,
        labelIds: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
        ...(!parentId ? { definitionOfDone: definitionOfDone.trim() || undefined } : {}),
      };
      const created = await tasksApi.create(projectId, dto);
      // CreateTaskDto no lleva epicId: la epica se asigna despues de crear.
      if (epicId) await epicsApi.assignToTask(created.id, epicId);
      onCreated?.(created);

      // El modal sigue abierto para encadenar altas: se mantienen tipo y epica.
      setTitle('');
      setDescription('');
      setDefinitionOfDone('');
      setAssigneeId('');
      setSelectedLabelIds([]);
      setCreatedHint(true);
      titleRef.current?.focus();
    } catch {
      setError(t('tasks.modal.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!createdHint) return;
    const id = setTimeout(() => setCreatedHint(false), 2000);
    return () => clearTimeout(id);
  }, [createdHint]);

  const disabled = loading || !title.trim();

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fade-in 200ms ease both',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: 600,
        maxHeight: '85vh',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'scale-in var(--duration-panel) var(--ease-out) both',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {t('tasks.modal.titleCreate')}
          </h2>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-faint)',
              cursor: 'pointer',
              transition: 'color 150ms, background 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div
          onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {error && (
            <div style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#DC2626',
              background: 'rgba(220,38,38,0.06)',
              borderLeft: '3px solid #DC2626',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
            }}>
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('tasks.modal.titlePlaceholder')}
              autoFocus
              style={{
                ...fieldStyle,
                fontSize: 16,
                fontWeight: 600,
                padding: '10px 12px',
              }}
              onFocus={focusHandler}
              onBlur={blurHandler}
            />
          </div>

          {/* Description */}
          <div>
            <label style={sidebarLabel}>{t('tasks.modal.description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('tasks.modal.descriptionPlaceholder')}
              rows={4}
              style={{ ...fieldStyle, resize: 'vertical', minHeight: 80 }}
              onFocus={focusHandler}
              onBlur={blurHandler}
            />
          </div>

          {/* Definition of Done — only for root tasks */}
          {!isSubtask && (
            <div>
              <label style={sidebarLabel}>{t('tasks.modal.definitionOfDone')}</label>
              <textarea
                value={definitionOfDone}
                onChange={(e) => setDefinitionOfDone(e.target.value)}
                placeholder={t('tasks.modal.dodPlaceholder')}
                rows={3}
                style={{ ...fieldStyle, resize: 'vertical', minHeight: 60 }}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>
          )}

          {/* Priority + assignee */}
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={sidebarLabel}>{t('tasks.modal.priority')}</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                style={fieldStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{t(`tasks.priority.${p}`)}</option>
                ))}
              </select>
            </div>
            {members.length > 0 && (
              <div>
                <label style={sidebarLabel}>{t('tasks.modal.assignee')}</label>
                <AssigneeDropdown
                  value={assigneeId}
                  onChange={setAssigneeId}
                  members={members}
                  userMap={userMap}
                  placeholder={t('tasks.modal.unassigned')}
                />
              </div>
            )}
          </div>

          {/* Type selector — not for subtasks */}
          {!parentId && (
            <div>
              <label style={sidebarLabel}>{t('tasks.modal.type')}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {TASK_TYPES.map((tt) => {
                  const cfg = TYPE_CONFIG[tt];
                  const Icon = cfg.icon;
                  const selected = taskType === tt;
                  return (
                    <button
                      key={tt}
                      type="button"
                      onClick={() => setTaskType(tt)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '8px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: 'var(--font-sans)',
                        border: `1.5px solid ${selected ? cfg.color : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        background: selected ? `${cfg.color}0D` : 'var(--bg)',
                        color: selected ? cfg.color : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                      }}
                    >
                      <Icon size={14} strokeWidth={2} />
                      {t(`tasks.type.${tt}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Labels */}
          {projectLabels.length > 0 && (
            <div>
              <label style={sidebarLabel}>{t('tasks.modal.labels')}</label>
              <LabelMultiSelect
                labels={projectLabels}
                selected={selectedLabelIds}
                onChange={setSelectedLabelIds}
              />
            </div>
          )}

          {/* Epic — not for subtasks */}
          {!parentId && projectEpics.length > 0 && (
            <div>
              <label style={sidebarLabel}>{t('tasks.modal.epic')}</label>
              <EpicDropdown
                value={epicId}
                onChange={setEpicId}
                epics={projectEpics}
                placeholder={t('tasks.modal.noEpic')}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg)',
          flexShrink: 0,
          borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
        }}>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#16A34A',
            opacity: createdHint ? 1 : 0,
            transition: 'opacity 200ms ease',
          }}>
            {t('tasks.createModal.createdHint')}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'background 150ms, color 150ms',
                background: 'var(--bg-elevated)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-strong)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              {t('common.close')}
            </button>
            <button
              onClick={handleCreate}
              disabled={disabled}
              style={{
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
                background: 'var(--accent)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                fontFamily: 'var(--font-sans)',
                transition: 'background 150ms',
              }}
              onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--accent-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
            >
              {loading ? '...' : t('tasks.modal.create')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}