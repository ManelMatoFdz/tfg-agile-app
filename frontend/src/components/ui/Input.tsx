import { useState, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export default function Input({ label, error, icon, id, className = '', onFocus, onBlur, ...rest }: Props) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={`block text-sm font-medium transition-colors duration-200 ${
            focused ? 'text-primary-600' : 'text-gray-600'
          }`}
        >
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
            focused ? 'text-primary-500' : 'text-gray-400'
          }`}>
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`
            block w-full rounded-lg border bg-white
            ${icon ? 'pl-11' : 'px-3.5'} py-2.5
            text-sm placeholder:text-gray-400
            transition-all duration-150
            focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus:outline-none
            hover:border-gray-300
            disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400
            ${error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-500/15'
              : 'border-gray-200'
            }
            ${className}
          `}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...rest}
        />
      </div>
      {error && (
        <p className="text-xs text-red-500 animate-slide-up flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
