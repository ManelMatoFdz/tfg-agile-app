import { useState, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export default function Input({ label, error, hint, icon, id, onFocus, onBlur, style, ...rest }: Props) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text)',
            letterSpacing: '-0.01em',
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: focused ? 'var(--accent-text)' : 'var(--text-faint)',
            transition: 'color var(--duration) var(--ease-in-out)',
            display: 'flex',
            alignItems: 'center',
          }}>
            {icon}
          </div>
        )}
        <input
          id={inputId}
          style={{
            display: 'block',
            width: '100%',
            padding: icon ? '10px 12px 10px 40px' : '10px 14px',
            fontSize: 14,
            fontFamily: 'var(--font-sans)',
            color: 'var(--text)',
            background: 'var(--bg-elevated)',
            border: `1px solid ${error ? 'var(--danger)' : focused ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            outline: 'none',
            transition: 'border-color var(--duration) var(--ease-in-out), box-shadow var(--duration) var(--ease-in-out)',
            boxSizing: 'border-box',
            boxShadow: focused ? '0 0 0 3px var(--accent-muted)' : 'var(--shadow-sm)',
            ...style,
          }}
          onFocus={e => { setFocused(true); onFocus?.(e); }}
          onBlur={e => { setFocused(false); onBlur?.(e); }}
          {...rest}
        />
      </div>
      {error && (
        <p style={{
          margin: 0,
          fontSize: 12,
          color: 'var(--danger-text)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}