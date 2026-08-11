const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "hace 2 h", "2 hours ago"... segun el idioma activo. */
export function relativeTime(isoDate: string, locale?: string): string {
  const seconds = (Date.now() - new Date(isoDate).getTime()) / 1000;
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });

  for (const [unit, secondsPerUnit] of UNITS) {
    if (seconds >= secondsPerUnit) {
      return formatter.format(-Math.floor(seconds / secondsPerUnit), unit);
    }
  }
  return formatter.format(-Math.floor(seconds), 'second');
}
