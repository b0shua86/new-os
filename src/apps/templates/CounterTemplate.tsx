import { useState } from 'react';
import { Plus, Minus, Trash2, Pencil, Check, Dices, Hash } from 'lucide-react';
import type { TemplateProps } from '../../os/types';
import { uid, cn } from '../../os/utils';
import { Button } from '../../components/Button';

interface Counter {
  id: string;
  label: string;
  value: number;
}

interface CounterData {
  counters: Counter[];
  lastRoll: number | null;
}

const DICE = [4, 6, 8, 10, 12, 20];

export default function CounterTemplate({ app, onChange }: TemplateProps) {
  const counters = (app.data.counters as Counter[] | undefined) ?? [];
  const lastRoll = (app.data.lastRoll as number | null | undefined) ?? null;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [die, setDie] = useState(6);
  const [diceCount, setDiceCount] = useState(1);
  const [results, setResults] = useState<number[]>([]);

  const persist = (next: Partial<CounterData>) =>
    onChange({ counters, lastRoll, ...next } satisfies CounterData);

  const addCounter = () =>
    persist({ counters: [...counters, { id: uid('cnt'), label: 'Counter', value: 0 }] });

  const bump = (id: string, delta: number) =>
    persist({
      counters: counters.map((c) => (c.id === id ? { ...c, value: c.value + delta } : c)),
    });

  const removeCounter = (id: string) =>
    persist({ counters: counters.filter((c) => c.id !== id) });

  const startRename = (c: Counter) => {
    setEditingId(c.id);
    setEditLabel(c.label);
  };

  const saveRename = () => {
    if (!editingId) return;
    const label = editLabel.trim() || 'Counter';
    persist({ counters: counters.map((c) => (c.id === editingId ? { ...c, label } : c)) });
    setEditingId(null);
  };

  const roll = () => {
    const n = Math.max(1, Math.min(20, diceCount));
    const rolled = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * die));
    const sum = rolled.reduce((a, b) => a + b, 0);
    setResults(rolled);
    persist({ lastRoll: sum });
  };

  const rollSum = results.reduce((a, b) => a + b, 0);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-slate-100 bg-slate-950/40">
      <div className="flex-1 min-h-0 overflow-auto scroll-thin p-4 space-y-6">
        {/* Counters */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Hash size={16} className="text-accent" /> Tally counters
            </h3>
            <Button variant="primary" size="sm" onClick={addCounter}>
              <Plus size={16} /> Add counter
            </Button>
          </div>

          {counters.length === 0 ? (
            <div className="glass rounded-xl p-6 text-center text-sm text-slate-400">
              No counters yet. Add one to start tallying.
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
              {counters.map((c) => (
                <div key={c.id} className="glass rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    {editingId === c.id ? (
                      <input
                        className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent/60"
                        value={editLabel}
                        autoFocus
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                    ) : (
                      <span className="flex-1 min-w-0 truncate text-sm font-medium text-slate-200">
                        {c.label}
                      </span>
                    )}
                    {editingId === c.id ? (
                      <Button variant="primary" size="sm" onClick={saveRename} aria-label="Save name">
                        <Check size={14} />
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startRename(c)}
                          aria-label="Rename"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => removeCounter(c.id)}
                          aria-label="Remove counter"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="lg"
                      className="!px-3"
                      onClick={() => bump(c.id, -1)}
                      aria-label="Decrease"
                    >
                      <Minus size={18} />
                    </Button>
                    <span className="font-mono tabular-nums text-3xl font-bold text-slate-100">
                      {c.value}
                    </span>
                    <Button
                      variant="primary"
                      size="lg"
                      className="!px-3"
                      onClick={() => bump(c.id, 1)}
                      aria-label="Increase"
                    >
                      <Plus size={18} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Dice roller */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
            <Dices size={16} className="text-accent" /> Dice roller
          </h3>
          <div className="glass rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Die type</label>
                <div className="flex flex-wrap gap-1.5">
                  {DICE.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDie(d)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors',
                        die === d ? 'bg-accent text-white' : 'bg-white/5 hover:bg-white/10 text-slate-300',
                      )}
                    >
                      d{d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Number of dice</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={diceCount}
                  onChange={(e) =>
                    setDiceCount(Math.max(1, Math.min(20, Number(e.target.value || 1))))
                  }
                  className="w-20 bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent/60"
                />
              </div>
              <Button variant="primary" size="md" onClick={roll}>
                <Dices size={16} /> Roll {diceCount}d{die}
              </Button>
            </div>

            {results.length > 0 ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {results.map((r, i) => (
                    <span
                      key={i}
                      className="grid place-items-center w-11 h-11 rounded-lg glass-strong border-accent/40 font-mono text-lg font-bold text-slate-100"
                    >
                      {r}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-slate-300">
                  Sum: <span className="font-mono font-bold text-accent">{rollSum}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                {lastRoll !== null
                  ? `Last saved roll total: ${lastRoll}`
                  : 'Roll the dice to see results.'}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
