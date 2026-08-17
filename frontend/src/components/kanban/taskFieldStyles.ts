export const sidebarLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 6,
};

export const fieldStyle: React.CSSProperties = {
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

export const readOnlyFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  background: 'var(--bg-hover)',
  cursor: 'default',
};

export const focusHandler = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = 'var(--accent)';
  e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-muted)';
};

export const blurHandler = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = 'var(--border)';
  e.currentTarget.style.boxShadow = 'none';
};