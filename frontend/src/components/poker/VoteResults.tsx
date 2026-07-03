import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, BarChart3, Users, Target } from 'lucide-react';
import type { PokerRound, PokerParticipant } from '../../types';

interface Props {
  round: PokerRound;
  participants: PokerParticipant[];
  isFacilitator: boolean;
  onAccept: (finalEstimate: number | null) => void;
  onRevote: () => void;
}

export default function VoteResults({ round, participants, isFacilitator, onAccept, onRevote }: Props) {
  const { t } = useTranslation();
  const [customEstimate, setCustomEstimate] = useState('');

  const stats = useMemo(() => {
    const numericVotes = round.votes
      .map((v) => parseFloat(v.value))
      .filter((n) => !isNaN(n));

    if (numericVotes.length === 0) return null;

    const avg = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
    const sorted = [...numericVotes].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    const freq: Record<number, number> = {};
    numericVotes.forEach((v) => { freq[v] = (freq[v] || 0) + 1; });
    const modeEntry = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    const mode = parseFloat(modeEntry[0]);

    return { avg: Math.round(avg * 10) / 10, min, max, mode, consensus: min === max };
  }, [round.votes]);

  const participantMap = useMemo(() => {
    const map: Record<string, string> = {};
    participants.forEach((p) => { map[p.userId] = p.displayName; });
    return map;
  }, [participants]);

  const handleAccept = () => {
    const val = customEstimate.trim();
    if (val) {
      const n = parseInt(val, 10);
      onAccept(isNaN(n) ? null : n);
    } else if (stats) {
      onAccept(Math.round(stats.avg));
    } else {
      onAccept(null);
    }
  };

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      <style>{`
        .vote-stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        @media(min-width:640px){.vote-stats-grid{grid-template-columns:repeat(3,1fr)}}
      `}</style>

      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <BarChart3 size={16} style={{ color: '#2563EB' }} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1E293B' }}>
          {t('poker.room.results')}
        </h3>
      </div>

      <div style={{ padding: 20 }}>
        {/* Stats cards */}
        {stats && (
          <div className="vote-stats-grid" style={{ marginBottom: 24 }}>
            {([
              { key: 'average', value: stats.avg, icon: BarChart3, color: '#2563EB', bg: 'rgba(37,99,235,0.06)' },
              { key: 'mode', value: stats.mode, icon: Target, color: '#8B5CF6', bg: 'rgba(139,92,246,0.06)' },
              { key: 'min', value: `${stats.min} - ${stats.max}`, icon: Users, color: '#64748B', bg: '#F7F8FA' },
            ] as const).map(({ key, value, icon: Icon, color, bg }) => (
              <div key={key} style={{
                textAlign: 'center',
                padding: '14px 12px',
                borderRadius: 10,
                background: bg,
                border: '1px solid #E2E8F0',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8' }}>
                  {t(`poker.room.${key}`)}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: '#1E293B' }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Consensus banner */}
        {stats?.consensus && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            fontWeight: 600,
            color: '#16A34A',
            background: 'rgba(22,163,74,0.06)',
            border: '1px solid rgba(22,163,74,0.15)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
          }}>
            <CheckCircle size={18} strokeWidth={2} />
            {t('poker.room.consensus')}
          </div>
        )}

        {/* Team votes */}
        <div style={{ marginBottom: isFacilitator ? 20 : 0 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: '#94A3B8', marginBottom: 12,
          }}>
            Team Votes
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {round.votes.map((vote) => {
              const numVal = parseFloat(vote.value);
              const deviates = stats && !isNaN(numVal) && Math.abs(numVal - stats.avg) > (stats.max - stats.min) * 0.4;
              return (
                <div key={vote.userId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 62,
                    height: 88,
                    borderRadius: 10,
                    border: `2px solid ${deviates ? '#F59E0B' : '#2563EB'}`,
                    background: deviates ? 'rgba(245,158,11,0.06)' : 'rgba(37,99,235,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    fontWeight: 800,
                    color: deviates ? '#F59E0B' : '#2563EB',
                    boxShadow: deviates ? '0 2px 8px rgba(245,158,11,0.15)' : '0 1px 3px rgba(37,99,235,0.08)',
                  }}>
                    {vote.value}
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#64748B',
                    maxWidth: 62,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}>
                    {participantMap[vote.userId] ?? '?'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Moderator panel */}
        {isFacilitator && (
          <div style={{
            borderTop: '1px solid #E2E8F0',
            paddingTop: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
            <p style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#64748B', margin: 0,
            }}>
              Moderator Panel
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', flexShrink: 0 }}>
                {t('poker.room.finalEstimate')}:
              </label>
              <input
                type="number"
                value={customEstimate}
                onChange={(e) => setCustomEstimate(e.target.value)}
                placeholder={stats ? String(Math.round(stats.avg)) : '--'}
                style={{
                  width: 80,
                  padding: '8px 12px',
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  color: '#1E293B',
                  background: '#F7F8FA',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  outline: 'none',
                  textAlign: 'center',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleAccept}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  color: '#FFFFFF',
                  background: '#2563EB',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  boxShadow: '0 1px 3px rgba(37,99,235,0.2)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#2563EB'; }}
              >
                {t('poker.room.acceptEstimate')}
              </button>
              <button
                onClick={onRevote}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  color: '#64748B',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#EDF0F4'; e.currentTarget.style.color = '#1E293B'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#64748B'; }}
              >
                {t('poker.room.revote')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}