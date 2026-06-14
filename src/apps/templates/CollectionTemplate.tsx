import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, LayoutGrid } from 'lucide-react';
import type { TemplateProps, TemplateField } from '../../os/types';
import { uid, cn } from '../../os/utils';
import { Button } from '../../components/Button';

/** A collection item: an id plus one string value per configured field. */
type Item = { id: string } & Record<string, string>;

interface CollectionData {
  items: Item[];
}

const FALLBACK_FIELDS: TemplateField[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 ' +
  'placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60';

function emptyDraft(fields: TemplateField[]): Record<string, string> {
  const d: Record<string, string> = {};
  for (const f of fields) d[f.key] = '';
  return d;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: TemplateField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === 'textarea') {
    return (
      <textarea
        className={cn(inputCls, 'resize-none h-20')}
        placeholder={field.label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field.type === 'select') {
    return (
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="" className="bg-slate-900">
          {field.label}…
        </option>
        {(field.options ?? []).map((opt) => (
          <option key={opt} value={opt} className="bg-slate-900">
            {opt}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      className={inputCls}
      placeholder={field.label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function CollectionTemplate({ app, onChange }: TemplateProps) {
  const fields = (app.config.fields as TemplateField[] | undefined) ?? FALLBACK_FIELDS;
  const items = (app.data.items as Item[] | undefined) ?? [];
  const primaryKey = fields[0]?.key ?? 'title';

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(() => emptyDraft(fields));
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});

  const persist = (next: Item[]) => onChange({ items: next } satisfies CollectionData);

  const openItem = items.find((it) => it.id === openId) ?? null;

  const addItem = () => {
    const hasContent = fields.some((f) => (draft[f.key] ?? '').trim() !== '');
    if (!hasContent) return;
    const item: Item = { id: uid('item') };
    for (const f of fields) item[f.key] = draft[f.key] ?? '';
    persist([...items, item]);
    setDraft(emptyDraft(fields));
    setAdding(false);
  };

  const beginEdit = () => {
    if (!openItem) return;
    const d: Record<string, string> = {};
    for (const f of fields) d[f.key] = openItem[f.key] ?? '';
    setEditDraft(d);
    setEditing(true);
  };

  const saveEdit = () => {
    if (!openItem) return;
    persist(
      items.map((it) => {
        if (it.id !== openItem.id) return it;
        const updated: Item = { id: it.id };
        for (const f of fields) updated[f.key] = editDraft[f.key] ?? '';
        return updated;
      }),
    );
    setEditing(false);
  };

  const deleteItem = (id: string) => {
    persist(items.filter((it) => it.id !== id));
    if (openId === id) {
      setOpenId(null);
      setEditing(false);
    }
  };

  return (
    <div className="relative h-full w-full flex flex-col overflow-hidden text-slate-100 bg-slate-950/40">
      {/* Header / add form */}
      <div className="shrink-0 glass-strong border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-slate-400">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
          <Button
            variant={adding ? 'ghost' : 'primary'}
            size="sm"
            onClick={() => {
              setAdding((a) => !a);
              setDraft(emptyDraft(fields));
            }}
          >
            {adding ? <X size={16} /> : <Plus size={16} />}
            {adding ? 'Cancel' : 'Add entry'}
          </Button>
        </div>
        {adding && (
          <div className="px-4 pb-4 grid gap-2 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                <FieldInput
                  field={f}
                  value={draft[f.key] ?? ''}
                  onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
                />
              </div>
            ))}
            <div className="sm:col-span-2 flex justify-end">
              <Button variant="primary" size="sm" onClick={addItem}>
                <Check size={16} /> Save entry
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0 overflow-auto scroll-thin p-4">
        {items.length === 0 ? (
          <div className="h-full grid place-items-center text-center">
            <div className="text-slate-400">
              <LayoutGrid size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium text-slate-300">Your collection is empty</p>
              <p className="text-sm mt-1">Add an entry to start building your collection.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {items.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => {
                  setOpenId(it.id);
                  setEditing(false);
                }}
                className="text-left glass rounded-xl p-3.5 hover:border-accent/50 hover:bg-white/[0.07] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <div className="font-semibold text-slate-100 truncate">
                  {it[primaryKey] || 'Untitled'}
                </div>
                {fields.slice(1).map((f) =>
                  it[f.key] ? (
                    <div key={f.key} className="mt-1.5 text-xs text-slate-400">
                      <span className="text-slate-500">{f.label}: </span>
                      <span className="line-clamp-2">{it[f.key]}</span>
                    </div>
                  ) : null,
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {openItem && (
        <div
          className="absolute inset-0 z-10 grid place-items-center p-6 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => {
            setOpenId(null);
            setEditing(false);
          }}
        >
          <div
            className="w-full max-w-md max-h-full overflow-auto scroll-thin glass-strong rounded-2xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-slate-100 break-words">
                {openItem[primaryKey] || 'Untitled'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Close"
                onClick={() => {
                  setOpenId(null);
                  setEditing(false);
                }}
              >
                <X size={16} />
              </Button>
            </div>

            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                    {f.label}
                  </div>
                  {editing ? (
                    <FieldInput
                      field={f}
                      value={editDraft[f.key] ?? ''}
                      onChange={(v) => setEditDraft((d) => ({ ...d, [f.key]: v }))}
                    />
                  ) : (
                    <div className="text-sm text-slate-200 whitespace-pre-wrap break-words">
                      {openItem[f.key] || '—'}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <Button variant="danger" size="sm" onClick={() => deleteItem(openItem.id)}>
                <Trash2 size={15} /> Delete
              </Button>
              {editing ? (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={saveEdit}>
                    <Check size={15} /> Save
                  </Button>
                </div>
              ) : (
                <Button variant="primary" size="sm" onClick={beginEdit}>
                  <Pencil size={15} /> Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
