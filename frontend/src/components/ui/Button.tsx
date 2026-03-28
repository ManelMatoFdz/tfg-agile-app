import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  children: ReactNode;
}

const variants = {
  primary: `
    bg-gradient-to-r from-primary-600 to-primary-500 text-white
    shadow-lg shadow-primary-500/25
    hover:shadow-xl hover:shadow-primary-500/30
    hover:from-primary-700 hover:to-primary-600
    active:shadow-md
  `,
  secondary: `
    bg-white text-gray-700 border border-gray-200/80
    shadow-sm hover:shadow-md
    hover:bg-gray-50 hover:border-gray-300
  `,
  danger: `
    bg-gradient-to-r from-red-600 to-red-500 text-white
    shadow-lg shadow-red-500/25
    hover:shadow-xl hover:shadow-red-500/30
    hover:from-red-700 hover:to-red-600
  `,
  ghost: `
    text-gray-600 hover:text-gray-900 hover:bg-gray-100/80
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
        relative inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5
        text-sm font-semibold
        transition-all duration-300 ease-out
        cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100
        active:scale-[0.97]
        hover:scale-[1.01]
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
