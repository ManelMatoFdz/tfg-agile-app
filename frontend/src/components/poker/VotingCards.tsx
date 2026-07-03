import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
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
  const [hoveredVal, setHoveredVal] = useState<string | null>(null);

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 12,
      padding: '20px 24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {t('poker.room.yourVote')}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {values.map((val) => {
          const isSelected = selectedValue === val;
          const isHovered = hoveredVal === val;
          return (
            <button
              key={val}
              onClick={() => onVote(val)}
              disabled={disabled}
              onMouseEnter={() => setHoveredVal(val)}
              onMouseLeave={() => setHoveredVal(null)}
              style={{
                width: 62,
                height: 88,
                borderRadius: 10,
                border: `2px solid ${isSelected ? '#2563EB' : isHovered && !disabled ? '#93C5FD' : '#E2E8F0'}`,
                background: isSelected ? '#2563EB' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#1E293B',
                fontSize: 20,
                fontWeight: 700,
                fontFamily: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                transform: isSelected ? 'translateY(-6px) scale(1.05)' : isHovered && !disabled ? 'translateY(-3px)' : 'none',
                boxShadow: isSelected
                  ? '0 8px 20px rgba(37,99,235,0.25)'
                  : isHovered && !disabled
                    ? '0 4px 12px rgba(0,0,0,0.08)'
                    : '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                position: 'relative',
              }}
            >
              {val}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: 4, right: 4,
                  width: 16, height: 16,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={10} strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}