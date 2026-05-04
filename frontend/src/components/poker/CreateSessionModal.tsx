import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DeckType } from '../../types';

interface Props {
  onClose: () => void;
  onCreate: (name: string, deck: DeckType) => Promise<void>;
}

const DECKS: DeckType[] = ['FIBONACCI', 'T_SHIRT', 'POWERS_OF_2'];

export default function CreateSessionModal({ onClose, onCreate }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [deck, setDeck] = useState<DeckType>('FIBONACCI');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onCreate(name.trim(), deck);
      onClose();
    } catch {
      setError(t('poker.create.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card-strong p-6 w-full max-w-md mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t('poker.create.title')}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('poker.create.name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('poker.create.namePlaceholder')}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('poker.create.deck')}</label>
            <select
              value={deck}
              onChange={(e) => setDeck(e.target.value as DeckType)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
            >
              {DECKS.map((d) => (
                <option key={d} value={d}>{t(`poker.decks.${d}`)}</option>
              ))}
            </select>
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
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? '...' : t('poker.create.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
