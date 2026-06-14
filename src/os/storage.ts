/**
 * Thin localStorage wrapper used for all PromptOS persistence.
 *
 * Everything is namespaced under `promptos:` so we can wipe app data without
 * touching anything else the browser stores.
 */
const PREFIX = 'promptos:';

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — fail silently; the app keeps working in-memory.
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** Remove every PromptOS key from localStorage. */
export function clearAll(): void {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/** Storage keys used by the central store. App-local keys live alongside. */
export const KEYS = {
  generatedApps: 'generatedApps',
  notes: 'notes',
  files: 'files',
  settings: 'settings',
} as const;
