import { useEffect, useRef, useState } from 'react';
import { Clock, StickyNote, Activity, Quote } from 'lucide-react';
import type { TemplateProps } from '../../os/types';
import { Button } from '../../components/Button';

interface DashboardData {
  note: string;
}

const QUOTES = [
  'Small steps every day add up to big results.',
  'Done is better than perfect.',
  'Focus on progress, not perfection.',
  'The best time to start was yesterday. The next best is now.',
  'Discipline is choosing what you want most over what you want now.',
  'You don’t have to be great to start, but you have to start to be great.',
  'Energy flows where attention goes.',
  'One thing at a time, and that done well.',
];

function fmtUptime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function DashboardTemplate({ app, onChange }: TemplateProps) {
  const note = (app.data.note as string | undefined) ?? '';

  const [now, setNow] = useState(() => new Date());
  const [quoteIdx, setQuoteIdx] = useState(0);
  const startRef = useRef(Date.now());

  // Live clock + uptime, once per second.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Rotating quote.
  useEffect(() => {
    const id = window.setInterval(() => {
      setQuoteIdx((i) => (i + 1) % QUOTES.length);
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  const uptime = now.getTime() - startRef.current;

  const timeStr = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-slate-100 bg-slate-950/40">
      <div className="flex-1 min-h-0 overflow-auto scroll-thin p-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 auto-rows-min">
          {/* Clock */}
          <div className="glass rounded-2xl p-5 md:col-span-2 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent mb-2">
              <Clock size={14} /> Now
            </div>
            <div className="font-mono tabular-nums text-5xl sm:text-6xl font-bold text-slate-100">
              {timeStr}
            </div>
            <div className="mt-2 text-sm text-slate-400">{dateStr}</div>
          </div>

          {/* Uptime */}
          <div className="glass rounded-2xl p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
              <Activity size={14} /> Open since
            </div>
            <div className="font-mono tabular-nums text-3xl font-bold text-slate-100">
              {fmtUptime(uptime)}
            </div>
            <div className="text-xs text-slate-500">Session uptime in this window.</div>
          </div>

          {/* Quote */}
          <div className="glass rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
              <Quote size={14} /> Motivation
            </div>
            <p className="text-slate-200 leading-relaxed flex-1">{QUOTES[quoteIdx]}</p>
            <div className="flex gap-1.5">
              {QUOTES.map((_, i) => (
                <span
                  key={i}
                  className={
                    'h-1.5 rounded-full transition-all ' +
                    (i === quoteIdx ? 'w-5 bg-accent' : 'w-1.5 bg-white/15')
                  }
                />
              ))}
            </div>
          </div>

          {/* Scratch note */}
          <div className="glass rounded-2xl p-5 md:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
                <StickyNote size={14} /> Scratch note
              </div>
              {note.trim() !== '' && (
                <Button variant="ghost" size="sm" onClick={() => onChange({ note: '' })}>
                  Clear
                </Button>
              )}
            </div>
            <textarea
              className="w-full h-40 resize-none rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60 scroll-thin"
              placeholder="Jot something down… it saves automatically."
              value={note}
              onChange={(e) => onChange({ note: e.target.value } satisfies DashboardData)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
