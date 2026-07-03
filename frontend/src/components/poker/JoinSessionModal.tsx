import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { ParticipantRole } from '../../types';

interface Props {
  onClose: () => void;
  onJoin: (displayName: string, role: ParticipantRole) => Promise<void>;
  defaultRole?: ParticipantRole;
}

export default function JoinSessionModal({ onClose, onJoin, defaultRole = 'VOTER' }: Props) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<ParticipantRole>(defaultRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onJoin(displayName.trim(), role);
      onClose();
    } catch {
      setError(t('poker.join.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15,23,42,0.4)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'fade-in 200ms ease both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          margin: '0 16px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid #E2E8F0',
        }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1E293B' }}>
            {t('poker.join.title')}
          </h2>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, border: 'none', background: 'transparent',
              borderRadius: 8, cursor: 'pointer', color: '#94A3B8',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#EDF0F4'; e.currentTarget.style.color = '#1E293B'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6,
            }}>
              {t('poker.join.displayName')}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('poker.join.displayNamePlaceholder')}
              style={{
                width: '100%', padding: '10px 14px', fontSize: 14,
                color: '#1E293B', background: '#F7F8FA',
                border: '1px solid #E2E8F0', borderRadius: 8,
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                fontFamily: 'inherit',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
              autoFocus
            />
          </div>

          <div>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 8,
            }}>
              {t('poker.join.role')}
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              {(['VOTER', 'OBSERVER'] as const).map((r) => {
                const isActive = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      border: `2px solid ${isActive ? '#2563EB' : '#E2E8F0'}`,
                      borderRadius: 8,
                      background: isActive ? 'rgba(37,99,235,0.06)' : '#FFFFFF',
                      color: isActive ? '#2563EB' : '#64748B',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: 'inherit',
                    }}
                  >
                    {t(`poker.roles.${r}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: '#DC2626', background: 'rgba(220,38,38,0.06)', padding: '8px 12px', borderRadius: 8 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px', fontSize: 13, fontWeight: 500,
                color: '#64748B', background: 'transparent',
                border: '1px solid #E2E8F0', borderRadius: 8,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EDF0F4'; e.currentTarget.style.color = '#1E293B'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !displayName.trim()}
              style={{
                padding: '9px 20px', fontSize: 13, fontWeight: 600,
                background: '#2563EB', color: '#FFFFFF',
                border: 'none', borderRadius: 8,
                cursor: loading || !displayName.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !displayName.trim() ? 0.5 : 1,
                fontFamily: 'inherit',
                transition: 'background 0.15s',
                boxShadow: '0 1px 3px rgba(37,99,235,0.2)',
              }}
              onMouseEnter={e => { if (!loading && displayName.trim()) e.currentTarget.style.background = '#1D4ED8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#2563EB'; }}
            >
              {loading ? '...' : t('poker.join.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}