import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Shuffle, Layers, X, Check } from 'lucide-react';
import type { TemplateProps } from '../../os/types';
import { uid, cn } from '../../os/utils';
import { Button } from '../../components/Button';

interface Card {
  id: string;
  question: string;
  answer: string;
}

interface StudyData {
  cards: Card[];
}

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 ' +
  'placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60';

export default function StudyTemplate({ app, onChange }: TemplateProps) {
  const cards = (app.data.cards as Card[] | undefined) ?? [];

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [order, setOrder] = useState<string[]>(() => cards.map((c) => c.id));
  const [adding, setAdding] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const persist = (next: Card[]) => onChange({ cards: next } satisfies StudyData);

  // Keep the shuffle order in sync with the deck (preserve existing order, append new).
  useEffect(() => {
    const ids = cards.map((c) => c.id);
    setOrder((prev) => {
      const kept = prev.filter((id) => ids.includes(id));
      const added = ids.filter((id) => !kept.includes(id));
      const next = [...kept, ...added];
      const same = next.length === prev.length && next.every((id, i) => id === prev[i]);
      return same ? prev : next;
    });
  }, [cards]);

  const ordered = useMemo(
    () =>
      order
        .map((id) => cards.find((c) => c.id === id))
        .filter((c): c is Card => Boolean(c)),
    [order, cards],
  );

  const safeIndex = ordered.length === 0 ? 0 : Math.min(index, ordered.length - 1);
  const current = ordered[safeIndex] ?? null;

  useEffect(() => {
    if (index !== safeIndex) setIndex(safeIndex);
  }, [index, safeIndex]);

  const go = (delta: number) => {
    if (ordered.length === 0) return;
    setFlipped(false);
    setIndex((i) => (i + delta + ordered.length) % ordered.length);
  };

  const shuffle = () => {
    const shuffled = [...order];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setOrder(shuffled);
    setIndex(0);
    setFlipped(false);
  };

  const addCard = () => {
    if (question.trim() === '' && answer.trim() === '') return;
    persist([...cards, { id: uid('card'), question: question.trim(), answer: answer.trim() }]);
    setQuestion('');
    setAnswer('');
    setAdding(false);
  };

  const deleteCurrent = () => {
    if (!current) return;
    persist(cards.filter((c) => c.id !== current.id));
    setFlipped(false);
    setIndex((i) => Math.max(0, Math.min(i, ordered.length - 2)));
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-slate-100 bg-slate-950/40">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 glass-strong border-b border-white/10">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Layers size={16} className="text-accent" />
          <span className="font-medium">
            {ordered.length > 0 ? `${safeIndex + 1} / ${ordered.length}` : '0 / 0'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={shuffle}
            disabled={ordered.length < 2}
            aria-label="Shuffle"
          >
            <Shuffle size={15} /> Shuffle
          </Button>
          <Button
            variant={adding ? 'ghost' : 'primary'}
            size="sm"
            onClick={() => setAdding((a) => !a)}
          >
            {adding ? <X size={16} /> : <Plus size={16} />}
            {adding ? 'Cancel' : 'Add card'}
          </Button>
        </div>
      </div>

      {/* Add card form */}
      {adding && (
        <div className="shrink-0 p-4 grid gap-2 border-b border-white/10 glass-strong">
          <input
            className={inputCls}
            placeholder="Question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            autoFocus
          />
          <textarea
            className={cn(inputCls, 'resize-none h-16')}
            placeholder="Answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={addCard}>
              <Check size={16} /> Save card
            </Button>
          </div>
        </div>
      )}

      {/* Card area */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-6 p-6 overflow-auto scroll-thin">
        {!current ? (
          <div className="text-center text-slate-400">
            <Layers size={44} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium text-slate-300">Your deck is empty</p>
            <p className="text-sm mt-1">Add a card to start studying.</p>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              className="group w-full max-w-lg aspect-[3/2] [perspective:1200px] focus:outline-none"
              aria-label="Flip card"
            >
              <div
                className={cn(
                  'relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]',
                  flipped && '[transform:rotateY(180deg)]',
                )}
              >
                {/* Front (question) */}
                <div className="absolute inset-0 [backface-visibility:hidden] glass rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-2xl group-hover:border-accent/50 transition-colors">
                  <span className="text-[11px] uppercase tracking-widest text-accent mb-3">
                    Question
                  </span>
                  <p className="text-xl font-medium text-slate-100 whitespace-pre-wrap break-words">
                    {current.question || '—'}
                  </p>
                  <span className="mt-4 text-xs text-slate-500">Click to flip</span>
                </div>
                {/* Back (answer) */}
                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] glass-strong rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-2xl border-accent/40">
                  <span className="text-[11px] uppercase tracking-widest text-accent mb-3">
                    Answer
                  </span>
                  <p className="text-xl font-medium text-slate-100 whitespace-pre-wrap break-words">
                    {current.answer || '—'}
                  </p>
                  <span className="mt-4 text-xs text-slate-500">Click to flip</span>
                </div>
              </div>
            </button>

            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => go(-1)} aria-label="Previous">
                <ChevronLeft size={18} /> Prev
              </Button>
              <Button variant="danger" size="sm" onClick={deleteCurrent} aria-label="Delete card">
                <Trash2 size={15} /> Delete
              </Button>
              <Button variant="ghost" onClick={() => go(1)} aria-label="Next">
                Next <ChevronRight size={18} />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
