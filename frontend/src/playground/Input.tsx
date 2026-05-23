import { type InputHTMLAttributes, type ReactNode, useId } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?:   string;
  hint?:    string;
  error?:   string;
  prefix?:  ReactNode;
  suffix?:  ReactNode;
}

export default function Input({
  label,
  hint,
  error,
  prefix,
  suffix,
  id: externalId,
  className = '',
  ...rest
}: Props) {
  const autoId = useId();
  const id = externalId ?? autoId;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={id}
          className="text-[0.75rem] font-medium text-[var(--text-muted)] leading-none"
        >
          {label}
        </label>
      )}

      <div className={`relative flex items-center ${error ? 'ring-1 ring-[var(--danger)]' : ''} rounded-[var(--radius-md)]`}>
        {prefix && (
          <span className="absolute left-2.5 flex items-center text-[var(--text-faint)] pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          id={id}
          className={[
            'w-full h-8 bg-[var(--bg-elevated)] text-[var(--text)] placeholder:text-[var(--text-faint)]',
            'border border-[var(--border)] rounded-[var(--radius-md)]',
            'text-[0.8125rem] leading-none',
            'px-3',
            prefix  ? 'pl-8'  : '',
            suffix  ? 'pr-8'  : '',
            'outline-none',
            'hover:border-[var(--border-strong)]',
            'focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)]',
            error ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger-bg)]' : '',
            'transition-[border-color,box-shadow] disabled:opacity-40 disabled:cursor-not-allowed',
            className,
          ].join(' ')}
          style={{ transitionDuration: 'var(--duration)' }}
          {...rest}
        />
        {suffix && (
          <span className="absolute right-2.5 flex items-center text-[var(--text-faint)] pointer-events-none">
            {suffix}
          </span>
        )}
      </div>

      {(hint || error) && (
        <p className={`text-[0.6875rem] leading-snug ${error ? 'text-[var(--danger)]' : 'text-[var(--text-faint)]'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
