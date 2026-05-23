import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  open:      boolean;
  onClose:   () => void;
  title?:    string;
  description?: string;
  children:  ReactNode;
  footer?:   ReactNode;
  /** 'sm' ~380px · 'md' ~480px (default) · 'lg' ~600px · 'xl' ~720px */
  size?:     'sm' | 'md' | 'lg' | 'xl';
}

const widths = {
  sm: '23.75rem',
  md: '30rem',
  lg: '37.5rem',
  xl: '45rem',
};

export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-overlay)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col w-full animate-scale-in"
        style={{
          maxWidth: widths[size],
          maxHeight: 'calc(100vh - 2rem)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {(title || description) && (
          <div
            className="flex items-start justify-between gap-4 px-5 pt-4 pb-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div>
              {title && (
                <h2 className="text-[0.875rem] font-semibold leading-snug text-[var(--text)]" style={{ letterSpacing: '-0.02em' }}>
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-[0.75rem] text-[var(--text-muted)] mt-0.5 leading-snug">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-1 rounded-[var(--radius-sm)] text-[var(--text-faint)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
              style={{ transitionDuration: 'var(--duration)' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="px-5 py-3 flex items-center justify-end gap-2"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
