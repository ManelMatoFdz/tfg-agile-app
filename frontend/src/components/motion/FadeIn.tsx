import { motion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  style?: CSSProperties;
  className?: string;
}

export default function FadeIn({
  children,
  delay = 0,
  duration = 0.45,
  y = 8,
  style,
  className,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}