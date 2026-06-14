import { useState } from 'react';
import {
  Check,
  Info,
  Monitor,
  Moon,
  Palette,
  Sparkles,
  Sun,
  Trash2,
  Wind,
} from 'lucide-react';
import { useOS } from '../os/store';
import { ACCENTS, WALLPAPERS } from '../os/wallpapers';
import type { ThemeMode } from '../os/types';
import { cn } from '../os/utils';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';

const PROMPTOS_VERSION = '1.0.0';

/** A frosted card wrapper used for every settings section. */
function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-strong rounded-2xl p-5 border border-white/10">
      <header className="flex items-start gap-3 mb-4">
        <div className="shrink-0 mt-0.5 grid place-items-center w-9 h-9 rounded-xl bg-accent/15 text-accent">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-50">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

/** Reusable on/off pill toggle that reflects the given value. */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
        checked ? 'bg-accent' : 'bg-white/15',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

export default function SettingsApp() {
  const settings = useOS((s) => s.settings);
  const updateSettings = useOS((s) => s.updateSettings);
  const clearAllData = useOS((s) => s.clearAllData);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const setTheme = (theme: ThemeMode) => updateSettings({ theme });

  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-slate-100 bg-slate-950/40">
      {/* Header bar */}
      <div className="shrink-0 px-6 py-4 glass-strong border-b border-white/10 flex items-center gap-3">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-accent/20 text-accent">
          <Sparkles size={20} />
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-50 leading-tight">Settings</h1>
          <p className="text-xs text-slate-400">Personalize your PromptOS desktop</p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-auto scroll-thin">
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">
          {/* --- Appearance --- */}
          <Section
            icon={<Palette size={18} />}
            title="Appearance"
            subtitle="Theme, wallpaper and accent color"
          >
            {/* Theme segmented control */}
            <div className="mb-6">
              <p className="text-xs font-medium text-slate-300 mb-2">Theme</p>
              <div className="inline-flex p-1 rounded-xl bg-black/30 border border-white/10">
                {(
                  [
                    { value: 'dark' as ThemeMode, label: 'Dark', icon: <Moon size={14} /> },
                    { value: 'light' as ThemeMode, label: 'Light', icon: <Sun size={14} /> },
                  ]
                ).map((opt) => {
                  const active = settings.theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTheme(opt.value)}
                      aria-pressed={active}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
                        active
                          ? 'bg-accent text-white shadow-lg shadow-accent/20'
                          : 'text-slate-300 hover:text-white hover:bg-white/5',
                      )}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Wallpaper picker */}
            <div className="mb-6">
              <p className="text-xs font-medium text-slate-300 mb-2">Wallpaper</p>
              <div className="grid grid-cols-3 gap-3">
                {WALLPAPERS.map((w) => {
                  const active = settings.wallpaper === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => updateSettings({ wallpaper: w.id })}
                      aria-pressed={active}
                      aria-label={`Wallpaper ${w.name}`}
                      className={cn(
                        'group relative h-20 rounded-xl overflow-hidden border transition-all',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
                        active
                          ? 'border-transparent ring-2 ring-accent ring-offset-2 ring-offset-slate-950'
                          : 'border-white/10 hover:border-white/25',
                      )}
                      style={{ background: w.css }}
                    >
                      {active && (
                        <span className="absolute top-1.5 right-1.5 grid place-items-center w-5 h-5 rounded-full bg-accent text-white shadow">
                          <Check size={12} />
                        </span>
                      )}
                      <span className="absolute inset-x-0 bottom-0 px-2 py-1 text-[11px] font-medium text-white/90 bg-gradient-to-t from-black/60 to-transparent text-left">
                        {w.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accent color */}
            <div>
              <p className="text-xs font-medium text-slate-300 mb-2">Accent color</p>
              <div className="flex flex-wrap items-center gap-2.5">
                {ACCENTS.map((a) => {
                  const active = settings.accent.toLowerCase() === a.hex.toLowerCase();
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => updateSettings({ accent: a.hex })}
                      aria-pressed={active}
                      aria-label={`Accent ${a.name}`}
                      title={a.name}
                      className={cn(
                        'relative grid place-items-center w-8 h-8 rounded-full transition-transform hover:scale-110',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                        active && 'ring-2 ring-white ring-offset-2 ring-offset-slate-950',
                      )}
                      style={{ background: a.hex }}
                    >
                      {active && <Check size={14} className="text-white drop-shadow" />}
                    </button>
                  );
                })}

                {/* Custom hex via native color input */}
                <label
                  className="relative grid place-items-center w-8 h-8 rounded-full cursor-pointer border border-dashed border-white/30 hover:border-white/60 transition-colors overflow-hidden"
                  title="Custom color"
                >
                  <span
                    className="absolute inset-0"
                    style={{
                      background:
                        'conic-gradient(from 0deg, #f43f5e, #f59e0b, #10b981, #0ea5e9, #6366f1, #8b5cf6, #f43f5e)',
                    }}
                  />
                  <input
                    type="color"
                    value={settings.accent}
                    onChange={(e) => updateSettings({ accent: e.target.value })}
                    aria-label="Custom accent color"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>

                <span className="ml-1 text-xs font-mono text-slate-400 tabular-nums">
                  {settings.accent.toUpperCase()}
                </span>
              </div>
            </div>
          </Section>

          {/* --- Motion --- */}
          <Section
            icon={<Wind size={18} />}
            title="Motion"
            subtitle="Reduce animation across the OS"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-100">Reduce motion</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Minimize transitions and animated effects.
                </p>
              </div>
              <Toggle
                checked={settings.reduceMotion}
                onChange={(v) => updateSettings({ reduceMotion: v })}
                label="Reduce motion"
              />
            </div>
          </Section>

          {/* --- Data --- */}
          <Section
            icon={<Trash2 size={18} />}
            title="Data"
            subtitle="Manage locally stored data"
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm text-slate-100">Clear all generated apps &amp; local data</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Removes every generated app, note, file and preference. This cannot be undone.
                </p>
              </div>
              <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                <Trash2 size={15} />
                Clear data
              </Button>
            </div>
          </Section>

          {/* --- About footer --- */}
          <section className="rounded-2xl p-5 glass border border-white/10">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center w-9 h-9 rounded-xl bg-white/5 text-accent">
                <Info size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-50">
                  About PromptOS{' '}
                  <span className="ml-1 text-xs font-mono font-normal text-slate-400">
                    v{PROMPTOS_VERSION}
                  </span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  A prompt-native browser desktop. Search for any app and PromptOS builds it on
                  the fly. Crafted with React, Tailwind &amp; a dash of imagination.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
              <Monitor size={12} />
              Running locally in your browser — your data never leaves this device.
            </div>
          </section>
        </div>
      </div>

      {/* Confirm clear-data modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Clear all data?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clearAllData();
                setConfirmOpen(false);
              }}
            >
              <Trash2 size={15} />
              Clear everything
            </Button>
          </>
        }
      >
        <p>
          This will permanently delete all generated apps, notes, files and reset your preferences
          to their defaults. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
