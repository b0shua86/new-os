import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bomb, Flag, Timer, Smile, Frown, Laugh, RotateCcw } from 'lucide-react';
import { Button } from '../components/Button';
import { cn } from '../os/utils';
import { useLocalStorage } from '../os/useLocalStorage';

interface Difficulty {
  id: string;
  label: string;
  cols: number;
  rows: number;
  mines: number;
}

const DIFFICULTIES: Difficulty[] = [
  { id: 'beginner', label: 'Beginner', cols: 9, rows: 9, mines: 10 },
  { id: 'intermediate', label: 'Intermediate', cols: 16, rows: 16, mines: 40 },
  { id: 'expert', label: 'Expert', cols: 30, rows: 16, mines: 99 },
];

interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  /** Adjacent mine count, computed once mines are placed. */
  adjacent: number;
  /** Marks the specific mine that ended the game. */
  exploded: boolean;
}

type Status = 'idle' | 'playing' | 'won' | 'lost';

const CELL_PX = 28;

/** Distinct colors for the number clues 1-8. */
const NUMBER_COLORS: Record<number, string> = {
  1: 'text-sky-400',
  2: 'text-emerald-400',
  3: 'text-rose-400',
  4: 'text-indigo-300',
  5: 'text-amber-400',
  6: 'text-teal-300',
  7: 'text-fuchsia-300',
  8: 'text-slate-300',
};

function makeEmptyBoard(diff: Difficulty): Cell[] {
  return Array.from({ length: diff.cols * diff.rows }, () => ({
    mine: false,
    revealed: false,
    flagged: false,
    adjacent: 0,
    exploded: false,
  }));
}

function neighbors(index: number, diff: Difficulty): number[] {
  const x = index % diff.cols;
  const y = Math.floor(index / diff.cols);
  const result: number[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < diff.cols && ny >= 0 && ny < diff.rows) {
        result.push(ny * diff.cols + nx);
      }
    }
  }
  return result;
}

/** Place mines after the first click, excluding the clicked cell and its neighbors. */
function placeMines(board: Cell[], diff: Difficulty, safeIndex: number): Cell[] {
  const next = board.map((c) => ({ ...c, mine: false, adjacent: 0 }));
  const forbidden = new Set<number>([safeIndex, ...neighbors(safeIndex, diff)]);

  // If the board is too small to honor the full safe zone, only protect the cell.
  const maxMines = next.length - forbidden.size;
  if (diff.mines > maxMines) {
    forbidden.clear();
    forbidden.add(safeIndex);
  }

  const candidates: number[] = [];
  for (let i = 0; i < next.length; i += 1) {
    if (!forbidden.has(i)) candidates.push(i);
  }

  // Fisher-Yates partial shuffle to choose mine positions.
  for (let i = 0; i < diff.mines && i < candidates.length; i += 1) {
    const j = i + Math.floor(Math.random() * (candidates.length - i));
    const tmp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = tmp;
    next[candidates[i]].mine = true;
  }

  // Compute adjacency counts.
  for (let i = 0; i < next.length; i += 1) {
    if (next[i].mine) continue;
    next[i].adjacent = neighbors(i, diff).filter((n) => next[n].mine).length;
  }

  return next;
}

/** Reveal an index with flood-fill for empty (0-adjacent) cells. */
function floodReveal(board: Cell[], diff: Difficulty, start: number): Cell[] {
  const next = board.map((c) => ({ ...c }));
  const stack = [start];
  while (stack.length > 0) {
    const idx = stack.pop();
    if (idx === undefined) continue;
    const cell = next[idx];
    if (cell.revealed || cell.flagged || cell.mine) continue;
    cell.revealed = true;
    if (cell.adjacent === 0) {
      for (const n of neighbors(idx, diff)) {
        if (!next[n].revealed && !next[n].flagged) stack.push(n);
      }
    }
  }
  return next;
}

function countFlags(board: Cell[]): number {
  return board.reduce((acc, c) => acc + (c.flagged ? 1 : 0), 0);
}

function isWin(board: Cell[]): boolean {
  return board.every((c) => (c.mine ? !c.revealed : c.revealed));
}

function formatTime(seconds: number): string {
  const clamped = Math.min(seconds, 999);
  return String(clamped).padStart(3, '0');
}

export default function MinesweeperApp() {
  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTIES[0]);
  const [board, setBoard] = useState<Cell[]>(() => makeEmptyBoard(DIFFICULTIES[0]));
  const [status, setStatus] = useState<Status>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [bestTimes, setBestTimes] = useLocalStorage<Record<string, number>>(
    'minesweeper:best',
    {},
  );

  const timerRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = window.setInterval(() => {
      setElapsed((e) => Math.min(e + 1, 999));
    }, 1000);
  }, [stopTimer]);

  // Clean up the timer on unmount.
  useEffect(() => stopTimer, [stopTimer]);

  const resetBoard = useCallback(
    (diff: Difficulty) => {
      stopTimer();
      setBoard(makeEmptyBoard(diff));
      setStatus('idle');
      setElapsed(0);
    },
    [stopTimer],
  );

  const changeDifficulty = useCallback(
    (diff: Difficulty) => {
      setDifficulty(diff);
      resetBoard(diff);
    },
    [resetBoard],
  );

  const finishGame = useCallback(
    (next: Cell[], won: boolean) => {
      stopTimer();
      if (won) {
        // Flag every remaining mine for a tidy finish.
        const flagged = next.map((c) => (c.mine ? { ...c, flagged: true } : c));
        setBoard(flagged);
        setStatus('won');
        setBestTimes((prev) => {
          const current = prev[difficulty.id];
          if (current === undefined || elapsed < current) {
            return { ...prev, [difficulty.id]: elapsed };
          }
          return prev;
        });
      } else {
        // Reveal all mines on loss.
        const revealed = next.map((c) =>
          c.mine ? { ...c, revealed: true } : c,
        );
        setBoard(revealed);
        setStatus('lost');
      }
    },
    [stopTimer, setBestTimes, difficulty.id, elapsed],
  );

  const handleReveal = useCallback(
    (index: number) => {
      if (status === 'won' || status === 'lost') return;

      setBoard((current) => {
        const cell = current[index];
        if (cell.revealed || cell.flagged) return current;

        let working = current;
        let playing = status === 'playing';

        // First click: lay mines now, then start the timer.
        if (status === 'idle') {
          working = placeMines(current, difficulty, index);
          setStatus('playing');
          startTimer();
          playing = true;
        }

        const target = working[index];
        if (target.mine) {
          const exploded = working.map((c, i) =>
            i === index ? { ...c, exploded: true } : c,
          );
          finishGame(exploded, false);
          return exploded;
        }

        const revealed = floodReveal(working, difficulty, index);
        if (isWin(revealed)) {
          finishGame(revealed, true);
          return revealed;
        }

        // Guard against an unused-variable warning in the idle->playing path.
        void playing;
        return revealed;
      });
    },
    [status, difficulty, startTimer, finishGame],
  );

  const handleFlag = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      if (status === 'won' || status === 'lost' || status === 'idle') {
        // Allow flagging before the first reveal too, but never on finished games.
        if (status === 'won' || status === 'lost') return;
      }
      setBoard((current) => {
        const cell = current[index];
        if (cell.revealed) return current;
        return current.map((c, i) =>
          i === index ? { ...c, flagged: !c.flagged } : c,
        );
      });
    },
    [status],
  );

  const restart = useCallback(() => resetBoard(difficulty), [resetBoard, difficulty]);

  const flagsUsed = useMemo(() => countFlags(board), [board]);
  const minesRemaining = difficulty.mines - flagsUsed;
  const best = bestTimes[difficulty.id];

  const StatusFace =
    status === 'lost' ? Frown : status === 'won' ? Laugh : Smile;
  const faceColor =
    status === 'lost'
      ? 'text-rose-400'
      : status === 'won'
        ? 'text-emerald-400'
        : 'text-amber-300';

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-slate-950/40 text-slate-100">
      {/* Toolbar: difficulty + restart */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2 text-accent">
          <Bomb size={18} />
          <span className="font-semibold text-slate-100">Minesweeper</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {DIFFICULTIES.map((d) => (
            <Button
              key={d.id}
              variant={d.id === difficulty.id ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => changeDifficulty(d)}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Status bar: mines remaining, face/reset, timer */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-1.5 font-mono font-semibold tabular-nums text-rose-300">
          <Flag size={14} />
          <span>{String(Math.max(minesRemaining, -99)).padStart(3, '0')}</span>
        </div>

        <button
          type="button"
          onClick={restart}
          title="Restart"
          className={cn(
            'mx-auto inline-flex items-center justify-center h-9 w-9 rounded-lg',
            'bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
            faceColor,
          )}
        >
          <StatusFace size={20} />
        </button>

        <div className="flex items-center gap-1.5 font-mono font-semibold tabular-nums text-sky-300">
          <Timer size={14} />
          <span>{formatTime(elapsed)}</span>
        </div>
      </div>

      {/* Banner */}
      {(status === 'won' || status === 'lost') && (
        <div
          className={cn(
            'px-4 py-2 text-sm font-medium text-center animate-fade-in',
            status === 'won'
              ? 'bg-emerald-500/15 text-emerald-300 border-b border-emerald-500/20'
              : 'bg-rose-500/15 text-rose-300 border-b border-rose-500/20',
          )}
        >
          {status === 'won' ? (
            <span>
              You cleared the field in {elapsed}s!
              {best !== undefined && elapsed <= best ? ' New best time!' : ''}
            </span>
          ) : (
            <span>Boom! You hit a mine.</span>
          )}
        </div>
      )}

      {/* Board */}
      <div className="flex-1 overflow-auto scroll-thin grid place-items-center p-4">
        <div
          className="inline-block select-none rounded-xl border border-white/10 bg-slate-950/60 p-2 shadow-2xl shadow-black/40"
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            className="grid gap-[2px]"
            style={{
              gridTemplateColumns: `repeat(${difficulty.cols}, ${CELL_PX}px)`,
            }}
          >
            {board.map((cell, index) => {
              const reveal = cell.revealed;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleReveal(index)}
                  onContextMenu={(e) => handleFlag(e, index)}
                  disabled={status === 'won' || status === 'lost'}
                  style={{ width: CELL_PX, height: CELL_PX }}
                  className={cn(
                    'flex items-center justify-center rounded-[4px] text-sm font-bold leading-none',
                    'transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/60',
                    reveal
                      ? cell.exploded
                        ? 'bg-rose-500/80'
                        : 'bg-slate-800/70'
                      : 'bg-slate-700/60 hover:bg-slate-600/70 active:bg-slate-600',
                    !reveal && 'border border-white/5',
                  )}
                >
                  {cell.flagged && !reveal && (
                    <Flag size={14} className="text-rose-400" />
                  )}
                  {reveal && cell.mine && (
                    <Bomb
                      size={15}
                      className={cell.exploded ? 'text-white' : 'text-slate-200'}
                    />
                  )}
                  {reveal && !cell.mine && cell.adjacent > 0 && (
                    <span className={NUMBER_COLORS[cell.adjacent]}>
                      {cell.adjacent}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer: best time + reset */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-white/10 bg-white/5 text-xs text-slate-400">
        <span>
          {difficulty.cols}x{difficulty.rows} - {difficulty.mines} mines
        </span>
        <span className="ml-auto">
          Best:{' '}
          <span className="font-mono text-slate-200">
            {best !== undefined ? `${best}s` : '--'}
          </span>
        </span>
        <Button variant="ghost" size="sm" onClick={restart}>
          <RotateCcw size={14} />
          Reset
        </Button>
      </div>
    </div>
  );
}
