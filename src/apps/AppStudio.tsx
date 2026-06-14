import { useMemo, useState } from 'react';
import {
  AppWindow,
  ExternalLink,
  LayoutGrid,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useOS } from '../os/store';
import { TEMPLATE_LABELS, TEMPLATE_TYPES } from '../os/appGenerator';
import type { GeneratedApp, TemplateType } from '../os/types';
import { cn, formatDate } from '../os/utils';

/** Data keys that hold an array of user records, in priority order. */
const RECORD_KEYS = [
  'rows',
  'items',
  'entries',
  'cards',
  'submissions',
  'counters',
] as const;

/** Best-effort count of how many records a generated app currently stores. */
function recordCount(app: GeneratedApp): number {
  for (const key of RECORD_KEYS) {
    const value = app.data[key];
    if (Array.isArray(value)) return value.length;
  }
  return 0;
}

/**
 * App Studio — manage the apps PromptOS has generated for the user.
 *
 * Left: create-app input + a scrollable list of generated apps.
 * Right: an editor for the selected app (name, description, icon, template
 * type) plus Open / Delete actions.
 */
export default function AppStudio() {
  const generatedApps = useOS((s) => s.generatedApps);
  const openGeneratedApp = useOS((s) => s.openGeneratedApp);
  const updateGeneratedApp = useOS((s) => s.updateGeneratedApp);
  const deleteGeneratedApp = useOS((s) => s.deleteGeneratedApp);
  const createApp = useOS((s) => s.createApp);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [term, setTerm] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Newest apps first.
  const sortedApps = useMemo(
    () =>
      [...generatedApps].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [generatedApps],
  );

  const selected = useMemo(
    () => generatedApps.find((g) => g.id === selectedId) ?? null,
    [generatedApps, selectedId],
  );

  const handleCreate = () => {
    const trimmed = term.trim();
    if (!trimmed) return;
    // Don't auto-open the window; keep the user in the Studio to tweak it.
    const app = createApp(trimmed, false);
    setTerm('');
    setSelectedId(app.id);
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteGeneratedApp(selected.id);
    if (selectedId === selected.id) setSelectedId(null);
    setConfirmOpen(false);
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-slate-950/40 text-slate-100">
      {/* ---- Header ---- */}
      <header className="flex items-center gap-2.5 px-5 py-3 border-b border-white/10 bg-black/20">
        <div className="grid place-items-center h-8 w-8 rounded-lg bg-accent/20 border border-accent/40">
          <LayoutGrid size={16} className="text-accent" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-wide">App Studio</h1>
          <p className="text-[11px] text-slate-400 truncate">
            Build and manage your generated apps
          </p>
        </div>
        <span className="ml-auto text-[11px] text-slate-400 tabular-nums">
          {generatedApps.length} {generatedApps.length === 1 ? 'app' : 'apps'}
        </span>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ---- Left: create + list ---- */}
        <aside className="w-72 shrink-0 flex flex-col border-r border-white/10 bg-black/10">
          <div className="p-3 border-b border-white/10">
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">
              Create app
            </label>
            <div className="flex gap-2">
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
                placeholder="e.g. budget tracker"
                className="selectable flex-1 min-w-0 rounded-lg bg-white/5 border border-white/10 py-1.5 px-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60"
              />
              <Button
                size="sm"
                variant="primary"
                onClick={handleCreate}
                disabled={!term.trim()}
                aria-label="Create app"
              >
                <Plus size={14} />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto scroll-thin p-2 space-y-1">
            {sortedApps.length === 0 ? (
              <div className="px-3 py-10 text-center text-xs text-slate-400">
                No apps yet.
              </div>
            ) : (
              sortedApps.map((app) => {
                const count = recordCount(app);
                const active = app.id === selectedId;
                return (
                  <button
                    key={app.id}
                    onClick={() => setSelectedId(app.id)}
                    className={cn(
                      'w-full text-left rounded-lg px-2.5 py-2 transition-colors border flex items-center gap-2.5',
                      active
                        ? 'bg-accent/20 border-accent/40'
                        : 'bg-transparent border-transparent hover:bg-white/5',
                    )}
                  >
                    <span className="grid place-items-center h-9 w-9 shrink-0 rounded-lg bg-white/5 border border-white/10 text-lg leading-none">
                      <span aria-hidden>{app.icon}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {app.name}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span className="truncate">
                          {TEMPLATE_LABELS[app.templateType]}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="shrink-0">{formatDate(app.createdAt)}</span>
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-white/5 border border-white/10 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-300">
                      {count}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ---- Right: detail / editor ---- */}
        <section className="flex-1 min-w-0 flex flex-col">
          {selected ? (
            <AppEditor
              key={selected.id}
              app={selected}
              recordTotal={recordCount(selected)}
              onPatch={(patch) => updateGeneratedApp(selected.id, patch)}
              onOpen={() => openGeneratedApp(selected.id)}
              onDelete={() => setConfirmOpen(true)}
            />
          ) : generatedApps.length === 0 ? (
            <EmptyState
              term={term}
              onTerm={setTerm}
              onCreate={handleCreate}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
              <div className="grid place-items-center h-16 w-16 rounded-2xl bg-white/5 border border-white/10">
                <AppWindow size={28} className="text-accent" />
              </div>
              <div>
                <p className="text-base font-medium text-slate-200">
                  No app selected
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Pick an app from the list to edit it.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete app"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p>
          Delete{' '}
          <span className="font-semibold text-slate-100">
            “{selected?.name}”
          </span>{' '}
          and all of its data? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

/** Inviting empty state shown when the user has no generated apps at all. */
function EmptyState({
  term,
  onTerm,
  onCreate,
}: {
  term: string;
  onTerm: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center px-8">
      <div className="grid place-items-center h-20 w-20 rounded-3xl bg-accent/15 border border-accent/40 shadow-lg shadow-accent/20">
        <Sparkles size={34} className="text-accent" />
      </div>
      <div className="max-w-sm">
        <p className="text-lg font-semibold text-slate-100">
          Build your first app
        </p>
        <p className="mt-1.5 text-sm text-slate-400">
          Describe what you want — a budget tracker, a flashcard deck, a journal —
          and PromptOS will assemble it for you instantly.
        </p>
      </div>
      <div className="flex w-full max-w-sm gap-2">
        <input
          value={term}
          onChange={(e) => onTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCreate();
          }}
          placeholder="e.g. reading list, habit tracker, recipes…"
          className="selectable flex-1 min-w-0 rounded-lg bg-white/5 border border-white/10 py-2 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60"
        />
        <Button variant="primary" onClick={onCreate} disabled={!term.trim()}>
          <Plus size={16} />
          Create
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {['Budget tracker', 'Flashcards', 'Journal', 'Recipes', 'Timer'].map(
          (suggestion) => (
            <button
              key={suggestion}
              onClick={() => onTerm(suggestion)}
              className="rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10 transition-colors"
            >
              {suggestion}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

/** Editor pane for a single generated app. */
function AppEditor({
  app,
  recordTotal,
  onPatch,
  onOpen,
  onDelete,
}: {
  app: GeneratedApp;
  recordTotal: number;
  onPatch: (patch: Partial<GeneratedApp>) => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10">
        <span className="grid place-items-center h-11 w-11 shrink-0 rounded-xl bg-white/5 border border-white/10 text-2xl leading-none">
          <span aria-hidden>{app.icon}</span>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-slate-100">
            {app.name}
          </h2>
          <p className="text-[11px] text-slate-400">
            {TEMPLATE_LABELS[app.templateType]} · {recordTotal}{' '}
            {recordTotal === 1 ? 'record' : 'records'} · created{' '}
            {formatDate(app.createdAt)}
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={onOpen}>
          <ExternalLink size={14} />
          Open
        </Button>
        <Button size="sm" variant="danger" onClick={onDelete} aria-label="Delete app">
          <Trash2 size={14} />
        </Button>
      </div>

      {/* Fields */}
      <div className="flex-1 min-h-0 overflow-auto scroll-thin px-5 py-4 space-y-5">
        <Field label="Name">
          <input
            value={app.name}
            onChange={(e) => onPatch({ name: e.target.value })}
            placeholder="App name"
            className="selectable w-full rounded-lg bg-white/5 border border-white/10 py-2 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60"
          />
        </Field>

        <div className="grid grid-cols-[5rem_1fr] gap-3">
          <Field label="Icon">
            <input
              value={app.icon}
              onChange={(e) => onPatch({ icon: e.target.value })}
              maxLength={4}
              placeholder="🧩"
              className="selectable w-full rounded-lg bg-white/5 border border-white/10 py-2 px-3 text-center text-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
          </Field>
          <Field
            label="Template type"
            hint="Changing this re-renders the app and may not match its existing data."
          >
            <div className="relative">
              <select
                value={app.templateType}
                onChange={(e) =>
                  onPatch({ templateType: e.target.value as TemplateType })
                }
                className="selectable w-full appearance-none rounded-lg bg-white/5 border border-white/10 py-2 pl-3 pr-8 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent/60"
              >
                {TEMPLATE_TYPES.map((type) => (
                  <option key={type} value={type} className="bg-slate-800 text-slate-100">
                    {TEMPLATE_LABELS[type]}
                  </option>
                ))}
              </select>
              <span
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                aria-hidden
              >
                ▾
              </span>
            </div>
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={app.description}
            onChange={(e) => onPatch({ description: e.target.value })}
            placeholder="What is this app for?"
            rows={4}
            className="selectable w-full resize-none rounded-lg bg-white/5 border border-white/10 py-2 px-3 text-sm leading-relaxed text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60"
          />
        </Field>
      </div>
    </div>
  );
}

/** Labeled form field with an optional hint line. */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
