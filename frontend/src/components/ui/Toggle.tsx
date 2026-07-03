interface Props {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function Toggle({ label, description, checked, onChange, disabled }: Props) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      cursor: disabled ? 'not-allowed' : 'pointer',
      padding: '4px 0',
      opacity: disabled ? 0.5 : 1,
    }}>
      <div>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
          {label}
        </span>
        {description && (
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative',
          display: 'inline-flex',
          width: 40,
          height: 22,
          flexShrink: 0,
          borderRadius: 'var(--radius-pill)',
          border: 'none',
          background: checked ? 'var(--accent)' : 'var(--border-strong)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background var(--duration) var(--ease-in-out)',
          padding: 0,
          outline: 'none',
        }}
      >
        <span
          style={{
            display: 'block',
            width: 16,
            height: 16,
            borderRadius: 'var(--radius-pill)',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            transform: checked ? 'translateX(20px)' : 'translateX(3px)',
            marginTop: 3,
            transition: 'transform var(--duration) var(--ease-out)',
          }}
        />
      </button>
    </label>
  );
}