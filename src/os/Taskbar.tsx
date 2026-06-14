import { useEffect, useState } from 'react';
import { Search, LayoutGrid } from 'lucide-react';
import { useOS } from './store';
import { BUILTIN_APPS } from './appRegistry';
import { cn } from './utils';
import { AppIcon } from '../components/Icon';

/** Apps pinned to the dock by default. */
const PINNED = ['browser', 'files', 'paint', 'notes', 'calculator', 'terminal', 'mediaplayer', 'settings'];

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-end leading-tight px-2 select-none">
      <span className="text-sm font-medium tabular-nums">
        {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
      </span>
      <span className="text-[10px] text-slate-400">
        {now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </span>
    </div>
  );
}

export function Taskbar() {
  const windows = useOS((s) => s.windows);
  const openApp = useOS((s) => s.openApp);
  const toggleMinimize = useOS((s) => s.toggleMinimize);
  const focusWindow = useOS((s) => s.focusWindow);
  const setLauncherOpen = useOS((s) => s.setLauncherOpen);
  const launcherOpen = useOS((s) => s.launcherOpen);
  const topZ = useOS((s) => s.topZ);

  const pinnedApps = PINNED.map((id) => BUILTIN_APPS.find((a) => a.id === id)!).filter(Boolean);

  const openWindowFor = (appId: string) => {
    const win = windows.find((w) => w.appId === appId);
    if (win) {
      if (win.minimized || win.zIndex !== topZ) {
        win.minimized ? toggleMinimize(win.id) : focusWindow(win.id);
      } else {
        toggleMinimize(win.id);
      }
    } else {
      openApp(appId);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[6000] flex justify-center pb-3 pointer-events-none">
      <div className="pointer-events-auto glass rounded-2xl shadow-2xl flex items-center gap-1.5 px-2.5 py-2">
        {/* Start / launcher button */}
        <button
          onClick={() => setLauncherOpen(!launcherOpen)}
          className={cn(
            'grid place-items-center w-11 h-11 rounded-xl transition-colors',
            launcherOpen ? 'bg-accent text-white' : 'bg-white/10 hover:bg-white/20 text-slate-100',
          )}
          aria-label="Open launcher"
          title="Search apps (⌘/Ctrl+K)"
        >
          <LayoutGrid size={20} />
        </button>

        <div className="w-px h-8 bg-white/15 mx-0.5" />

        {/* Pinned apps */}
        {pinnedApps.map((app) => {
          const win = windows.find((w) => w.appId === app.id);
          return (
            <button
              key={app.id}
              onClick={() => openWindowFor(app.id)}
              className="relative grid place-items-center w-11 h-11 rounded-xl hover:bg-white/15 transition-colors group"
              title={app.name}
            >
              <AppIcon glyph={app.icon} size={24} />
              <span
                className={cn(
                  'absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 rounded-full transition-all',
                  win ? (win.zIndex === topZ && !win.minimized ? 'w-4 bg-accent' : 'w-1.5 bg-slate-400') : 'w-0',
                )}
              />
            </button>
          );
        })}

        <div className="w-px h-8 bg-white/15 mx-0.5" />

        {/* Search shortcut + clock */}
        <button
          onClick={() => setLauncherOpen(true)}
          className="grid place-items-center w-11 h-11 rounded-xl hover:bg-white/15 transition-colors"
          aria-label="Search"
        >
          <Search size={19} />
        </button>
        <Clock />
      </div>
    </div>
  );
}
