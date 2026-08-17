import { useEffect } from 'react';
import Lenis from 'lenis';

let lenisInstance: Lenis | null = null;

/* El scroll suave es global, asi que cualquier vista que quiera hacer scroll
   programatico o bloquearlo tiene que hablar con esta instancia: el
   `overflow: hidden` del body y `scrollIntoView` no la detienen. */
export function getLenis() {
  return lenisInstance;
}

export function useLenis() {
  useEffect(() => {
    if (lenisInstance) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    lenisInstance = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.5,
    });

    function raf(time: number) {
      lenisInstance?.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenisInstance?.destroy();
      lenisInstance = null;
    };
  }, []);
}