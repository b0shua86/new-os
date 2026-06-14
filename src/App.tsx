import { useEffect } from 'react';
import { Desktop } from './os/Desktop';
import { useOS } from './os/store';
import { hexToRgbChannels, cn } from './os/utils';

/**
 * Root component. Applies the live theme + accent color to the OS root and
 * renders the desktop. All other state lives in the Zustand store.
 */
export default function App() {
  const theme = useOS((s) => s.settings.theme);
  const accent = useOS((s) => s.settings.accent);

  // Drive the accent CSS variable that Tailwind's `accent` color reads from.
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', hexToRgbChannels(accent));
  }, [accent]);

  // Keep the document background dark so overscroll/edges look right.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.style.background = theme === 'dark' ? '#020617' : '#e2e8f0';
  }, [theme]);

  return (
    <div className={cn('os-root w-full h-full', theme === 'light' && 'light')}>
      <Desktop />
    </div>
  );
}
