import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import type { PokerRound } from '../../types';

interface Props {
  rounds: PokerRound[];
}

export default function RoundHistory({ rounds }: Props) {
  const { t } = useTranslation();
  const completedRounds = rounds.filter((r) => r.status === 'CONSENSUS' && r.finalEstimate != null);

  if (completedRounds.length === 0) return null;

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '14px 18px', borderBottom: '1px solid #E2E8F0',
      }}>
        <History size={15} strokeWidth={2} style={{ color: '#64748B' }} />
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1E293B' }}>
          {t('poker.room.history')}
        </h3>
        <span style={{
          fontSize: 12, fontWeight: 600, color: '#64748B',
          background: '#EDF0F4', borderRadius: 999, padding: '2px 8px',
          marginLeft: 'auto',
        }}>
          {completedRounds.length}
        </span>
      </div>

      <div style={{ padding: '4px 0' }}>
        {completedRounds.map((round, i) => (
          <div key={round.id} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 18px',
            borderBottom: i < completedRounds.length - 1 ? '1px solid #E2E8F0' : 'none',
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F7F8FA'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{
              fontSize: 13, fontWeight: 500,
              color: '#1E293B',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}>
              {round.taskTitle}
            </span>
            {round.finalEstimate != null ? (
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: '#2563EB',
                background: 'rgba(37,99,235,0.08)',
                padding: '3px 12px',
                borderRadius: 999,
                flexShrink: 0,
              }}>
                {round.finalEstimate} SP
              </span>
            ) : (
              <span style={{
                fontSize: 12, fontWeight: 500,
                color: '#94A3B8',
                fontStyle: 'italic',
              }}>
                {t('poker.room.skipped')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}