import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

const PRIORITY = {
  critical: { bg: 'rgba(220,38,38,0.16)',  fg: 'var(--k-danger-fg)', br: 'rgba(248,113,113,0.3)' },
  high:     { bg: 'rgba(234,88,12,0.16)',  fg: 'var(--k-warn-fg)', br: 'rgba(251,146,60,0.3)' },
  medium:   { bg: 'rgba(37,99,235,0.16)',  fg: 'var(--k-info-fg)', br: 'rgba(96,165,250,0.3)' },
  low:      { bg: 'rgba(100,116,139,0.18)', fg: 'var(--k-neutral-fg)', br: 'rgba(148,163,184,0.28)' },
} as const;

const AVATARS = ['#2563EB', '#7C3AED', '#059669', '#DB2777', '#EA580C'];

type Card = { id: string; prio: keyof typeof PRIORITY; pts: number; who: number };

const COLUMNS: { key: string; cards: Card[] }[] = [
  { key: 'todo', cards: [
    { id: 'a1', prio: 'critical', pts: 8, who: 0 },
    { id: 'a2', prio: 'medium',   pts: 3, who: 1 },
    { id: 'a3', prio: 'low',      pts: 2, who: 2 },
  ] },
  { key: 'progress', cards: [
    { id: 'b1', prio: 'high',   pts: 5, who: 3 },
    { id: 'b2', prio: 'medium', pts: 5, who: 0 },
  ] },
  { key: 'review', cards: [
    { id: 'c1', prio: 'high', pts: 13, who: 4 },
  ] },
  { key: 'done', cards: [
    { id: 'd1', prio: 'medium', pts: 3, who: 2 },
    { id: 'd2', prio: 'low',    pts: 1, who: 1 },
  ] },
];

const DECK = ['1', '2', '3', '5', '8'];

export default function BoardMockup() {
  const { t } = useTranslation();
  const [pick, setPick] = useState(3);

  /* Ciclo lento sobre la baraja: sugiere una votacion viva sin distraer. */
  useEffect(() => {
    const id = window.setInterval(() => setPick((p) => (p + 1) % DECK.length), 2200);
    return () => window.clearInterval(id);
  }, []);

  let order = 0;

  return (
    <div className="kdz-stage">
      <motion.div
        className="kdz-window"
        initial={{ opacity: 0, y: 42, rotateX: 16 }}
        animate={{ opacity: 1, y: 0, rotateX: 9 }}
        transition={{ duration: 1.05, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="kdz-window-bar">
          <span className="kdz-dots"><i /><i /><i /></span>
          <span className="kdz-window-title">kadenza.app / sprint-14 · {t('landing.mock.board')}</span>
        </div>

        <div className="kdz-board">
          {COLUMNS.map((col) => (
            <div key={col.key}>
              <div className="kdz-col-head">
                <span>{t(`landing.mock.col.${col.key}`)}</span>
                <span className="kdz-col-count">{col.cards.length}</span>
              </div>

              {col.cards.map((card) => {
                const p = PRIORITY[card.prio];
                const delay = 0.55 + (order++) * 0.07;
                return (
                  <motion.div
                    key={card.id}
                    className="kdz-card"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="kdz-card-top">
                      <span
                        className="kdz-tag"
                        style={{ background: p.bg, color: p.fg, border: `1px solid ${p.br}` }}
                      >
                        {t(`landing.mock.prio.${card.prio}`)}
                      </span>
                    </div>
                    <p className="kdz-card-title">{t(`landing.mock.task.${card.id}`)}</p>
                    <div className="kdz-card-foot">
                      <span className="kdz-pts">{card.pts}</span>
                      <span className="kdz-ava" style={{ background: AVATARS[card.who] }}>
                        {t(`landing.mock.task.${card.id}`).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="kdz-poker"
        initial={{ opacity: 0, y: 28, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 1.15, ease: [0.22, 1, 0.36, 1] }}
      >
        {DECK.map((v, i) => (
          <motion.span
            key={v}
            className="kdz-chip"
            data-on={i === pick}
            animate={{ y: i === pick ? -8 : 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}
          >
            {v}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}