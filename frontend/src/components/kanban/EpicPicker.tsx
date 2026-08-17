import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Target } from 'lucide-react';
import type { Epic } from '../../types';
import { fieldStyle } from './taskFieldStyles';

export function EpicDropdown({
  value,
  onChange,
  epics,
  placeholder,
}: {
  value: string;
  onChange: (id: string) => void;
  epics: Epic[];
  placeholder: string;
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

  const selected = value ? epics.find(e => e.id === value) : null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          ...fieldStyle,
          fontSize: 12,
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          background: 'var(--bg)',
        }}
      >
        {selected ? (
          <>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: selected.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--text)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selected.name}
            </span>
          </>
        ) : (
          <>
            <Target size={14} strokeWidth={1.5} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--text-faint)', fontSize: 12 }}>{placeholder}</span>
          </>
        )}
        <ChevronDown size={14} strokeWidth={2} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
      </button>

      {open && (
        <div
          onWheel={e => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }}
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
            maxHeight: 220,
            overflowY: 'auto',
            padding: '4px 0',
          }}
        >
          {/* No epic option */}
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              border: 'none',
              background: !value ? 'var(--accent-muted)' : 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 100ms',
            }}
            onMouseEnter={e => { if (value) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (value) e.currentTarget.style.background = 'transparent'; }}
          >
            <Target size={14} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>{placeholder}</span>
          </button>

          {epics.map(epic => {
            const isSelected = epic.id === value;
            return (
              <button
                key={epic.id}
                type="button"
                onClick={() => { onChange(epic.id); setOpen(false); }}
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
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: epic.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                  {epic.name}
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