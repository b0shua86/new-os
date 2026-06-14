import { useEffect } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { useOS } from './store';
import { BUILTIN_APPS } from './appRegistry';
import { wallpaperCss } from './wallpapers';
import { WindowManager } from './WindowManager';
import { SearchLauncher } from './SearchLauncher';
import { Taskbar } from './Taskbar';
import { Notifications } from './Notifications';
import { AppIcon } from '../components/Icon';

/** Apps shown as shortcuts on the desktop surface. */
const DESKTOP_APPS = ['browser', 'paint', 'minesweeper', 'snake', 'studio'];

function DesktopIcons() {
  const openApp = useOS((s) => s.openApp);
  const openGeneratedApp = useOS((s) => s.openGeneratedApp);
  const generatedApps = useOS((s) => s.generatedApps);

  const apps = DESKTOP_APPS.map((id) => BUILTIN_APPS.find((a) => a.id === id)!).filter(Boolean);

  return (
    <div className="absolute top-4 left-4 grid grid-flow-col grid-rows-6 gap-1 content-start">
      {apps.map((app) => (
        <button
          key={app.id}
          onDoubleClick={() => openApp(app.id)}
          onClick={(e) => e.detail === 2 && openApp(app.id)}
          className="w-20 flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 focus:bg-white/10 transition-colors group"
          title={`Open ${app.name}`}
        >
          <AppIcon glyph={app.icon} size={30} />
          <span className="text-[11px] text-slate-100/90 text-center leading-tight drop-shadow truncate w-full">
            {app.name}
          </span>
        </button>
      ))}
      {generatedApps.slice(0, 7).map((app) => (
        <button
          key={app.id}
          onDoubleClick={() => openGeneratedApp(app.id)}
          onClick={(e) => e.detail === 2 && openGeneratedApp(app.id)}
          className="w-20 flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 transition-colors"
          title={`Open ${app.name}`}
        >
          <AppIcon glyph={app.icon} size={30} />
          <span className="text-[11px] text-slate-100/90 text-center leading-tight drop-shadow truncate w-full">
            {app.name}
          </span>
        </button>
      ))}
    </div>
  );
}

function Hero() {
  const setLauncherOpen = useOS((s) => s.setLauncherOpen);
  const count = useOS((s) => s.generatedApps.length);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none">
      <div className="text-center pointer-events-none select-none">
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent drop-shadow">
          PromptOS
        </h1>
        <p className="mt-2 text-slate-300/80 text-sm flex items-center justify-center gap-1.5">
          <Sparkles size={14} className="text-accent" />
          Search for any app — if it doesn&apos;t exist, we&apos;ll build it.
        </p>
      </div>

      <button
        onClick={() => setLauncherOpen(true)}
        className="pointer-events-auto glass rounded-2xl shadow-2xl w-[min(90vw,520px)] h-14 px-5 flex items-center gap-3 text-left hover:bg-white/15 transition-colors group"
      >
        <Search size={20} className="text-slate-300" />
        <span className="text-slate-300/80 flex-1">
          Try “calculator”, “budget tracker”, “snake”, “journal”…
        </span>
        <kbd className="hidden sm:flex items-center gap-1 text-[11px] text-slate-300 border border-white/15 rounded px-1.5 py-1">
          ⌘K
        </kbd>
      </button>

      {count > 0 && (
        <p className="text-xs text-slate-400/80 pointer-events-none">
          {count} app{count === 1 ? '' : 's'} in your library
        </p>
      )}
    </div>
  );
}

export function Desktop() {
  const settings = useOS((s) => s.settings);
  const launcherOpen = useOS((s) => s.launcherOpen);
  const setLauncherOpen = useOS((s) => s.setLauncherOpen);
  const hasWindows = useOS((s) => s.windows.some((w) => !w.minimized));

  // Global shortcut: Cmd/Ctrl+K toggles the launcher.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setLauncherOpen(!useOS.getState().launcherOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setLauncherOpen]);

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: wallpaperCss(settings.wallpaper) }}
    >
      {/* subtle vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 pointer-events-none" />

      <DesktopIcons />
      {!hasWindows && <Hero />}

      <WindowManager />

      {launcherOpen && <SearchLauncher />}
      <Notifications />
      <Taskbar />
    </div>
  );
}
