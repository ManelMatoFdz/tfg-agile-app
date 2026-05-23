import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    <div className="glass-card-strong p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('poker.room.results')}</h3>

      {/* Vote cards */}
      <div className="flex flex-wrap gap-3 justify-center mb-5">
        {round.votes.map((vote) => (
          <div key={vote.userId} className="flex flex-col items-center gap-1">
            <div className="w-14 h-20 rounded-xl border-2 border-primary-300 bg-primary-50 flex items-center justify-center text-lg font-bold text-primary-700">
              {vote.value}
            </div>
            <span className="text-xs text-gray-500 max-w-[3.5rem] truncate">
              {participantMap[vote.userId] ?? '?'}
            </span>
          </div>
        ))}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="text-center p-2 rounded-xl bg-gray-50">
            <p className="text-xs text-gray-400">{t('poker.room.average')}</p>
            <p className="text-lg font-bold text-gray-900">{stats.avg}</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-gray-50">
            <p className="text-xs text-gray-400">{t('poker.room.mode')}</p>
            <p className="text-lg font-bold text-gray-900">{stats.mode}</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-gray-50">
            <p className="text-xs text-gray-400">{t('poker.room.min')}</p>
            <p className="text-lg font-bold text-gray-900">{stats.min}</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-gray-50">
            <p className="text-xs text-gray-400">{t('poker.room.max')}</p>
            <p className="text-lg font-bold text-gray-900">{stats.max}</p>
          </div>
        </div>
      )}

      {stats?.consensus && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('poker.room.consensus')}
        </div>
      )}

      {/* Facilitator actions */}
      {isFacilitator && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 shrink-0">{t('poker.room.finalEstimate')}:</label>
            <input
              type="number"
              value={customEstimate}
              onChange={(e) => setCustomEstimate(e.target.value)}
              placeholder={stats ? String(Math.round(stats.avg)) : '—'}
              className="w-20 px-2 py-1 text-sm rounded-lg border border-gray-200 focus:border-primary-400 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer"
            >
              {t('poker.room.acceptEstimate')}
            </button>
            <button
              onClick={onRevote}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              {t('poker.room.revote')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}