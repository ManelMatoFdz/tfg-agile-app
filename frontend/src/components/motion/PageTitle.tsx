import { motion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  style?: CSSProperties;
  as?: 'h1' | 'h2';
}

const MotionH1 = motion.create('h1');
const MotionH2 = motion.create('h2');

export default function PageTitle({ children, style, as = 'h1' }: Props) {
  const Tag = as === 'h1' ? MotionH1 : MotionH2;

  return (
    <Tag
      initial={{ clipPath: 'inset(100% 0 0 0)', opacity: 0 }}
      animate={{ clipPath: 'inset(0% 0 0 0)', opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{
        margin: 0,
        fontSize: '1.75rem',
        fontWeight: 700,
        color: 'var(--text)',
        letterSpacing: '-0.02em',
        fontFamily: 'var(--font-sans)',
        lineHeight: 1.2,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}