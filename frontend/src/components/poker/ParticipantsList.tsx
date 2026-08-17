import { useTranslation } from 'react-i18next';
import { Check, Users } from 'lucide-react';
import type { PokerParticipant } from '../../types';

interface Props {
  participants: PokerParticipant[];
  voteStatus: Record<string, boolean>;
  currentUserId?: string;
}

export default function ParticipantsList({ participants, voteStatus, currentUserId }: Props) {
  const { t } = useTranslation();
  const voters = participants.filter((p) => p.role === 'VOTER');
  const observers = participants.filter((p) => p.role === 'OBSERVER');
  const connectedCount = participants.filter((p) => p.connected).length;

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={15} strokeWidth={2} style={{ color: '#2563EB' }} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {t('poker.room.participants')}
          </h3>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 600, color: '#2563EB',
          background: 'rgba(37,99,235,0.08)',
          borderRadius: 999, padding: '2px 10px',
        }}>
          {connectedCount}
        </span>
      </div>

      <div style={{ padding: '12px 18px' }}>
        {voters.length > 0 && (
          <div style={{ marginBottom: observers.length > 0 ? 16 : 0 }}>
            <p style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 8,
            }}>
              {t('poker.roles.VOTER')}s
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {voters.map((p) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 8px', borderRadius: 8,
                  background: p.userId === currentUserId ? 'rgba(37,99,235,0.04)' : 'transparent',
                }}>
                  <div style={{
                    width: 8, height: 8,
                    borderRadius: 999, flexShrink: 0,
                    background: p.connected ? 'var(--success)' : 'var(--border-strong)',
                    boxShadow: p.connected ? '0 0 6px rgba(22,163,74,0.3)' : 'none',
                  }} />
                  <span style={{
                    fontSize: 13, fontWeight: p.userId === currentUserId ? 600 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    flex: 1,
                    color: p.connected ? 'var(--text)' : 'var(--text-faint)',
                  }}>
                    {p.displayName}
                    {p.userId === currentUserId && (
                      <span style={{ fontSize: 11, color: '#2563EB', marginLeft: 4, fontWeight: 500 }}>
                        ({t('common.you')})
                      </span>
                    )}
                  </span>
                  {voteStatus[p.userId] && (
                    <div style={{
                      width: 20, height: 20, borderRadius: 999,
                      background: 'rgba(22,163,74,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Check size={12} strokeWidth={2.5} style={{ color: '#16A34A' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {observers.length > 0 && (
          <div>
            <p style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 8,
            }}>
              {t('poker.roles.OBSERVER')}s
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {observers.map((p) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 8px', borderRadius: 8,
                }}>
                  <div style={{
                    width: 8, height: 8,
                    borderRadius: 999, flexShrink: 0,
                    background: p.connected ? 'var(--success)' : 'var(--border-strong)',
                  }} />
                  <span style={{
                    fontSize: 13,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: p.connected ? 'var(--text-muted)' : 'var(--text-faint)',
                  }}>
                    {p.displayName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}