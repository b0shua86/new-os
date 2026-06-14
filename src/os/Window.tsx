import { memo, Suspense, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { useOS } from './store';
import { cn, clamp } from './utils';

interface WindowFrameProps {
  windowId: string;
  children: ReactNode;
}

const TASKBAR_H = 76;

/**
 * A single desktop window: draggable title bar, corner resize handle, and the
 * standard minimize / maximize / close controls. Only re-renders when its own
 * window slice changes (selector returns a stable reference otherwise).
 */
function WindowFrameBase({ windowId, children }: WindowFrameProps) {
  const win = useOS((s) => s.windows.find((w) => w.id === windowId));
  const isTop = useOS((s) => s.topZ === win?.zIndex);
  const reduceMotion = useOS((s) => s.settings.reduceMotion);
  const focusWindow = useOS((s) => s.focusWindow);
  const closeWindow = useOS((s) => s.closeWindow);
  const minimizeWindow = useOS((s) => s.minimizeWindow);
  const toggleMaximize = useOS((s) => s.toggleMaximize);
  const setWindowBounds = useOS((s) => s.setWindowBounds);

  const frame = (
    win ? win : null
  );

  // Live drag/resize is committed to the store via rAF to stay smooth.
  const rafRef = useRef<number | null>(null);
  const pending = useRef<Partial<{ x: number; y: number; width: number; height: number }> | null>(
    null,
  );

  const flush = useCallback(() => {
    rafRef.current = null;
    if (pending.current) {
      setWindowBounds(windowId, pending.current);
      pending.current = null;
    }
  }, [setWindowBounds, windowId]);

  const schedule = useCallback(
    (bounds: Partial<{ x: number; y: number; width: number; height: number }>) => {
      pending.current = { ...pending.current, ...bounds };
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(flush);
    },
    [flush],
  );

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const onDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (!frame || frame.maximized) return;
      e.preventDefault();
      focusWindow(windowId);
      const startX = e.clientX;
      const startY = e.clientY;
      const originX = frame.x;
      const originY = frame.y;
      const move = (ev: PointerEvent) => {
        const vw = window.innerWidth;
        const x = clamp(originX + (ev.clientX - startX), -frame.width + 80, vw - 80);
        const y = clamp(originY + (ev.clientY - startY), 0, window.innerHeight - TASKBAR_H - 8);
        schedule({ x, y });
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [frame, focusWindow, schedule, windowId],
  );

  const onResizeStart = useCallback(
    (e: React.PointerEvent) => {
      if (!frame || frame.maximized) return;
      e.preventDefault();
      e.stopPropagation();
      focusWindow(windowId);
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = frame.width;
      const startH = frame.height;
      const move = (ev: PointerEvent) => {
        const width = clamp(startW + (ev.clientX - startX), frame.minSize.width, window.innerWidth - frame.x - 8);
        const height = clamp(
          startH + (ev.clientY - startY),
          frame.minSize.height,
          window.innerHeight - frame.y - TASKBAR_H,
        );
        schedule({ width, height });
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [frame, focusWindow, schedule, windowId],
  );

  if (!frame || frame.minimized) return null;

  const style: React.CSSProperties = frame.maximized
    ? { left: 8, top: 8, right: 8, width: 'auto', height: `calc(100% - ${TASKBAR_H + 8}px)`, zIndex: frame.zIndex }
    : {
        left: frame.x,
        top: frame.y,
        width: frame.width,
        height: frame.height,
        zIndex: frame.zIndex,
      };

  return (
    <div
      className={cn(
        'absolute flex flex-col rounded-2xl overflow-hidden glass-strong shadow-2xl',
        'ring-1 ring-black/40',
        isTop ? 'shadow-black/60' : 'opacity-95',
        !reduceMotion && 'animate-window-in',
      )}
      style={style}
      onPointerDown={() => focusWindow(windowId)}
      role="dialog"
      aria-label={frame.title}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-3 h-9 shrink-0 bg-white/5 border-b border-white/10 cursor-default"
        onPointerDown={onDragStart}
        onDoubleClick={() => toggleMaximize(windowId)}
      >
        <span className="text-sm select-none">{frame.icon}</span>
        <span className="text-xs font-medium text-slate-200 truncate flex-1 select-none">
          {frame.title}
        </span>
        <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <button
            onClick={() => minimizeWindow(windowId)}
            className="grid place-items-center w-6 h-6 rounded-md hover:bg-white/10 text-slate-300"
            aria-label="Minimize"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={() => toggleMaximize(windowId)}
            className="grid place-items-center w-6 h-6 rounded-md hover:bg-white/10 text-slate-300"
            aria-label="Maximize"
          >
            {frame.maximized ? <Copy size={11} /> : <Square size={11} />}
          </button>
          <button
            onClick={() => closeWindow(windowId)}
            className="grid place-items-center w-6 h-6 rounded-md hover:bg-rose-500 text-slate-300 hover:text-white"
            aria-label="Close"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* App content */}
      <div className="relative flex-1 min-h-0 bg-slate-950/40 text-slate-100">
        <Suspense
          fallback={
            <div className="absolute inset-0 grid place-items-center text-slate-400 text-sm">
              Loading…
            </div>
          }
        >
          {children}
        </Suspense>
      </div>

      {/* Resize handle */}
      {!frame.maximized && (
        <div
          onPointerDown={onResizeStart}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
          style={{
            background:
              'linear-gradient(135deg, transparent 50%, rgba(148,163,184,0.6) 50%, rgba(148,163,184,0.6) 60%, transparent 60%, transparent 70%, rgba(148,163,184,0.6) 70%, rgba(148,163,184,0.6) 80%, transparent 80%)',
          }}
          aria-hidden
        />
      )}
    </div>
  );
}

export const WindowFrame = memo(WindowFrameBase);
