import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

const sizeMap = {
  sm: { padding: '6px 12px', fontSize: 12 },
  md: { padding: '9px 16px', fontSize: 13 },
  lg: { padding: '12px 24px', fontSize: 14 },
};

const base: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  fontWeight: 600,
  fontFamily: 'var(--font-sans)',
  letterSpacing: '-0.01em',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  transition: 'background var(--duration) var(--ease-in-out), border-color var(--duration) var(--ease-in-out), box-shadow var(--duration) var(--ease-in-out)',
};

const styles: Record<NonNullable<Props['variant']>, { normal: React.CSSProperties; hover: React.CSSProperties }> = {
  primary: {
    normal: { background: 'var(--accent)', color: 'var(--accent-fg)', border: '1px solid var(--accent)', boxShadow: '0 1px 2px rgba(37,99,235,0.2)' },
    hover:  { background: 'var(--accent-hover)', borderColor: 'var(--accent-hover)', boxShadow: '0 2px 4px rgba(37,99,235,0.3)' },
  },
  secondary: {
    normal: { background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-sm)' },
    hover:  { background: 'var(--bg-hover)', borderColor: 'var(--text-faint)' },
  },
  danger: {
    normal: { background: 'var(--danger)', color: '#fff', border: '1px solid var(--danger)' },
    hover:  { background: '#B91C1C', borderColor: '#B91C1C' },
  },
  ghost: {
    normal: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' },
    hover:  { background: 'var(--bg-hover)', color: 'var(--text)' },
  },
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  disabled,
  style,
  ...rest
}: Props) {
  const v = styles[variant];
  const s = sizeMap[size];
  const isDisabled = disabled || loading;

  return (
    <button
      style={{
        ...base,
        ...s,
        ...v.normal,
        ...(isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
        ...style,
      }}
      disabled={isDisabled}
      onMouseEnter={e => {
        if (isDisabled) return;
        Object.assign(e.currentTarget.style, v.hover);
      }}
      onMouseLeave={e => {
        if (isDisabled) return;
        Object.assign(e.currentTarget.style, v.normal);
      }}
      {...rest}
    >
      {loading && (
        <svg style={{ width: 14, height: 14, animation: 'spin 0.7s linear infinite' }} viewBox="0 0 24 24" fill="none">
          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}