/** Built-in desktop wallpapers (pure CSS gradients — no external assets). */
export interface Wallpaper {
  id: string;
  name: string;
  /** CSS background value applied to the desktop. */
  css: string;
}

export const WALLPAPERS: Wallpaper[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    css: 'radial-gradient(at 20% 20%, #4338ca 0px, transparent 50%), radial-gradient(at 80% 0%, #db2777 0px, transparent 50%), radial-gradient(at 80% 90%, #0891b2 0px, transparent 50%), linear-gradient(135deg, #0f172a, #1e1b4b)',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    css: 'radial-gradient(at 70% 20%, #1e3a8a 0px, transparent 55%), linear-gradient(160deg, #020617, #0f172a 60%, #111827)',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    css: 'radial-gradient(at 10% 90%, #7c2d12 0px, transparent 50%), linear-gradient(135deg, #ea580c, #db2777 55%, #6d28d9)',
  },
  {
    id: 'forest',
    name: 'Forest',
    css: 'radial-gradient(at 80% 20%, #047857 0px, transparent 50%), linear-gradient(135deg, #064e3b, #0f172a)',
  },
  {
    id: 'mono',
    name: 'Graphite',
    css: 'radial-gradient(at 50% 0%, #334155 0px, transparent 55%), linear-gradient(160deg, #0b0f17, #1e293b)',
  },
  {
    id: 'bloom',
    name: 'Bloom',
    css: 'radial-gradient(at 0% 0%, #be185d 0px, transparent 50%), radial-gradient(at 100% 100%, #6d28d9 0px, transparent 50%), linear-gradient(135deg, #1e1b4b, #312e81)',
  },
];

export const ACCENTS: { id: string; name: string; hex: string }[] = [
  { id: 'indigo', name: 'Indigo', hex: '#6366f1' },
  { id: 'violet', name: 'Violet', hex: '#8b5cf6' },
  { id: 'rose', name: 'Rose', hex: '#f43f5e' },
  { id: 'emerald', name: 'Emerald', hex: '#10b981' },
  { id: 'amber', name: 'Amber', hex: '#f59e0b' },
  { id: 'sky', name: 'Sky', hex: '#0ea5e9' },
];

export function wallpaperCss(id: string): string {
  return (WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0]).css;
}
