/**
 * Central PromptOS state (Zustand).
 *
 * Holds the window manager state plus all globally-shared, persisted data:
 * generated apps, notes, files, settings and transient toasts. Persistence is
 * handled by a reference-equality subscription at the bottom of this file so we
 * only write the slices that actually changed (window dragging won't thrash
 * localStorage).
 */
import { create } from 'zustand';
import type {
  GeneratedApp,
  Note,
  Settings,
  Toast,
  ToastType,
  VFile,
  WindowInstance,
} from './types';
import { KEYS, clearAll, load, save } from './storage';
import { getBuiltinApp } from './appRegistry';
import { generateApp } from './appGenerator';
import { uid } from './utils';

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  wallpaper: 'aurora',
  accent: '#6366f1',
  reduceMotion: false,
};

const DEFAULT_FILES: VFile[] = [
  { id: uid(), name: 'Documents', type: 'folder', folder: '/', createdAt: new Date().toISOString() },
  { id: uid(), name: 'Pictures', type: 'folder', folder: '/', createdAt: new Date().toISOString() },
  {
    id: uid(),
    name: 'welcome.txt',
    type: 'text',
    folder: 'Documents',
    content:
      'Welcome to PromptOS!\n\nSearch for any app in the launcher (click the search bar or press the menu).\nTry: paint, snake, calculator, budget tracker, flashcards, journal...\n\nIf an app does not exist yet, PromptOS will build it for you.',
    createdAt: new Date().toISOString(),
  },
];

interface OpenOptions {
  /** Allow multiple windows of the same app instead of focusing the existing one. */
  allowMultiple?: boolean;
}

interface OSState {
  // --- Window manager ---
  windows: WindowInstance[];
  topZ: number;
  launcherOpen: boolean;
  startMenuOpen: boolean;

  // --- Persisted data ---
  generatedApps: GeneratedApp[];
  notes: Note[];
  files: VFile[];
  settings: Settings;

  // --- Transient ---
  notifications: Toast[];

  // --- Window actions ---
  openApp: (appId: string, opts?: OpenOptions) => string | undefined;
  openGeneratedApp: (generatedId: string) => string | undefined;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMinimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  restoreWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  setWindowBounds: (id: string, bounds: Partial<Pick<WindowInstance, 'x' | 'y' | 'width' | 'height'>>) => void;

  // --- Launcher / menus ---
  setLauncherOpen: (open: boolean) => void;
  setStartMenuOpen: (open: boolean) => void;

  // --- Generated apps ---
  createApp: (term: string, open?: boolean) => GeneratedApp;
  updateGeneratedApp: (id: string, patch: Partial<GeneratedApp>) => void;
  updateGeneratedAppData: (id: string, data: Record<string, unknown>) => void;
  deleteGeneratedApp: (id: string) => void;

  // --- Notes ---
  createNote: () => Note;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  // --- Files ---
  createFile: (file: Omit<VFile, 'id' | 'createdAt'>) => VFile;
  updateFile: (id: string, patch: Partial<VFile>) => void;
  deleteFile: (id: string) => void;

  // --- Settings ---
  updateSettings: (patch: Partial<Settings>) => void;
  clearAllData: () => void;

  // --- Notifications ---
  notify: (message: string, type?: ToastType) => void;
  dismissNotification: (id: string) => void;
}

const CASCADE_STEP = 28;

/** Compute spawn bounds for a new window, cascading off the open count. */
function spawnBounds(
  count: number,
  size: { width: number; height: number },
): Pick<WindowInstance, 'x' | 'y' | 'width' | 'height'> {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const width = Math.min(size.width, vw - 40);
  const height = Math.min(size.height, vh - 120);
  const offset = (count % 6) * CASCADE_STEP;
  const baseX = Math.max(24, (vw - width) / 2 - 80) + offset;
  const baseY = Math.max(24, (vh - height) / 2 - 60) + offset;
  return { x: baseX, y: baseY, width, height };
}

export const useOS = create<OSState>((set, get) => ({
  windows: [],
  topZ: 10,
  launcherOpen: false,
  startMenuOpen: false,

  generatedApps: load(KEYS.generatedApps, [] as GeneratedApp[]),
  notes: load(KEYS.notes, [] as Note[]),
  files: load(KEYS.files, DEFAULT_FILES),
  settings: { ...DEFAULT_SETTINGS, ...load(KEYS.settings, {} as Partial<Settings>) },

  notifications: [],

  openApp: (appId, opts) => {
    const meta = getBuiltinApp(appId);
    if (!meta) return undefined;
    const state = get();
    if (!opts?.allowMultiple) {
      const existing = state.windows.find((w) => w.appId === appId);
      if (existing) {
        get().restoreWindow(existing.id);
        return existing.id;
      }
    }
    const id = uid('win');
    const z = state.topZ + 1;
    const bounds = spawnBounds(state.windows.length, meta.defaultSize);
    const win: WindowInstance = {
      id,
      appId,
      title: meta.name,
      icon: meta.icon,
      ...bounds,
      minSize: meta.minSize ?? { width: 320, height: 240 },
      zIndex: z,
      minimized: false,
      maximized: false,
    };
    set({ windows: [...state.windows, win], topZ: z, launcherOpen: false, startMenuOpen: false });
    return id;
  },

  openGeneratedApp: (generatedId) => {
    const state = get();
    const app = state.generatedApps.find((g) => g.id === generatedId);
    if (!app) return undefined;
    const appId = `generated:${generatedId}`;
    const existing = state.windows.find((w) => w.appId === appId);
    if (existing) {
      get().restoreWindow(existing.id);
      return existing.id;
    }
    const id = uid('win');
    const z = state.topZ + 1;
    const bounds = spawnBounds(state.windows.length, { width: 720, height: 540 });
    const win: WindowInstance = {
      id,
      appId,
      generatedId,
      title: app.name,
      icon: app.icon,
      ...bounds,
      minSize: { width: 360, height: 300 },
      zIndex: z,
      minimized: false,
      maximized: false,
    };
    set({ windows: [...state.windows, win], topZ: z, launcherOpen: false, startMenuOpen: false });
    return id;
  },

  closeWindow: (id) =>
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

  focusWindow: (id) =>
    set((s) => {
      const win = s.windows.find((w) => w.id === id);
      if (!win || win.zIndex === s.topZ) return {};
      const z = s.topZ + 1;
      return {
        topZ: z,
        windows: s.windows.map((w) => (w.id === id ? { ...w, zIndex: z } : w)),
      };
    }),

  minimizeWindow: (id) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
    })),

  toggleMinimize: (id) => {
    const s = get();
    const win = s.windows.find((w) => w.id === id);
    if (!win) return;
    if (win.minimized) get().restoreWindow(id);
    else get().minimizeWindow(id);
  },

  toggleMaximize: (id) =>
    set((s) => ({
      windows: s.windows.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized) {
          return { ...w, maximized: false, ...(w.prevBounds ?? {}), prevBounds: undefined };
        }
        return {
          ...w,
          maximized: true,
          prevBounds: { x: w.x, y: w.y, width: w.width, height: w.height },
        };
      }),
      topZ: s.topZ + 1,
    })),

  restoreWindow: (id) =>
    set((s) => {
      const z = s.topZ + 1;
      return {
        topZ: z,
        windows: s.windows.map((w) =>
          w.id === id ? { ...w, minimized: false, zIndex: z } : w,
        ),
      };
    }),

  moveWindow: (id, x, y) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    })),

  setWindowBounds: (id, bounds) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, ...bounds } : w)),
    })),

  setLauncherOpen: (open) => set({ launcherOpen: open, startMenuOpen: false }),
  setStartMenuOpen: (open) => set({ startMenuOpen: open, launcherOpen: false }),

  createApp: (term, open = true) => {
    const app = generateApp(term);
    set((s) => ({ generatedApps: [app, ...s.generatedApps] }));
    get().notify(`Created “${app.name}”`, 'success');
    if (open) {
      // Defer so the new app is in state before we open its window.
      setTimeout(() => get().openGeneratedApp(app.id), 0);
    }
    return app;
  },

  updateGeneratedApp: (id, patch) =>
    set((s) => ({
      generatedApps: s.generatedApps.map((g) => (g.id === id ? { ...g, ...patch } : g)),
      windows: s.windows.map((w) =>
        w.generatedId === id
          ? { ...w, title: patch.name ?? w.title, icon: patch.icon ?? w.icon }
          : w,
      ),
    })),

  updateGeneratedAppData: (id, data) =>
    set((s) => ({
      generatedApps: s.generatedApps.map((g) => (g.id === id ? { ...g, data } : g)),
    })),

  deleteGeneratedApp: (id) =>
    set((s) => ({
      generatedApps: s.generatedApps.filter((g) => g.id !== id),
      windows: s.windows.filter((w) => w.generatedId !== id),
    })),

  createNote: () => {
    const now = new Date().toISOString();
    const note: Note = { id: uid('note'), title: 'Untitled note', body: '', createdAt: now, updatedAt: now };
    set((s) => ({ notes: [note, ...s.notes] }));
    return note;
  },

  updateNote: (id, patch) =>
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
      ),
    })),

  deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

  createFile: (file) => {
    const vfile: VFile = { ...file, id: uid('file'), createdAt: new Date().toISOString() };
    set((s) => ({ files: [...s.files, vfile] }));
    return vfile;
  },

  updateFile: (id, patch) =>
    set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),

  deleteFile: (id) => set((s) => ({ files: s.files.filter((f) => f.id !== id) })),

  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  clearAllData: () => {
    clearAll();
    set({
      generatedApps: [],
      notes: [],
      files: DEFAULT_FILES,
      settings: DEFAULT_SETTINGS,
      windows: [],
    });
    get().notify('All local data cleared', 'success');
  },

  notify: (message, type = 'info') => {
    const toast: Toast = { id: uid('toast'), message, type };
    set((s) => ({ notifications: [...s.notifications, toast] }));
    setTimeout(() => get().dismissNotification(toast.id), 3600);
  },

  dismissNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((t) => t.id !== id) })),
}));

// --- Persistence: only write a slice when its reference actually changes. ---
let prev = useOS.getState();
useOS.subscribe((state) => {
  if (state.generatedApps !== prev.generatedApps) save(KEYS.generatedApps, state.generatedApps);
  if (state.notes !== prev.notes) save(KEYS.notes, state.notes);
  if (state.files !== prev.files) save(KEYS.files, state.files);
  if (state.settings !== prev.settings) save(KEYS.settings, state.settings);
  prev = state;
});
