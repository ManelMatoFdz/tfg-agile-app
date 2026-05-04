import { useTranslation } from 'react-i18next';
import type { PokerRound } from '../../types';

interface Props {
  rounds: PokerRound[];
}

export default function RoundHistory({ rounds }: Props) {
  const { t } = useTranslation();
  const completedRounds = rounds.filter((r) => r.status === 'CONSENSUS');

  if (completedRounds.length === 0) return null;

  return (
    <div className="glass-card-strong p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('poker.room.history')}</h3>
      <div className="space-y-2">
        {completedRounds.map((round) => (
          <div key={round.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-700 truncate flex-1">{round.taskTitle}</span>
            {round.finalEstimate != null ? (
              <span className="text-sm font-bold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full">
                {round.finalEstimate} SP
              </span>
            ) : (
              <span className="text-xs text-gray-400">{t('poker.room.skipped')}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}