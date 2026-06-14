/** Small shared utilities used across the OS. */

/** Generate a reasonably unique id. */
export function uid(prefix = ''): string {
  const core =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix ? `${prefix}_${core}` : core;
}

/** Tiny classnames helper (no dependency). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Capitalize each word of a string. */
export function titleCase(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Convert a #rrggbb hex string into "r g b" channel form for CSS vars. */
export function hexToRgbChannels(hex: string): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r} ${g} ${b}`;
}

/** Format a Date (or ISO string) as a short human date. */
export function formatDate(value: string | number | Date): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Today's date as a yyyy-mm-dd string (handy for date inputs). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
