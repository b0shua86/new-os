/**
 * Core shared types for PromptOS.
 *
 * Everything that gets persisted, rendered, or passed between the window
 * manager and apps is described here so the whole system stays consistent.
 */
import type { LazyExoticComponent, ComponentType } from 'react';

/** Categories used to group built-in apps in the launcher / file manager. */
export type AppCategory = 'system' | 'tool' | 'game' | 'media' | 'creative';

/** Metadata describing a built-in (hand-written) application. */
export interface BuiltinAppMeta {
  id: string;
  name: string;
  /** Emoji used as the app icon throughout the OS. */
  icon: string;
  description: string;
  category: AppCategory;
  /** Extra search terms that should resolve to this app. */
  keywords: string[];
  defaultSize: { width: number; height: number };
  minSize?: { width: number; height: number };
}

/** Props every app component receives from the window manager. */
export interface AppComponentProps {
  windowId: string;
}

export type AppComponent =
  | ComponentType<AppComponentProps>
  | LazyExoticComponent<ComponentType<AppComponentProps>>;

/** A live window on the desktop. */
export interface WindowInstance {
  id: string;
  /** Either a built-in app id, or `generated:<generatedId>`. */
  appId: string;
  /** Set when this window hosts a generated app. */
  generatedId?: string;
  title: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minSize: { width: number; height: number };
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  /** Saved bounds used to restore a maximized window. */
  prevBounds?: { x: number; y: number; width: number; height: number };
}

/** The template families a generated app can be rendered with. */
export type TemplateType =
  | 'tracker'
  | 'collection'
  | 'writing'
  | 'study'
  | 'checklist'
  | 'timer'
  | 'counter'
  | 'dashboard'
  | 'form';

export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'date' | 'select';
  options?: string[];
}

/** Serializable description of an AI/template-generated application. */
export interface GeneratedApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  templateType: TemplateType;
  createdAt: string;
  /** Template-specific configuration (e.g. field definitions). */
  config: {
    fields?: TemplateField[];
    [key: string]: unknown;
  };
  /** The user's stored data for this app (rows, cards, entries, etc). */
  data: Record<string, unknown>;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export type VFileType = 'text' | 'note' | 'app' | 'image' | 'folder';

export interface VFile {
  id: string;
  name: string;
  type: VFileType;
  content?: string;
  folder: string;
  createdAt: string;
}

export type ThemeMode = 'dark' | 'light';

export interface Settings {
  theme: ThemeMode;
  wallpaper: string;
  /** Accent color as a hex string, e.g. "#6366f1". */
  accent: string;
  reduceMotion: boolean;
}

export type ToastType = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

/** Props passed to every generated-app template renderer. */
export interface TemplateProps<TData = Record<string, unknown>> {
  app: GeneratedApp;
  /** Persist new data for this app. */
  onChange: (data: TData) => void;
}

/** Result of resolving a search query in the launcher. */
export type SearchResolution =
  | { kind: 'builtin'; app: BuiltinAppMeta }
  | { kind: 'generated'; app: GeneratedApp }
  | { kind: 'create'; preview: GenerationPreview };

/** Preview of what would be created for a given search term. */
export interface GenerationPreview {
  name: string;
  icon: string;
  templateType: TemplateType;
  description: string;
  config: GeneratedApp['config'];
}
