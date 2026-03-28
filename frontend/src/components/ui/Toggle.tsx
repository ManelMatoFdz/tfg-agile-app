interface Props {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function Toggle({ label, description, checked, onChange, disabled }: Props) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer group py-1">
      <div className="select-none">
        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
          {label}
        </span>
        {description && (
          <p className="text-xs text-gray-400 mt-0.5 group-hover:text-gray-500 transition-colors duration-200">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full
          transition-all duration-300 ease-out
          focus:outline-none focus:ring-4 focus:ring-primary-500/15 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${checked
            ? 'bg-gradient-to-r from-primary-600 to-primary-500 shadow-md shadow-primary-500/25'
            : 'bg-gray-200 hover:bg-gray-300'
          }
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5.5 w-5.5 rounded-full bg-white
            shadow-md ring-0
            transition-all duration-300 ease-out
            ${checked ? 'translate-x-[22px] shadow-primary-500/20' : 'translate-x-[3px]'}
            mt-[3px]
          `}
        />
        {/* Glow effect when checked */}
        {checked && (
          <div className="absolute inset-0 rounded-full bg-primary-400/20 blur-md -z-10" />
        )}
      </button>
    </label>
  );
}
