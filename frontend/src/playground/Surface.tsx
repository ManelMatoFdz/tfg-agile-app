import type { ElementType, HTMLAttributes, ReactNode } from 'react';

interface Props extends HTMLAttributes<HTMLElement> {
  children:  ReactNode;
  /** 'md' = 0.375rem (default) · 'lg' = 0.5rem (modales) · 'sm' = 0.25rem (chips) */
  radius?:   'sm' | 'md' | 'lg';
  /** Adds a stronger border */
  bordered?: boolean;
  /** Removes border entirely (for nested surfaces) */
  flat?:     boolean;
  as?: ElementType;
}

const radii = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
};

export default function Surface({
  children,
  radius   = 'md',
  bordered = false,
  flat     = false,
  as: Tag  = 'div',
  className = '',
  style,
  ...rest
}: Props) {
  return (
    <Tag
      className={`bg-[var(--bg-elevated)] ${className}`}
      style={{
        borderRadius: radii[radius],
        border: flat ? 'none' : `1px solid ${bordered ? 'var(--border-strong)' : 'var(--border)'}`,
        ...style,
      }}
      {...(rest as HTMLAttributes<HTMLElement>)}
    >
      {children}
    </Tag>
  );
}
