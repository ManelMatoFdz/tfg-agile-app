import { useState, useRef, useEffect } from 'react';
import { ChevronDown, UserCircle } from 'lucide-react';
import { fieldStyle } from './taskFieldStyles';

const AVATAR_COLORS = [
  '#2563EB', '#7C3AED', '#16A34A', '#D97706', '#DC2626',
  '#0891B2', '#4F46E5', '#059669', '#EA580C', '#DB2777',
];

function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function AssigneeAvatar({ name, avatarUrl, size = 22 }: { name: string; avatarUrl?: string | null; size?: number }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: 'var(--radius-pill)',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    );
  }
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  const color = nameToColor(name);
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: 'var(--radius-pill)',
      background: color,
      color: '#FFFFFF',
      fontSize: size * 0.42,
      fontWeight: 700,
      flexShrink: 0,
      letterSpacing: '-0.02em',
    }}>
      {initials}
    </span>
  );
}

export function AssigneeDropdown({
  value,
  onChange,
  members,
  userMap,
  placeholder,
  compact = false,
}: {
  value: string;
  onChange: (id: string) => void;
  members: { userId: string }[];
  userMap: Record<string, { username: string; fullName?: string; avatarUrl?: string }>;
  placeholder: string;
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

  const selected = value ? userMap[value] : null;
  const selectedName = selected ? (selected.fullName ?? selected.username) : null;
  const btnStyle = compact
    ? { ...fieldStyle, fontSize: 12, padding: '6px 10px' }
    : fieldStyle;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          ...btnStyle,
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
            <AssigneeAvatar name={selectedName!} avatarUrl={selected.avatarUrl} size={compact ? 20 : 22} />
            <span style={{ flex: 1, color: 'var(--text)', fontSize: compact ? 12 : 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedName}</span>
          </>
        ) : (
          <>
            <UserCircle size={compact ? 20 : 22} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
            <span style={{ flex: 1, color: 'var(--text-faint)', fontSize: compact ? 12 : 13 }}>{placeholder}</span>
          </>
        )}
        <ChevronDown size={14} strokeWidth={2} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
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
            maxHeight: 220,
            overflowY: 'auto',
            padding: '4px 0',
          }}
        >
          {/* Unassigned option */}
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
            <UserCircle size={26} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>{placeholder}</span>
          </button>

          {members.map((m) => {
            const u = userMap[m.userId];
            const name = u ? (u.fullName ?? u.username) : m.userId;
            const isSelected = m.userId === value;
            return (
              <button
                key={m.userId}
                type="button"
                onClick={() => { onChange(m.userId); setOpen(false); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  border: 'none',
                  background: isSelected ? 'var(--accent-muted)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <AssigneeAvatar name={name} avatarUrl={u?.avatarUrl} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u?.fullName ?? u?.username ?? m.userId}
                  </div>
                  {u?.fullName && (
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      @{u.username}
                    </div>
                  )}
                </div>
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