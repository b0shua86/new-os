import { useCallback, useEffect, useState } from 'react';
import { load, save } from './storage';

/**
 * A useState-like hook that transparently persists to localStorage (namespaced
 * by storage.ts). Used by self-contained apps that own their own data
 * (Paint, Browser, games' high scores, etc.) without touching the global store.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => load(key, initial));

  useEffect(() => {
    save(key, value);
  }, [key, value]);

  const reset = useCallback(() => setValue(initial), [initial]);

  return [value, setValue, reset] as const;
}
