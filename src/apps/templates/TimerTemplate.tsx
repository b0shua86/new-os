import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Timer as TimerIcon, Hourglass } from 'lucide-react';
import type { TemplateProps } from '../../os/types';
import { cn } from '../../os/utils';
import { Button } from '../../components/Button';

interface TimerData {
  lastSeconds: number;
}

type Mode = 'countdown' | 'stopwatch';

const PRESETS: { label: string; seconds: number }[] = [
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
  { label: '25m', seconds: 1500 },
];

function fmt(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function playBeep() {
  type AudioCtor = typeof AudioContext;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  const Ctx = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
    osc.onended = () => ctx.close().catch(() => undefined);
  } catch {
    /* audio not available — ignore */
  }
}

export default function TimerTemplate({ app, onChange }: TemplateProps) {
  const storedSeconds = (app.data.lastSeconds as number | undefined) ?? 300;

  const [mode, setMode] = useState<Mode>('countdown');
  const [duration, setDuration] = useState(storedSeconds); // countdown target
  const [remaining, setRemaining] = useState(storedSeconds); // displayed countdown value
  const [elapsed, setElapsed] = useState(0); // stopwatch value
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  // Refs for timestamp-accurate timing.
  const rafRef = useRef<number | null>(null);
  const anchorRef = useRef(0); // Date.now() at the moment timing (re)started
  const baseRef = useRef(0); // accumulated value (remaining or elapsed) at anchor

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Main timing loop driven by Date.now() so it stays accurate regardless of tick rate.
  useEffect(() => {
    if (!running) return;
    anchorRef.current = Date.now();
    baseRef.current = mode === 'countdown' ? remaining : elapsed;

    const tick = () => {
      const delta = (Date.now() - anchorRef.current) / 1000;
      if (mode === 'countdown') {
        const next = baseRef.current - delta;
        if (next <= 0) {
          setRemaining(0);
          setRunning(false);
          setFinished(true);
          playBeep();
          return;
        }
        setRemaining(next);
      } else {
        setElapsed(baseRef.current + delta);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return stopLoop;
    // We intentionally restart the loop only on running/mode changes; remaining/elapsed
    // are snapshotted into baseRef when the loop (re)starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode]);

  // Clean up on unmount.
  useEffect(() => stopLoop, [stopLoop]);

  const persistDuration = (seconds: number) => onChange({ lastSeconds: seconds } satisfies TimerData);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    stopLoop();
    setRunning(false);
    setFinished(false);
    setMode(next);
  };

  const start = () => {
    if (mode === 'countdown' && remaining <= 0) return;
    setFinished(false);
    setRunning(true);
  };

  const pause = () => {
    setRunning(false);
    stopLoop();
  };

  const reset = () => {
    setRunning(false);
    stopLoop();
    setFinished(false);
    if (mode === 'countdown') setRemaining(duration);
    else setElapsed(0);
  };

  const applyDuration = (seconds: number) => {
    const clamped = Math.max(0, Math.floor(seconds));
    setRunning(false);
    stopLoop();
    setFinished(false);
    setDuration(clamped);
    setRemaining(clamped);
    persistDuration(clamped);
  };

  const editMinutes = Math.floor(duration / 60);
  const editSeconds = duration % 60;

  const display = mode === 'countdown' ? remaining : elapsed;
  const isCountdown = mode === 'countdown';

  return (
    <div
      className={cn(
        'h-full w-full flex flex-col overflow-hidden text-slate-100 transition-colors duration-200',
        finished ? 'bg-rose-600/30 animate-pulse' : 'bg-slate-950/40',
      )}
    >
      {/* Mode toggle */}
      <div className="shrink-0 flex items-center justify-center gap-1 p-3 glass-strong border-b border-white/10">
        <button
          type="button"
          onClick={() => switchMode('countdown')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            isCountdown ? 'bg-accent text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
          )}
        >
          <Hourglass size={15} /> Countdown
        </button>
        <button
          type="button"
          onClick={() => switchMode('stopwatch')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            !isCountdown ? 'bg-accent text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
          )}
        >
          <TimerIcon size={15} /> Stopwatch
        </button>
      </div>

      {/* Display */}
      <div className="flex-1 min-h-0 overflow-auto scroll-thin flex flex-col items-center justify-center gap-6 p-6">
        <div className="font-mono tabular-nums text-7xl sm:text-8xl font-bold tracking-tight text-slate-100 select-none">
          {fmt(display)}
        </div>

        {finished && (
          <div className="text-rose-200 font-semibold tracking-wide animate-pulse">
            Time's up!
          </div>
        )}

        {/* Countdown setup */}
        {isCountdown && !running && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={editMinutes}
                  onChange={(e) => applyDuration(Number(e.target.value || 0) * 60 + editSeconds)}
                  className="w-20 text-center bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-lg font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent/60"
                  aria-label="Minutes"
                />
                <span className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">min</span>
              </div>
              <span className="text-2xl text-slate-500 pb-5">:</span>
              <div className="flex flex-col items-center">
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={editSeconds}
                  onChange={(e) =>
                    applyDuration(editMinutes * 60 + Math.min(59, Math.max(0, Number(e.target.value || 0))))
                  }
                  className="w-20 text-center bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-lg font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent/60"
                  aria-label="Seconds"
                />
                <span className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">sec</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p.label}
                  variant={duration === p.seconds ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => applyDuration(p.seconds)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 flex items-center justify-center gap-3 p-4 border-t border-white/10 glass-strong">
        {running ? (
          <Button variant="primary" size="lg" onClick={pause}>
            <Pause size={20} /> Pause
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            onClick={start}
            disabled={isCountdown && remaining <= 0}
          >
            <Play size={20} /> Start
          </Button>
        )}
        <Button variant="ghost" size="lg" onClick={reset}>
          <RotateCcw size={20} /> Reset
        </Button>
      </div>
    </div>
  );
}
