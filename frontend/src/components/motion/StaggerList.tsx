import { motion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  stagger?: number;
  style?: CSSProperties;
  className?: string;
}

const container = {
  hidden: {},
  show: (stagger: number) => ({
    transition: { staggerChildren: stagger },
  }),
};

export const staggerItem = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function StaggerList({
  children,
  stagger = 0.04,
  style,
  className,
}: Props) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      custom={stagger}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}