import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Filter, ChevronDown } from 'lucide-react';
import type { TaskPriority, Label, UserSummary, Epic } from '../../types';

export interface TaskFilters {
  priorities: TaskPriority[];
  assigneeIds: string[];
  labelIds: string[];
  statuses: string[];
  epicIds: string[];
  search: string;
}

export const EMPTY_FILTERS: TaskFilters = {
  priorities: [],
  assigneeIds: [],
  labelIds: [],
  statuses: [],
  epicIds: [],
  search: '',
};

export function hasActiveFilters(f: TaskFilters): boolean {
  return (
    f.priorities.length > 0 ||
    f.assigneeIds.length > 0 ||
    f.labelIds.length > 0 ||
    f.statuses.length > 0 ||
    f.epicIds.length > 0 ||
    f.search.length > 0
  );
}

export function activeFilterCount(f: TaskFilters): number {
  let count = 0;
  if (f.priorities.length > 0) count++;
  if (f.assigneeIds.length > 0) count++;
  if (f.labelIds.length > 0) count++;
  if (f.statuses.length > 0) count++;
  if (f.epicIds.length > 0) count++;
  if (f.search.length > 0) count++;
  return count;
}

interface TaskFilterBarProps {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  members: UserSummary[];
  labels: Label[];
  epics?: Epic[];
  showStatus?: boolean;
  statuses?: { key: string; label: string }[];
}

const PRIORITY_OPTIONS: TaskPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  CRITICAL: '#DC2626',
  HIGH: '#D97706',
  MEDIUM: '#2563EB',
  LOW: 'var(--prio-low)',
};

// ── Dropdown multi-select ────────────────────────────────────────────────

function MultiSelectDropdown({
  label,
  icon,
  options,
  selected,
  onToggle,
}: {
  label: string;
  icon?: React.ReactNode;
  options: { key: string; label: string; color?: string; avatar?: string }[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 10px',
          fontSize: 12,
          fontWeight: 600,
          color: selected.length > 0 ? 'var(--accent-text)' : 'var(--text-muted)',
          background: selected.length > 0 ? 'var(--accent-muted)' : 'var(--bg-elevated)',
          border: `1px solid ${selected.length > 0 ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          transition: 'all 150ms',
          whiteSpace: 'nowrap',
        }}
      >
        {icon}
        {label}
        {selected.length > 0 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              background: 'var(--accent)',
              color: '#fff',
              borderRadius: 'var(--radius-pill)',
              padding: '0 6px',
              lineHeight: '16px',
            }}
          >
            {selected.length}
          </span>
        )}
        <ChevronDown size={12} strokeWidth={2} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 50,
            minWidth: 180,
            maxHeight: 240,
            overflowY: 'auto',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: 4,
          }}
        >
          {options.map((opt) => {
            const isSelected = selected.includes(opt.key);
            return (
              <button
                key={opt.key}
                onClick={() => onToggle(opt.key)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text)',
                  background: isSelected ? 'var(--accent-muted)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 100ms',
                }}
                onMouseEnter={(e) =>
                  !isSelected && (e.currentTarget.style.background = 'var(--bg-hover)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = isSelected ? 'var(--accent-muted)' : 'transparent')
                }
              >
                {/* Checkbox indicator */}
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border-strong)'}`,
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 100ms',
                  }}
                >
                  {isSelected && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3.2 5.7L6.5 2.3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>

                {/* Color dot for labels/priorities */}
                {opt.color && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: opt.color,
                      flexShrink: 0,
                    }}
                  />
                )}

                {/* Avatar initials */}
                {opt.avatar && (
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: 'var(--accent-muted)',
                      color: 'var(--accent-text)',
                      fontSize: 9,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {opt.avatar}
                  </span>
                )}

                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Active filter chips ──────────────────────────────────────────────────

function FilterChip({ label, color, onRemove }: { label: string; color?: string; onRemove: () => void }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--accent-text)',
        background: 'var(--accent-muted)',
        borderRadius: 'var(--radius-pill)',
        whiteSpace: 'nowrap',
      }}
    >
      {color && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      )}
      {label}
      <button
        onClick={onRemove}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: 0,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: 'var(--accent-text)',
          opacity: 0.7,
        }}
      >
        <X size={10} strokeWidth={2.5} />
      </button>
    </span>
  );
}

// ── Main component ───────────────────────────────────────────────────────

export default function TaskFilterBar({
  filters,
  onChange,
  members,
  labels,
  epics = [],
  showStatus = false,
  statuses = [],
}: TaskFilterBarProps) {
  const { t } = useTranslation();

  const toggle = useCallback(
    <K extends keyof TaskFilters>(key: K, value: string) => {
      const arr = filters[key] as string[];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      onChange({ ...filters, [key]: next });
    },
    [filters, onChange],
  );

  const priorityOptions = PRIORITY_OPTIONS.map((p) => ({
    key: p,
    label: t(`tasks.priority.${p}`),
    color: PRIORITY_COLORS[p],
  }));

  const assigneeOptions = members.map((m) => ({
    key: m.id,
    label: m.fullName || m.username,
    avatar: (m.fullName || m.username).slice(0, 2).toUpperCase(),
  }));

  const labelOptions = labels.map((l) => ({
    key: l.id,
    label: l.name,
    color: l.color,
  }));

  const epicOptions = epics.map((e) => ({
    key: e.id,
    label: e.name,
    color: e.color,
  }));

  const active = hasActiveFilters(filters);

  // Build chip list
  const chips: { key: string; label: string; color?: string; onRemove: () => void }[] = [];

  filters.priorities.forEach((p) =>
    chips.push({
      key: `p-${p}`,
      label: t(`tasks.priority.${p}`),
      color: PRIORITY_COLORS[p as TaskPriority],
      onRemove: () => toggle('priorities', p),
    }),
  );

  filters.assigneeIds.forEach((id) => {
    const m = members.find((mm) => mm.id === id);
    chips.push({
      key: `a-${id}`,
      label: m ? m.fullName || m.username : id,
      onRemove: () => toggle('assigneeIds', id),
    });
  });

  filters.labelIds.forEach((id) => {
    const l = labels.find((ll) => ll.id === id);
    chips.push({
      key: `l-${id}`,
      label: l?.name ?? id,
      color: l?.color,
      onRemove: () => toggle('labelIds', id),
    });
  });

  filters.epicIds.forEach((id) => {
    const e = epics.find((ee) => ee.id === id);
    chips.push({
      key: `e-${id}`,
      label: e?.name ?? id,
      color: e?.color,
      onRemove: () => toggle('epicIds', id),
    });
  });

  filters.statuses.forEach((s) => {
    const st = statuses.find((ss) => ss.key === s);
    chips.push({
      key: `s-${s}`,
      label: st?.label ?? s,
      onRemove: () => toggle('statuses', s),
    });
  });

  if (filters.search) {
    chips.push({
      key: 'search',
      label: `"${filters.search}"`,
      onRemove: () => onChange({ ...filters, search: '' }),
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Filter controls row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            minWidth: 180,
            maxWidth: 240,
          }}
        >
          <Search size={13} strokeWidth={2} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder={t('tasks.filters.search')}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 12,
              color: 'var(--text)',
              width: '100%',
              fontFamily: 'inherit',
            }}
          />
          {filters.search && (
            <button
              onClick={() => onChange({ ...filters, search: '' })}
              style={{ display: 'flex', padding: 0, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}
            >
              <X size={12} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        {/* Filter icon */}
        <Filter size={14} strokeWidth={2} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />

        {/* Priority dropdown */}
        <MultiSelectDropdown
          label={t('tasks.filters.priority')}
          options={priorityOptions}
          selected={filters.priorities}
          onToggle={(key) => toggle('priorities', key)}
        />

        {/* Assignee dropdown */}
        {assigneeOptions.length > 0 && (
          <MultiSelectDropdown
            label={t('tasks.filters.assignee')}
            options={assigneeOptions}
            selected={filters.assigneeIds}
            onToggle={(key) => toggle('assigneeIds', key)}
          />
        )}

        {/* Label dropdown */}
        {labelOptions.length > 0 && (
          <MultiSelectDropdown
            label={t('tasks.filters.label')}
            options={labelOptions}
            selected={filters.labelIds}
            onToggle={(key) => toggle('labelIds', key)}
          />
        )}

        {/* Epic dropdown */}
        {epicOptions.length > 0 && (
          <MultiSelectDropdown
            label="Epic"
            options={epicOptions}
            selected={filters.epicIds}
            onToggle={(key) => toggle('epicIds', key)}
          />
        )}

        {/* Status dropdown (backlog only) */}
        {showStatus && statuses.length > 0 && (
          <MultiSelectDropdown
            label={t('tasks.filters.status')}
            options={statuses}
            selected={filters.statuses}
            onToggle={(key) => toggle('statuses', key)}
          />
        )}

        {/* Clear all */}
        {active && (
          <button
            onClick={() => onChange({ ...EMPTY_FILTERS })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--error)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 'var(--radius-md)',
              transition: 'background 100ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={12} strokeWidth={2.5} />
            {t('tasks.filters.clearAll')}
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {chips.map((chip) => (
            <FilterChip key={chip.key} label={chip.label} color={chip.color} onRemove={chip.onRemove} />
          ))}
        </div>
      )}
    </div>
  );
}