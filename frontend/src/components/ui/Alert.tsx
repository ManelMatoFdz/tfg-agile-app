import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface Props {
  type: 'error' | 'success' | 'info';
  message: string;
  onClose?: () => void;
}

const palette = {
  error:   { color: 'var(--danger)',  bg: 'var(--danger-bg)',  border: 'var(--danger)',  Icon: AlertCircle },
  success: { color: 'var(--success)', bg: 'var(--success-bg)', border: 'var(--success)', Icon: CheckCircle2 },
  info:    { color: 'var(--info)',    bg: 'var(--info-bg)',    border: 'var(--info)',    Icon: Info },
};

export default function Alert({ type, message, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const c = palette[type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 16px',
        fontSize: 13,
        fontWeight: 500,
        color: c.color,
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 'var(--radius-md)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-4px)',
        transition: 'opacity var(--duration-panel) var(--ease-out), transform var(--duration-panel) var(--ease-out)',
      }}
    >
      <c.Icon size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ flex: 1, lineHeight: 1.5 }}>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 2,
            background: 'transparent',
            border: 'none',
            color: c.color,
            opacity: 0.6,
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; }}
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}