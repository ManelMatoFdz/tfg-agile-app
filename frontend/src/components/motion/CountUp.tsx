import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
}

export default function CountUp({
  value,
  duration = 800,
  decimals = 0,
  suffix = '',
  prefix = '',
}: Props) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplay(value);
      return;
    }

    startTimeRef.current = performance.now();
    const from = 0;
    const to = value;

    function step(now: number) {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    }

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return (
    <>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </>
  );
}