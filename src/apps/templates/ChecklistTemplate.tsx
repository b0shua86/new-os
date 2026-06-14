import { useState } from 'react';
import { Plus, Trash2, ListChecks, Eraser } from 'lucide-react';
import type { TemplateProps } from '../../os/types';
import { uid, cn } from '../../os/utils';
import { Button } from '../../components/Button';

interface Item {
  id: string;
  text: string;
  done: boolean;
}

interface ChecklistData {
  items: Item[];
}

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 ' +
  'placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60';

export default function ChecklistTemplate({ app, onChange }: TemplateProps) {
  const items = (app.data.items as Item[] | undefined) ?? [];
  const [text, setText] = useState('');

  const persist = (next: Item[]) => onChange({ items: next } satisfies ChecklistData);

  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  const addItem = () => {
    const trimmed = text.trim();
    if (trimmed === '') return;
    persist([...items, { id: uid('item'), text: trimmed, done: false }]);
    setText('');
  };

  const toggle = (id: string) =>
    persist(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));

  const remove = (id: string) => persist(items.filter((i) => i.id !== id));

  const clearCompleted = () => persist(items.filter((i) => !i.done));

  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-slate-100 bg-slate-950/40">
      {/* Add form + progress */}
      <div className="shrink-0 p-4 glass-strong border-b border-white/10">
        <div className="flex gap-2">
          <input
            className={inputCls}
            placeholder="Add an item and press Enter…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addItem();
              }
            }}
          />
          <Button variant="primary" size="md" onClick={addItem} aria-label="Add item">
            <Plus size={18} />
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 tabular-nums shrink-0">
            {doneCount} of {total} done
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-auto scroll-thin p-2">
        {total === 0 ? (
          <div className="h-full grid place-items-center text-center px-6">
            <div className="text-slate-400">
              <ListChecks size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium text-slate-300">Nothing on your list</p>
              <p className="text-sm mt-1">Add your first item above to get started.</p>
            </div>
          </div>
        ) : (
          <ul className="space-y-1">
            {items.map((i) => (
              <li
                key={i.id}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={i.done}
                    onChange={() => toggle(i.id)}
                    className="w-4 h-4 shrink-0 rounded accent-accent cursor-pointer"
                  />
                  <span
                    className={cn(
                      'text-sm truncate',
                      i.done ? 'line-through text-slate-500' : 'text-slate-200',
                    )}
                  >
                    {i.text}
                  </span>
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => remove(i.id)}
                  aria-label="Delete item"
                >
                  <Trash2 size={15} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-t border-white/10 glass-strong">
        <span className="text-xs text-slate-500">
          {total} {total === 1 ? 'item' : 'items'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearCompleted}
          disabled={doneCount === 0}
        >
          <Eraser size={15} /> Clear completed
        </Button>
      </div>
    </div>
  );
}
