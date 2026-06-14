import { useMemo, useState } from 'react';
import { FileText, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useOS } from '../os/store';
import { cn, formatDate } from '../os/utils';

/**
 * Notes — a two-pane note editor backed by the global store.
 *
 * Left: searchable list of notes (newest-edited first) + "New note".
 * Right: title/body editor with debounce-free auto-save on every change.
 */
export default function NotesApp() {
  const notes = useOS((s) => s.notes);
  const createNote = useOS((s) => s.createNote);
  const updateNote = useOS((s) => s.updateNote);
  const deleteNote = useOS((s) => s.deleteNote);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Notes sorted newest-edited first; filtered by the search box.
  const visibleNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...notes]
      .filter((n) =>
        q
          ? n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, query]);

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const handleNew = () => {
    const note = createNote();
    setSelectedId(note.id);
    setQuery('');
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteNote(selected.id);
    setSelectedId(null);
    setConfirmOpen(false);
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-slate-950/40 text-slate-100">
      <div className="flex flex-1 min-h-0">
        {/* ---- Left: list ---- */}
        <aside className="w-64 shrink-0 flex flex-col border-r border-white/10 bg-black/20">
          <div className="p-3 space-y-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h1 className="text-sm font-semibold tracking-wide flex items-center gap-2">
                <FileText size={15} className="text-accent" />
                Notes
              </h1>
              <Button size="sm" variant="primary" onClick={handleNew}>
                <Plus size={14} />
                New
              </Button>
            </div>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notes…"
                className="selectable w-full rounded-lg bg-white/5 border border-white/10 py-1.5 pl-8 pr-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto scroll-thin p-2 space-y-1">
            {visibleNotes.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-slate-400">
                {notes.length === 0
                  ? 'No notes yet. Create your first one.'
                  : 'No notes match your search.'}
              </div>
            ) : (
              visibleNotes.map((note) => {
                const snippet = note.body.trim().replace(/\s+/g, ' ');
                return (
                  <button
                    key={note.id}
                    onClick={() => setSelectedId(note.id)}
                    className={cn(
                      'w-full text-left rounded-lg px-3 py-2 transition-colors border',
                      note.id === selectedId
                        ? 'bg-accent/20 border-accent/40'
                        : 'bg-transparent border-transparent hover:bg-white/5',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {note.title.trim() || 'Untitled note'}
                      </span>
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {formatDate(note.updatedAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {snippet || 'No additional text'}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ---- Right: editor ---- */}
        <section className="flex-1 min-w-0 flex flex-col">
          {selected ? (
            <>
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/10">
                <input
                  value={selected.title}
                  onChange={(e) => updateNote(selected.id, { title: e.target.value })}
                  placeholder="Untitled note"
                  className="selectable flex-1 min-w-0 bg-transparent text-lg font-semibold text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
                <span className="shrink-0 text-xs text-slate-400">
                  Edited {formatDate(selected.updatedAt)}
                </span>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setConfirmOpen(true)}
                  aria-label="Delete note"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
              <textarea
                value={selected.body}
                onChange={(e) => updateNote(selected.id, { body: e.target.value })}
                placeholder="Start writing…"
                className="selectable flex-1 min-h-0 resize-none overflow-auto scroll-thin bg-transparent px-5 py-4 text-sm leading-relaxed text-slate-200 placeholder:text-slate-500 focus:outline-none"
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
              <div className="grid place-items-center h-16 w-16 rounded-2xl bg-white/5 border border-white/10">
                <FileText size={28} className="text-accent" />
              </div>
              <div>
                <p className="text-base font-medium text-slate-200">No note selected</p>
                <p className="mt-1 text-sm text-slate-400">
                  Pick a note from the list, or create a new one.
                </p>
              </div>
              <Button variant="primary" onClick={handleNew}>
                <Plus size={16} />
                New note
              </Button>
            </div>
          )}
        </section>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete note"
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
            “{selected?.title.trim() || 'Untitled note'}”
          </span>
          ? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
