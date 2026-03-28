import { useEffect, useState } from 'react';

interface Props {
  type: 'error' | 'success' | 'info';
  message: string;
  onClose?: () => void;
}

const config = {
  error: {
    bg: 'bg-red-50/80 backdrop-blur-sm',
    border: 'border-red-200/60',
    text: 'text-red-700',
    icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    iconBg: 'bg-red-100 text-red-600',
  },
  success: {
    bg: 'bg-emerald-50/80 backdrop-blur-sm',
    border: 'border-emerald-200/60',
    text: 'text-emerald-700',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    iconBg: 'bg-emerald-100 text-emerald-600',
  },
  info: {
    bg: 'bg-primary-50/80 backdrop-blur-sm',
    border: 'border-primary-200/60',
    text: 'text-primary-700',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    iconBg: 'bg-primary-100 text-primary-600',
  },
};

export default function Alert({ type, message, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const c = config[type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={`
        flex items-center gap-3 rounded-xl border px-4 py-3 text-sm
        transition-all duration-500 ease-out
        ${c.bg} ${c.border} ${c.text}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.iconBg}`}>
        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={c.icon} />
        </svg>
      </div>
      <span className="flex-1 font-medium">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer p-1 rounded-lg hover:bg-black/5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
