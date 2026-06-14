import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Brush,
  Eraser,
  Trash2,
  Save,
  Download,
  Palette,
} from 'lucide-react';
import { Button } from '../components/Button';
import { useLocalStorage } from '../os/useLocalStorage';
import { cn, clamp, uid } from '../os/utils';

/** Fixed internal canvas resolution. */
const CANVAS_W = 900;
const CANVAS_H = 560;
const BG_COLOR = '#ffffff';

type Tool = 'brush' | 'eraser';

const PRESET_COLORS = [
  '#0f172a',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#6366f1',
  '#ec4899',
];

interface Point {
  x: number;
  y: number;
}

export default function PaintApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState('#6366f1');
  const [size, setSize] = useState(8);

  const [savedImage, setSavedImage] = useLocalStorage('paint:image', '');
  const [savedAt, setSavedAt] = useState<string>('');

  // Stroke state kept in refs so window-level listeners always read fresh data.
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const sizeRef = useRef(size);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    colorRef.current = color;
  }, [color]);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  /** Fill the whole canvas with the background color. */
  const paintBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.restore();
  }, []);

  // Initialize the canvas once and restore any saved drawing.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    paintBackground(ctx);

    if (savedImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
      };
      img.src = savedImage;
    }
    // Intentionally run only on mount; savedImage restore is a one-time hydrate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Translate a client (screen) coordinate into canvas pixel space. */
  const toCanvasPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  /** Persist the current canvas contents to localStorage as a PNG dataURL. */
  const persist = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      setSavedImage(canvas.toDataURL('image/png'));
    } catch {
      /* toDataURL can throw if tainted; ignore — drawing stays in memory. */
    }
  }, [setSavedImage]);

  const drawSegment = useCallback((from: Point, to: Point) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.strokeStyle = toolRef.current === 'eraser' ? BG_COLOR : colorRef.current;
    ctx.lineWidth = sizeRef.current;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }, []);

  /** Draw a single dot so a click (with no movement) still leaves a mark. */
  const drawDot = useCallback((p: Point) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.fillStyle = toolRef.current === 'eraser' ? BG_COLOR : colorRef.current;
    ctx.beginPath();
    ctx.arc(p.x, p.y, sizeRef.current / 2, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  // Window-level move/up listeners so a stroke continues even if the pointer
  // leaves the canvas (and ends correctly on release anywhere).
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!drawingRef.current) return;
      const p = toCanvasPoint(e.clientX, e.clientY);
      if (!p) return;
      const last = lastPointRef.current;
      if (last) drawSegment(last, p);
      lastPointRef.current = p;
    };

    const handleUp = () => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      lastPointRef.current = null;
      persist();
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [toCanvasPoint, drawSegment, persist]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const p = toCanvasPoint(e.clientX, e.clientY);
      if (!p) return;
      drawingRef.current = true;
      lastPointRef.current = p;
      drawDot(p);
    },
    [toCanvasPoint, drawDot],
  );

  const handleClear = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const ok = window.confirm('Clear the entire canvas? This cannot be undone.');
    if (!ok) return;
    paintBackground(ctx);
    persist();
  }, [paintBackground, persist]);

  const handleSave = useCallback(() => {
    persist();
    setSavedAt(new Date().toLocaleTimeString());
  }, [persist]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let url: string;
    try {
      url = canvas.toDataURL('image/png');
    } catch {
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = `promptos-paint-${uid()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-slate-100">
      {/* Toolbar */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 glass-strong border-b border-white/10">
        <div className="flex items-center gap-1 rounded-lg bg-black/20 p-1">
          <button
            type="button"
            onClick={() => setTool('brush')}
            aria-pressed={tool === 'brush'}
            title="Brush"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
              tool === 'brush'
                ? 'bg-accent text-white shadow-lg shadow-accent/20'
                : 'text-slate-300 hover:bg-white/10',
            )}
          >
            <Brush size={15} />
            Brush
          </button>
          <button
            type="button"
            onClick={() => setTool('eraser')}
            aria-pressed={tool === 'eraser'}
            title="Eraser"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
              tool === 'eraser'
                ? 'bg-accent text-white shadow-lg shadow-accent/20'
                : 'text-slate-300 hover:bg-white/10',
            )}
          >
            <Eraser size={15} />
            Eraser
          </button>
        </div>

        <div className="h-6 w-px bg-white/10" aria-hidden />

        {/* Color picker + swatches */}
        <label
          className="relative inline-flex items-center gap-1.5 rounded-lg bg-black/20 px-2 py-1.5 text-xs text-slate-300 cursor-pointer"
          title="Pick color"
        >
          <Palette size={15} />
          <span
            className="h-4 w-4 rounded ring-1 ring-white/30"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setTool('brush');
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Custom color"
          />
        </label>

        <div className="flex items-center gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              aria-label={`Use color ${c}`}
              onClick={() => {
                setColor(c);
                setTool('brush');
              }}
              className={cn(
                'h-5 w-5 rounded-full ring-1 ring-white/20 transition-transform hover:scale-110',
                color.toLowerCase() === c.toLowerCase() &&
                  tool === 'brush' &&
                  'ring-2 ring-accent',
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="h-6 w-px bg-white/10" aria-hidden />

        {/* Brush size */}
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <span className="whitespace-nowrap">Size</span>
          <input
            type="range"
            min={1}
            max={40}
            value={size}
            onChange={(e) => setSize(clamp(Number(e.target.value), 1, 40))}
            className="accent-accent w-28"
            aria-label="Brush size"
          />
          <span className="w-6 text-right tabular-nums text-slate-400">{size}</span>
        </label>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleClear} title="Clear canvas">
            <Trash2 size={15} />
            Clear
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload} title="Download PNG">
            <Download size={15} />
            PNG
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} title="Save drawing">
            <Save size={15} />
            Save
          </Button>
        </div>
      </div>

      {/* Canvas surface */}
      <div className="flex-1 overflow-auto scroll-thin bg-slate-950/40">
        <div className="min-h-full w-full grid place-items-center p-6">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onPointerDown={handlePointerDown}
            className={cn(
              'rounded-lg shadow-2xl shadow-black/50 ring-1 ring-white/10 bg-white touch-none',
              'max-w-full',
              tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair',
            )}
            style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 text-[11px] text-slate-400 glass-strong border-t border-white/10">
        <span>
          {CANVAS_W} x {CANVAS_H} px - {tool === 'eraser' ? 'Eraser' : 'Brush'}
        </span>
        <span>{savedAt ? `Saved at ${savedAt}` : 'Strokes auto-save'}</span>
      </div>
    </div>
  );
}
