import { useTranslation } from 'react-i18next';
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

  return (
    <div className="glass-card-strong p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        {t('poker.room.participants')} ({participants.filter((p) => p.connected).length})
      </h3>

      {voters.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{t('poker.roles.VOTER')}s</p>
          <div className="space-y-1.5">
            {voters.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${p.connected ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                <span className={`text-sm truncate flex-1 ${!p.connected ? 'text-gray-400' : 'text-gray-700'}`}>
                  {p.displayName}
                  {p.userId === currentUserId && (
                    <span className="text-xs text-primary-500 ml-1">({t('common.you')})</span>
                  )}
                </span>
                {voteStatus[p.userId] && (
                  <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {observers.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{t('poker.roles.OBSERVER')}s</p>
          <div className="space-y-1.5">
            {observers.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${p.connected ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                <span className={`text-sm truncate ${!p.connected ? 'text-gray-400' : 'text-gray-700'}`}>
                  {p.displayName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}