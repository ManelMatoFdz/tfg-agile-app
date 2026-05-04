import { useTranslation } from 'react-i18next';
import type { DeckType } from '../../types';

interface Props {
  deck: DeckType;
  selectedValue: string | null;
  onVote: (value: string) => void;
  disabled?: boolean;
}

const DECK_VALUES: Record<DeckType, string[]> = {
  FIBONACCI: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '?', '\u2615'],
  T_SHIRT: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '\u2615'],
  POWERS_OF_2: ['0', '1', '2', '4', '8', '16', '32', '64', '?', '\u2615'],
};

export default function VotingCards({ deck, selectedValue, onVote, disabled }: Props) {
  const { t } = useTranslation();
  const values = DECK_VALUES[deck] ?? DECK_VALUES.FIBONACCI;

  return (
    <div>
      <p className="text-sm font-medium text-gray-600 mb-3">{t('poker.room.yourVote')}</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {values.map((val) => (
          <button
            key={val}
            onClick={() => onVote(val)}
            disabled={disabled}
            className={`
              w-14 h-20 rounded-xl border-2 text-lg font-bold transition-all cursor-pointer
              flex items-center justify-center
              ${selectedValue === val
                ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-md -translate-y-1'
                : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:shadow-sm hover:-translate-y-0.5'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {val}
          </button>
        ))}
      </div>
    </div>
  );
}