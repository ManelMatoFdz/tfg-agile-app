import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Label } from '../../types';
import { fieldStyle } from './taskFieldStyles';

export function LabelChip({ label, size = 'sm' }: { label: Label; size?: 'sm' | 'md' }) {
  const isSm = size === 'sm';
  return (
    <span style={{
      display: 'inline-block',
      fontSize: isSm ? 10 : 11,
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: label.color,
      background: `${label.color}14`,
      border: `1px solid ${label.color}40`,
      borderRadius: 'var(--radius-sm)',
      padding: isSm ? '1px 8px' : '2px 10px',
      whiteSpace: 'nowrap',
      lineHeight: '16px',
    }}>
      {label.name}
    </span>
  );
}

export function LabelMultiSelect({
  labels,
  selected,
  onChange,
  compact = false,
}: {
  labels: Label[];
  selected: string[];
  onChange: (ids: string[]) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  };

  const btnStyle = compact
    ? { ...fieldStyle, fontSize: 12, padding: '6px 10px', minHeight: 34 }
    : { ...fieldStyle, minHeight: 40 };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          ...btnStyle,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          background: 'var(--bg)',
        }}
      >
        {selected.length === 0 ? (
          <span style={{ color: 'var(--text-faint)', fontSize: compact ? 12 : 13 }}>—</span>
        ) : (
          selected.map((id) => {
            const lbl = labels.find((l) => l.id === id);
            if (!lbl) return null;
            return <LabelChip key={id} label={lbl} />;
          })
        )}
        <ChevronDown size={14} strokeWidth={2} style={{ color: 'var(--text-faint)', marginLeft: 'auto', flexShrink: 0 }} />
      </button>

      {open && (
        <div
          onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 50,
            maxHeight: 200,
            overflowY: 'auto',
            padding: '4px 0',
        }}>
          {labels.map((label) => {
            const isSelected = selected.includes(label.id);
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => toggle(label.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 12px',
                  border: 'none',
                  background: isSelected ? 'var(--accent-muted)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? 'var(--accent-muted)' : 'transparent'; }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: label.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                  {label.name}
                </span>
                {isSelected && (
                  <span style={{ fontSize: 14, color: 'var(--accent-text)', flexShrink: 0 }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}