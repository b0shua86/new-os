/**
 * Registry of built-in apps.
 *
 * Metadata is plain data (safe to import anywhere). The actual components are
 * lazy-loaded so this module never eagerly imports the apps — which keeps the
 * store ⇄ registry relationship free of import cycles.
 */
import { lazy } from 'react';
import type {
  AppComponent,
  BuiltinAppMeta,
  GeneratedApp,
  GenerationPreview,
  SearchResolution,
} from './types';
import { previewGeneration } from './appGenerator';

export const BUILTIN_APPS: BuiltinAppMeta[] = [
  {
    id: 'browser',
    name: 'Browser',
    icon: '🌐',
    description: 'A sandboxed web browser with bookmarks and tabs.',
    category: 'system',
    keywords: ['internet', 'web', 'browser', 'google', 'search', 'www'],
    defaultSize: { width: 880, height: 600 },
    minSize: { width: 480, height: 360 },
  },
  {
    id: 'paint',
    name: 'Paint',
    icon: '🎨',
    description: 'A drawing canvas with brushes and colors.',
    category: 'creative',
    keywords: ['paint', 'draw', 'drawing', 'sketch', 'canvas', 'art'],
    defaultSize: { width: 820, height: 600 },
    minSize: { width: 520, height: 420 },
  },
  {
    id: 'minesweeper',
    name: 'Minesweeper',
    icon: '💣',
    description: 'The classic mine-finding puzzle game.',
    category: 'game',
    keywords: ['minesweeper', 'mines', 'bomb', 'puzzle'],
    defaultSize: { width: 520, height: 600 },
    minSize: { width: 360, height: 460 },
  },
  {
    id: 'snake',
    name: 'Snake',
    icon: '🐍',
    description: 'Eat, grow, and avoid yourself.',
    category: 'game',
    keywords: ['snake', 'arcade', 'retro'],
    defaultSize: { width: 520, height: 620 },
    minSize: { width: 380, height: 480 },
  },
  {
    id: 'calculator',
    name: 'Calculator',
    icon: '🧮',
    description: 'Basic arithmetic calculator.',
    category: 'tool',
    keywords: ['calculator', 'calc', 'math', 'arithmetic'],
    defaultSize: { width: 340, height: 520 },
    minSize: { width: 280, height: 440 },
  },
  {
    id: 'notes',
    name: 'Notes',
    icon: '📝',
    description: 'Write and keep quick notes.',
    category: 'tool',
    keywords: ['notes', 'note', 'memo', 'text'],
    defaultSize: { width: 760, height: 560 },
    minSize: { width: 480, height: 360 },
  },
  {
    id: 'files',
    name: 'Files',
    icon: '📁',
    description: 'Browse virtual folders, apps, notes and files.',
    category: 'system',
    keywords: ['files', 'finder', 'explorer', 'folders', 'documents'],
    defaultSize: { width: 800, height: 560 },
    minSize: { width: 520, height: 380 },
  },
  {
    id: 'mediaplayer',
    name: 'Media Player',
    icon: '🎵',
    description: 'A music player shell with playlist and visualizer.',
    category: 'media',
    keywords: ['music', 'media', 'player', 'audio', 'songs', 'playlist', 'mp3'],
    defaultSize: { width: 760, height: 560 },
    minSize: { width: 480, height: 420 },
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: '⚙️',
    description: 'Personalize wallpaper, theme and accent.',
    category: 'system',
    keywords: ['settings', 'preferences', 'config', 'theme', 'wallpaper'],
    defaultSize: { width: 720, height: 560 },
    minSize: { width: 480, height: 400 },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    icon: '🖥️',
    description: 'A command line for driving the OS.',
    category: 'system',
    keywords: ['terminal', 'console', 'shell', 'command', 'cli'],
    defaultSize: { width: 700, height: 460 },
    minSize: { width: 420, height: 280 },
  },
  {
    id: 'studio',
    name: 'App Studio',
    icon: '🧩',
    description: 'Manage, rename and edit your generated apps.',
    category: 'system',
    keywords: ['studio', 'apps', 'manage', 'generated', 'builder'],
    defaultSize: { width: 820, height: 580 },
    minSize: { width: 520, height: 400 },
  },
];

/** Lazy component map keyed by built-in app id. */
export const APP_COMPONENTS: Record<string, AppComponent> = {
  browser: lazy(() => import('../apps/BrowserApp')),
  paint: lazy(() => import('../apps/PaintApp')),
  minesweeper: lazy(() => import('../apps/MinesweeperApp')),
  snake: lazy(() => import('../apps/SnakeApp')),
  calculator: lazy(() => import('../apps/CalculatorApp')),
  notes: lazy(() => import('../apps/NotesApp')),
  files: lazy(() => import('../apps/FilesApp')),
  mediaplayer: lazy(() => import('../apps/MediaPlayerApp')),
  settings: lazy(() => import('../apps/SettingsApp')),
  terminal: lazy(() => import('../apps/TerminalApp')),
  studio: lazy(() => import('../apps/AppStudio')),
};

export function getBuiltinApp(id: string): BuiltinAppMeta | undefined {
  return BUILTIN_APPS.find((a) => a.id === id);
}

/** Find a built-in app whose name or keywords match the query. */
export function matchBuiltins(query: string): BuiltinAppMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return BUILTIN_APPS.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.id.includes(q) ||
      a.keywords.some((k) => k.includes(q) || q.includes(k)),
  );
}

function exactBuiltin(query: string): BuiltinAppMeta | undefined {
  const q = query.trim().toLowerCase();
  return BUILTIN_APPS.find(
    (a) => a.name.toLowerCase() === q || a.id === q || a.keywords.includes(q),
  );
}

function matchGenerated(query: string, generated: GeneratedApp[]): GeneratedApp[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return generated.filter(
    (g) => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q),
  );
}

/**
 * Resolve a query into the single best action for the launcher's primary
 * (Enter) action: open a built-in, open an existing generated app, or create.
 */
export function resolveSearch(
  query: string,
  generated: GeneratedApp[],
): SearchResolution {
  const builtin = exactBuiltin(query) ?? matchBuiltins(query)[0];
  if (builtin) return { kind: 'builtin', app: builtin };

  const q = query.trim().toLowerCase();
  const gen =
    generated.find((g) => g.name.toLowerCase() === q) ?? matchGenerated(query, generated)[0];
  if (gen) return { kind: 'generated', app: gen };

  const preview: GenerationPreview = previewGeneration(query);
  return { kind: 'create', preview };
}

/** All suggestions (built-ins + generated) for the live result list. */
export function searchSuggestions(query: string, generated: GeneratedApp[]) {
  return {
    builtins: matchBuiltins(query),
    generated: matchGenerated(query, generated),
  };
}
