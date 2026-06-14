import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Sparkles, CornerDownLeft } from 'lucide-react';
import { useOS } from './store';
import { BUILTIN_APPS, resolveSearch, searchSuggestions } from './appRegistry';
import { TEMPLATE_LABELS } from './appGenerator';
import { cn } from './utils';
import { AppIcon } from '../components/Icon';
import type { BuiltinAppMeta, GeneratedApp, GenerationPreview } from './types';

type LauncherResult =
  | { kind: 'builtin'; app: BuiltinAppMeta }
  | { kind: 'generated'; app: GeneratedApp }
  | { kind: 'create'; preview: GenerationPreview };

/**
 * Spotlight / Start-menu style overlay. Type to filter built-in and generated
 * apps; if nothing matches, offer to *create* an app from the closest template.
 */
export function SearchLauncher() {
  const open = useOS((s) => s.launcherOpen);
  const setOpen = useOS((s) => s.setLauncherOpen);
  const generatedApps = useOS((s) => s.generatedApps);
  const openApp = useOS((s) => s.openApp);
  const openGeneratedApp = useOS((s) => s.openGeneratedApp);
  const createApp = useOS((s) => s.createApp);

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Focus after the open animation begins.
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Build the flat list of results shown in the overlay.
  const results = useMemo<LauncherResult[]>(() => {
    const q = query.trim();
    if (!q) {
      return BUILTIN_APPS.map((app) => ({ kind: 'builtin', app }));
    }
    const { builtins, generated } = searchSuggestions(q, generatedApps);
    const list: LauncherResult[] = [
      ...builtins.map((app) => ({ kind: 'builtin' as const, app })),
      ...generated.map((app) => ({ kind: 'generated' as const, app })),
    ];
    // Offer creation when there is no strong direct match.
    const resolution = resolveSearch(q, generatedApps);
    if (resolution.kind === 'create') {
      list.push({ kind: 'create', preview: resolution.preview });
    }
    return list;
  }, [query, generatedApps]);

  useEffect(() => {
    if (active >= results.length) setActive(Math.max(0, results.length - 1));
  }, [results.length, active]);

  if (!open) return null;

  const activate = (index: number) => {
    const item = results[index];
    if (!item) {
      if (query.trim()) createApp(query.trim());
      setOpen(false);
      return;
    }
    if (item.kind === 'builtin') openApp(item.app.id);
    else if (item.kind === 'generated') openGeneratedApp(item.app.id);
    else createApp(query.trim());
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activate(active);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[7000] flex items-start justify-center pt-[14vh] bg-black/40 backdrop-blur-sm animate-fade-in"
      onMouseDown={() => setOpen(false)}
    >
      <div
        className="glass-strong w-[min(92vw,620px)] rounded-2xl shadow-2xl overflow-hidden animate-launcher-in"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-white/10">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search apps, or describe one to create…"
            className="flex-1 bg-transparent outline-none text-slate-100 placeholder:text-slate-500 text-[15px]"
          />
          <kbd className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 border border-white/10 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        <div className="max-h-[46vh] overflow-y-auto scroll-thin py-2">
          {results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-400">No apps found.</div>
          )}
          {results.map((item, i) => {
            const selected = i === active;
            const key =
              item.kind === 'create' ? 'create' : `${item.kind}:${item.app.id}`;
            return (
              <button
                key={key}
                onMouseEnter={() => setActive(i)}
                onClick={() => activate(i)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  selected ? 'bg-accent/30' : 'hover:bg-white/5',
                )}
              >
                {item.kind === 'create' ? (
                  <span className="grid place-items-center w-9 h-9 rounded-xl bg-accent/20 border border-accent/30 shrink-0">
                    <Sparkles size={18} className="text-accent" />
                  </span>
                ) : (
                  <AppIcon glyph={item.app.icon} size={20} tile />
                )}
                <span className="min-w-0 flex-1">
                  {item.kind === 'create' ? (
                    <>
                      <span className="block text-sm text-slate-100">
                        Create app: <span className="font-semibold">{item.preview.name}</span>
                      </span>
                      <span className="block text-xs text-slate-400 truncate">
                        {TEMPLATE_LABELS[item.preview.templateType]} · {item.preview.description}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="block text-sm text-slate-100 truncate">{item.app.name}</span>
                      <span className="block text-xs text-slate-400 truncate">
                        {item.kind === 'generated' ? 'Your app' : item.app.description}
                      </span>
                    </>
                  )}
                </span>
                {selected && (
                  <CornerDownLeft size={14} className="text-slate-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
