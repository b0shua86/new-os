import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Trophy, Gamepad2 } from 'lucide-react';
import { Button } from '../components/Button';
import { cn, uid } from '../os/utils';
import { useLocalStorage } from '../os/useLocalStorage';

/** Grid is GRID x GRID cells, drawn into a fixed CANVAS_PX square canvas. */
const GRID = 20;
const CANVAS_PX = 420;
const CELL = CANVAS_PX / GRID;

/** Tick timing: starts slow, speeds up with score, never faster than MIN_TICK. */
const BASE_TICK = 140;
const MIN_TICK = 60;
const TICK_STEP = 6;

type Point = { x: number; y: number };
type Dir = 'up' | 'down' | 'left' | 'right';

const DELTAS: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

function initialSnake(): Point[] {
  const mid = Math.floor(GRID / 2);
  // Head first, growing left so default direction "right" is safe.
  return [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Pick a random cell not currently occupied by the snake. */
function spawnFood(snake: Point[]): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
  const free: Point[] = [];
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return { x: 0, y: 0 };
  return free[Math.floor(Math.random() * free.length)];
}

function tickForScore(score: number): number {
  return Math.max(MIN_TICK, BASE_TICK - score * TICK_STEP);
}

export default function SnakeApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);

  const [highScore, setHighScore] = useLocalStorage('snake:highscore', 0);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  // Used to force a fresh game session (resets refs below).
  const [sessionId, setSessionId] = useState(() => uid('snake'));

  // Mutable game state lives in refs so the interval reads the latest values
  // without re-creating itself on every render.
  const snakeRef = useRef<Point[]>(initialSnake());
  const dirRef = useRef<Dir>('right');
  const pendingDirRef = useRef<Dir>('right');
  const foodRef = useRef<Point>(spawnFood(snakeRef.current));
  const scoreRef = useRef(0);

  /** Draw the current game state to the canvas. */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const accent = getComputedStyle(canvas).getPropertyValue('color').trim() || '#6366f1';

    // Background.
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

    // Subtle grid.
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, CANVAS_PX);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(CANVAS_PX, i * CELL);
      ctx.stroke();
    }

    // Food.
    const food = foodRef.current;
    ctx.fillStyle = '#f43f5e';
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 12;
    const fpad = CELL * 0.18;
    ctx.beginPath();
    ctx.roundRect(
      food.x * CELL + fpad,
      food.y * CELL + fpad,
      CELL - fpad * 2,
      CELL - fpad * 2,
      4,
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Snake.
    const snake = snakeRef.current;
    for (let i = 0; i < snake.length; i += 1) {
      const seg = snake[i];
      const isHead = i === 0;
      ctx.fillStyle = isHead ? accent : 'rgba(99, 102, 241, 0.7)';
      if (isHead) {
        ctx.shadowColor = accent;
        ctx.shadowBlur = 14;
      }
      const pad = CELL * 0.08;
      ctx.beginPath();
      ctx.roundRect(
        seg.x * CELL + pad,
        seg.y * CELL + pad,
        CELL - pad * 2,
        CELL - pad * 2,
        isHead ? 6 : 4,
      );
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, []);

  /** Advance the game by one tick. Returns false if the move ended the game. */
  const step = useCallback((): boolean => {
    const dir = pendingDirRef.current;
    dirRef.current = dir;
    const snake = snakeRef.current;
    const head = snake[0];
    const delta = DELTAS[dir];
    const next: Point = { x: head.x + delta.x, y: head.y + delta.y };

    // Wall collision.
    if (next.x < 0 || next.y < 0 || next.x >= GRID || next.y >= GRID) {
      return false;
    }

    const willEat = samePoint(next, foodRef.current);
    // Self collision. When not eating, the tail moves away this tick, so the
    // last segment is a legal destination.
    const body = willEat ? snake : snake.slice(0, -1);
    if (body.some((seg) => samePoint(seg, next))) {
      return false;
    }

    const newSnake = [next, ...snake];
    if (willEat) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      foodRef.current = spawnFood(newSnake);
    } else {
      newSnake.pop();
    }
    snakeRef.current = newSnake;
    return true;
  }, []);

  // Main loop. Re-created whenever the running state, session, or score
  // (which changes tick speed) changes.
  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      const alive = step();
      if (!alive) {
        setRunning(false);
        setGameOver(true);
        setHighScore((prev) => (scoreRef.current > prev ? scoreRef.current : prev));
        return;
      }
      draw();
    }, tickForScore(scoreRef.current));

    return () => window.clearInterval(interval);
  }, [running, sessionId, score, step, draw, setHighScore]);

  // Initial paint and repaint after a fresh session.
  useEffect(() => {
    draw();
  }, [sessionId, draw]);

  const startNewGame = useCallback(() => {
    snakeRef.current = initialSnake();
    dirRef.current = 'right';
    pendingDirRef.current = 'right';
    foodRef.current = spawnFood(snakeRef.current);
    scoreRef.current = 0;
    setScore(0);
    setGameOver(false);
    setSessionId(uid('snake'));
    setRunning(true);
    fieldRef.current?.focus();
  }, []);

  const togglePause = useCallback(() => {
    if (gameOver) return;
    setRunning((r) => !r);
    fieldRef.current?.focus();
  }, [gameOver]);

  const queueDir = useCallback((dir: Dir) => {
    // Block 180-degree reversals against the committed direction.
    if (dir === OPPOSITE[dirRef.current]) return;
    pendingDirRef.current = dir;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      let handled = true;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          queueDir('up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          queueDir('down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          queueDir('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          queueDir('right');
          break;
        case ' ':
        case 'Spacebar':
          if (gameOver) startNewGame();
          else togglePause();
          break;
        default:
          handled = false;
      }
      if (handled) e.preventDefault();
    },
    [queueDir, togglePause, startNewGame, gameOver],
  );

  // Auto-focus on mount so keyboard works immediately.
  useEffect(() => {
    fieldRef.current?.focus();
  }, []);

  const isNewBest = gameOver && score > 0 && score >= highScore;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-slate-950/40 text-slate-100">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2 text-accent">
          <Gamepad2 size={18} />
          <span className="font-semibold text-slate-100">Snake</span>
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[10px] uppercase tracking-wide text-slate-400">Score</span>
            <span className="font-mono font-semibold tabular-nums text-slate-100">{score}</span>
          </div>
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[10px] uppercase tracking-wide text-slate-400">Best</span>
            <span className="flex items-center gap-1 font-mono font-semibold tabular-nums text-accent">
              <Trophy size={12} />
              {highScore}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePause}
            disabled={gameOver}
            title={running ? 'Pause' : 'Play'}
          >
            {running ? <Pause size={14} /> : <Play size={14} />}
            {running ? 'Pause' : 'Play'}
          </Button>
          <Button variant="primary" size="sm" onClick={startNewGame} title="Restart">
            <RotateCcw size={14} />
            Restart
          </Button>
        </div>
      </div>

      {/* Play field */}
      <div className="flex-1 grid place-items-center overflow-auto scroll-thin p-4">
        <div
          ref={fieldRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onClick={() => fieldRef.current?.focus()}
          className={cn(
            'relative rounded-xl overflow-hidden outline-none',
            'border border-white/10 shadow-2xl shadow-black/40',
            'ring-accent/0 focus-visible:ring-2 focus-visible:ring-accent/60',
          )}
          style={{ width: CANVAS_PX, height: CANVAS_PX }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_PX}
            height={CANVAS_PX}
            className="block text-accent"
          />

          {/* Idle hint before the first start */}
          {!running && !gameOver && score === 0 && (
            <div className="absolute inset-0 grid place-items-center bg-slate-950/70 backdrop-blur-sm">
              <div className="text-center px-6">
                <Gamepad2 className="mx-auto mb-3 text-accent" size={40} />
                <p className="text-slate-200 font-medium">Arrow keys or WASD to move</p>
                <p className="text-slate-400 text-sm mt-1 mb-4">Space to pause</p>
                <Button variant="primary" size="md" onClick={startNewGame}>
                  <Play size={16} />
                  Start Game
                </Button>
              </div>
            </div>
          )}

          {/* Paused overlay */}
          {!running && !gameOver && score > 0 && (
            <div className="absolute inset-0 grid place-items-center bg-slate-950/60 backdrop-blur-sm">
              <div className="text-center">
                <Pause className="mx-auto mb-2 text-accent" size={36} />
                <p className="text-slate-200 font-medium">Paused</p>
                <p className="text-slate-400 text-xs mt-1">Press Space to resume</p>
              </div>
            </div>
          )}

          {/* Game over overlay */}
          {gameOver && (
            <div className="absolute inset-0 grid place-items-center bg-slate-950/80 backdrop-blur-sm animate-fade-in">
              <div className="text-center px-6">
                <p className="text-2xl font-bold text-rose-400">Game Over</p>
                <p className="mt-2 text-slate-200">
                  Score <span className="font-mono font-semibold text-accent">{score}</span>
                </p>
                {isNewBest && (
                  <p className="mt-1 flex items-center justify-center gap-1 text-sm text-amber-300">
                    <Trophy size={14} />
                    New best!
                  </p>
                )}
                <Button variant="primary" size="md" className="mt-4" onClick={startNewGame}>
                  <RotateCcw size={16} />
                  Play Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
