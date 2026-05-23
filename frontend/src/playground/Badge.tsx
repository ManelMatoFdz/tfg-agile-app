import type { ReactNode } from 'react';

export type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize    = 'sm' | 'md';

interface Props {
  children:  ReactNode;
  variant?:  BadgeVariant;
  size?:     BadgeSize;
  dot?:      boolean;
  className?: string;
}

const variants: Record<BadgeVariant, { text: string; bg: string; border: string; dot: string }> = {
  default: {
    text:   'text-[var(--text-muted)]',
    bg:     'bg-[var(--bg-hover)]',
    border: 'border-[var(--border)]',
    dot:    'bg-[var(--text-faint)]',
  },
  accent: {
    text:   'text-[var(--accent)]',
    bg:     'bg-[var(--accent-muted)]',
    border: 'border-transparent',
    dot:    'bg-[var(--accent)]',
  },
  success: {
    text:   'text-[var(--success)]',
    bg:     'bg-[var(--success-bg)]',
    border: 'border-transparent',
    dot:    'bg-[var(--success)]',
  },
  warning: {
    text:   'text-[var(--warning)]',
    bg:     'bg-[var(--warning-bg)]',
    border: 'border-transparent',
    dot:    'bg-[var(--warning)]',
  },
  danger: {
    text:   'text-[var(--danger)]',
    bg:     'bg-[var(--danger-bg)]',
    border: 'border-transparent',
    dot:    'bg-[var(--danger)]',
  },
  info: {
    text:   'text-[var(--info)]',
    bg:     'bg-[var(--info-bg)]',
    border: 'border-transparent',
    dot:    'bg-[var(--info)]',
  },
};

const sizes: Record<BadgeSize, string> = {
  sm: 'h-4  px-1.5 text-[0.625rem] gap-1',
  md: 'h-5  px-2   text-[0.6875rem] gap-1',
};

export default function Badge({
  children,
  variant  = 'default',
  size     = 'md',
  dot      = false,
  className = '',
}: Props) {
  const v = variants[variant];

  return (
    <span
      className={[
        'inline-flex items-center font-semibold leading-none whitespace-nowrap',
        'border rounded-[var(--radius-sm)]',
        sizes[size],
        v.text, v.bg, v.border,
        className,
      ].join(' ')}
    >
      {dot && (
        <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${v.dot}`} />
      )}
      {children}
    </span>
  );
}
