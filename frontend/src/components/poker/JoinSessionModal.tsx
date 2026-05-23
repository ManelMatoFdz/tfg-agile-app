import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card-strong p-6 w-full max-w-md mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t('poker.join.title')}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('poker.join.displayName')}</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('poker.join.displayNamePlaceholder')}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('poker.join.role')}</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={role === 'VOTER'}
                  onChange={() => setRole('VOTER')}
                  className="text-primary-600"
                />
                <span className="text-sm">{t('poker.roles.VOTER')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={role === 'OBSERVER'}
                  onChange={() => setRole('OBSERVER')}
                  className="text-primary-600"
                />
                <span className="text-sm">{t('poker.roles.OBSERVER')}</span>
              </label>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !displayName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? '...' : t('poker.join.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}