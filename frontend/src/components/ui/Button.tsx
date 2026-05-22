import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  children: ReactNode;
}

const variants: Record<NonNullable<Props['variant']>, string> = {
  primary: `
    bg-primary-600 text-white
    hover:bg-primary-700
    shadow-sm
    active:bg-primary-800
  `,
  secondary: `
    bg-white text-gray-700 border border-gray-200
    hover:bg-gray-50 hover:border-gray-300
    shadow-sm
  `,
  danger: `
    bg-red-600 text-white
    hover:bg-red-700
    shadow-sm
    active:bg-red-800
  `,
  ghost: `
    text-gray-600 hover:text-gray-900 hover:bg-gray-100
  `,
};

export default function Button({
  variant = 'primary',
  loading,
  children,
  className = '',
  disabled,
  ...rest
}: Props) {
  return (
    <button
      className={`
        relative inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2
        text-sm font-semibold
        transition-all duration-150 ease-out
        cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
        active:scale-[0.98]
        ${variants[variant]}
        ${className}
      `}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
