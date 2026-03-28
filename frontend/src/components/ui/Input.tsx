import { useState, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export default function Input({ label, error, icon, id, className = '', onFocus, onBlur, ...rest }: Props) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className={`block text-sm font-medium transition-colors duration-200 ${
          focused ? 'text-primary-600' : 'text-gray-600'
        }`}
      >
        {label}
      </label>
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
            block w-full rounded-xl border bg-white/80 backdrop-blur-sm
            ${icon ? 'pl-11' : 'px-4'} ${icon ? '' : ''} py-3
            text-sm placeholder:text-gray-400
            transition-all duration-300 ease-out
            focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10 focus:outline-none
            focus:shadow-lg focus:shadow-primary-500/5
            hover:border-gray-300
            disabled:cursor-not-allowed disabled:bg-gray-50/80 disabled:text-gray-500 disabled:border-gray-200
            ${error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-500/10 focus:shadow-red-500/5'
              : 'border-gray-200'
            }
            ${className}
          `}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...rest}
        />
        {/* Bottom glow line on focus */}
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] bg-gradient-to-r from-transparent via-primary-500 to-transparent transition-all duration-500 rounded-full ${
          focused ? 'w-[80%] opacity-100' : 'w-0 opacity-0'
        }`} />
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
