import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, NotebookPen } from 'lucide-react';
import type { TemplateProps } from '../../os/types';
import { uid, cn, formatDate, todayISO } from '../../os/utils';
import { Button } from '../../components/Button';

interface Entry {
  id: string;
  title: string;
  body: string;
  date: string;
}

interface WritingData {
  entries: Entry[];
}

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-slate-100 ' +
  'placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60';

export default function WritingTemplate({ app, onChange }: TemplateProps) {
  const entries = (app.data.entries as Entry[] | undefined) ?? [];

  const sorted = useMemo(
    () => [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [entries],
  );

  const [selectedId, setSelectedId] = useState<string | null>(() => sorted[0]?.id ?? null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Keep a valid selection as entries change.
  useEffect(() => {
    if (selectedId && entries.some((e) => e.id === selectedId)) return;
    setSelectedId(sorted[0]?.id ?? null);
  }, [entries, selectedId, sorted]);

  const selected = entries.find((e) => e.id === selectedId) ?? null;

  const persist = (next: Entry[]) => onChange({ entries: next } satisfies WritingData);

  const newEntry = () => {
    const entry: Entry = { id: uid('entry'), title: '', body: '', date: todayISO() };
    persist([entry, ...entries]);
    setSelectedId(entry.id);
  };

  const updateSelected = (patch: Partial<Entry>) => {
    if (!selected) return;
    persist(entries.map((e) => (e.id === selected.id ? { ...e, ...patch } : e)));
  };

  const deleteEntry = (id: string) => {
    persist(entries.filter((e) => e.id !== id));
    setConfirmDelete(null);
  };

  return (
    <div className="h-full w-full flex overflow-hidden text-slate-100 bg-slate-950/40">
      {/* Entry list */}
      <div className="w-60 shrink-0 flex flex-col border-r border-white/10 glass-strong">
        <div className="shrink-0 p-3 border-b border-white/10">
          <Button variant="primary" size="sm" className="w-full" onClick={newEntry}>
            <Plus size={16} /> New entry
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto scroll-thin">
          {sorted.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">No entries yet.</div>
          ) : (
            sorted.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setSelectedId(e.id)}
                className={cn(
                  'w-full text-left px-3.5 py-3 border-b border-white/5 transition-colors',
                  e.id === selectedId ? 'bg-accent/15 border-l-2 border-l-accent' : 'hover:bg-white/5',
                )}
              >
                <div className="font-medium text-sm text-slate-100 truncate">
                  {e.title || 'Untitled'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {formatDate(e.date) || e.date}
                </div>
                {e.body && (
                  <div className="text-xs text-slate-400 mt-1 line-clamp-2">{e.body}</div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-w-0 flex flex-col">
        {!selected ? (
          <div className="flex-1 grid place-items-center text-center px-6">
            <div className="text-slate-400">
              <NotebookPen size={44} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium text-slate-300">Start writing</p>
              <p className="text-sm mt-1 mb-4">Create your first entry to begin your journal.</p>
              <Button variant="primary" size="sm" onClick={newEntry}>
                <Plus size={16} /> New entry
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="shrink-0 p-4 border-b border-white/10 flex items-center gap-3">
              <input
                className={cn(inputCls, 'text-lg font-semibold flex-1')}
                placeholder="Untitled"
                value={selected.title}
                onChange={(e) => updateSelected({ title: e.target.value })}
              />
              <input
                type="date"
                className={cn(inputCls, 'w-auto text-sm')}
                value={selected.date}
                onChange={(e) => updateSelected({ date: e.target.value })}
              />
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmDelete(selected.id)}
                aria-label="Delete entry"
              >
                <Trash2 size={15} />
              </Button>
            </div>
            <textarea
              className="flex-1 min-h-0 w-full resize-none bg-transparent px-5 py-4 text-slate-200 leading-relaxed scroll-thin overflow-auto focus:outline-none placeholder:text-slate-600"
              placeholder="Write your thoughts…"
              value={selected.body}
              onChange={(e) => updateSelected({ body: e.target.value })}
            />
            {confirmDelete === selected.id && (
              <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-rose-500/10 border-t border-rose-500/30">
                <span className="text-sm text-rose-200">Delete this entry permanently?</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>
                    Cancel
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => deleteEntry(selected.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
