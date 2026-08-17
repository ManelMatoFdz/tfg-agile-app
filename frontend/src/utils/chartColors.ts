import { useThemeStore } from '../store/themeStore';

/* Recharts pinta con atributos de presentacion SVG (fill="...", stroke="..."),
   y ahi var() no se resuelve: el navegador se queda con el valor literal y la
   serie sale sin color. Por eso las graficas son el unico sitio de la app que
   necesita los colores ya resueltos en vez de los tokens. */

const LIGHT = {
  grid:     '#E2E8F0',
  axis:     '#94A3B8',
  axisText: '#64748B',
  accent:   '#2563EB',
  success:  '#16A34A',
  muted:    '#CBD5E1',
  critical: '#DC2626',
  high:     '#D97706',
  medium:   '#2563EB',
  low:      '#94A3B8',
};

const DARK: typeof LIGHT = {
  grid:     '#2E3C5C',
  axis:     '#7183A1',
  axisText: '#98A6C0',
  accent:   '#60A5FA',
  success:  '#34D399',
  muted:    '#3D4C68',
  critical: '#F87171',
  high:     '#FBBF24',
  medium:   '#60A5FA',
  low:      '#7183A1',
};

export function useChartColors() {
  return useThemeStore(s => s.theme) === 'dark' ? DARK : LIGHT;
}