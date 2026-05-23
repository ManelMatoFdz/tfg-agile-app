import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize    = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant;
  size?:     ButtonSize;
  loading?:  boolean;
  icon?:     ReactNode;
  iconOnly?: boolean;
  children?: ReactNode;
}

const base = [
  'inline-flex items-center justify-center gap-1.5',
  'font-medium leading-none whitespace-nowrap select-none',
  'transition-[background,color,border-color,box-shadow,opacity]',
  'focus-visible:outline-none focus-visible:ring-2',
  'focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1',
  'focus-visible:ring-offset-[var(--bg-elevated)]',
  'disabled:opacity-40 disabled:pointer-events-none',
  'active:scale-[0.98]',
].join(' ');

const sizes: Record<ButtonSize, string> = {
  sm: 'h-7  px-2.5 text-[0.6875rem] rounded-[var(--radius-sm)]',
  md: 'h-8  px-3   text-[0.75rem] rounded-[var(--radius-md)]',
  lg: 'h-9  px-4   text-[0.8125rem] rounded-[var(--radius-md)]',
};

const iconOnlySizes: Record<ButtonSize, string> = {
  sm: 'h-7 w-7  rounded-[var(--radius-sm)]',
  md: 'h-8 w-8  rounded-[var(--radius-md)]',
  lg: 'h-9 w-9  rounded-[var(--radius-md)]',
};

// CSS-variable-based variants for theme compatibility
const variants: Record<ButtonVariant, string> = {
  accent: [
    'bg-[var(--accent)] text-[var(--accent-fg)]',
    'hover:bg-[var(--accent-hover)]',
    'shadow-[0_1px_2px_rgba(0,0,0,0.15)]',
  ].join(' '),
  primary: [
    'bg-[var(--text)] text-[var(--bg)]',
    'hover:opacity-80',
    'shadow-[0_1px_2px_rgba(0,0,0,0.15)]',
  ].join(' '),
  secondary: [
    'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
    'border border-[var(--border)] hover:border-[var(--border-strong)]',
    'hover:text-[var(--text)] hover:bg-[var(--bg-hover)]',
  ].join(' '),
  ghost: [
    'bg-transparent text-[var(--text-muted)]',
    'hover:bg-[var(--bg-hover)] hover:text-[var(--text)]',
  ].join(' '),
  danger: [
    'bg-[var(--danger-bg)] text-[var(--danger)]',
    'border border-transparent hover:border-[var(--danger)]',
    'hover:bg-[var(--danger-bg)]',
  ].join(' '),
};

const Spinner = () => (
  <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export default function Button({
  variant  = 'secondary',
  size     = 'md',
  loading  = false,
  icon,
  iconOnly = false,
  children,
  className = '',
  disabled,
  style,
  ...rest
}: Props) {
  const sizeClass = iconOnly ? iconOnlySizes[size] : sizes[size];

  return (
    <button
      className={`${base} ${sizeClass} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      style={{ transitionDuration: 'var(--duration)', ...style }}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {!iconOnly && children}
    </button>
  );
}
