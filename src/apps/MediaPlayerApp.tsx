import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useLocalStorage } from '../os/useLocalStorage';
import { cn } from '../os/utils';

/** A single (fake) track in the demo playlist. */
interface Track {
  id: string;
  title: string;
  artist: string;
  durationSec: number;
  /** Tailwind gradient classes used for the album-art placeholder. */
  gradient: string;
}

/** Built-in static playlist — this is a player shell, there are no audio files. */
const PLAYLIST: Track[] = [
  {
    id: 'neon-skyline',
    title: 'Neon Skyline',
    artist: 'Aurora Drift',
    durationSec: 214,
    gradient: 'from-fuchsia-500 via-purple-500 to-indigo-600',
  },
  {
    id: 'midnight-protocol',
    title: 'Midnight Protocol',
    artist: 'Vector Field',
    durationSec: 187,
    gradient: 'from-cyan-400 via-sky-500 to-blue-700',
  },
  {
    id: 'glass-horizon',
    title: 'Glass Horizon',
    artist: 'Lumen',
    durationSec: 246,
    gradient: 'from-amber-400 via-orange-500 to-rose-600',
  },
  {
    id: 'soft-static',
    title: 'Soft Static',
    artist: 'Halcyon',
    durationSec: 169,
    gradient: 'from-emerald-400 via-teal-500 to-cyan-700',
  },
  {
    id: 'gravity-well',
    title: 'Gravity Well',
    artist: 'Null Coordinates',
    durationSec: 233,
    gradient: 'from-violet-500 via-indigo-500 to-slate-700',
  },
  {
    id: 'afterglow',
    title: 'Afterglow',
    artist: 'Pale Signal',
    durationSec: 201,
    gradient: 'from-rose-400 via-pink-500 to-fuchsia-700',
  },
];

type RepeatMode = 'off' | 'all' | 'one';

interface PersistedState {
  volume: number;
  trackIndex: number;
  shuffle: boolean;
  repeat: RepeatMode;
}

const DEFAULT_STATE: PersistedState = {
  volume: 0.8,
  trackIndex: 0,
  shuffle: false,
  repeat: 'off',
};

/** Number of animated visualizer bars. */
const BAR_COUNT = 28;

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Pick a random track index different from the current one (when possible). */
function randomIndex(current: number, length: number): number {
  if (length <= 1) return current;
  let next = current;
  while (next === current) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}

export default function MediaPlayerApp() {
  const [persisted, setPersisted] = useLocalStorage<PersistedState>(
    'media:state',
    DEFAULT_STATE,
  );

  // Clamp the persisted index in case the playlist shrank between sessions.
  const initialIndex = useMemo(
    () =>
      Math.min(Math.max(0, persisted.trackIndex), PLAYLIST.length - 1),
    [persisted.trackIndex],
  );

  const [index, setIndex] = useState(initialIndex);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);

  const volume = persisted.volume;
  const shuffle = persisted.shuffle;
  const repeat = persisted.repeat;

  const track = PLAYLIST[index];

  // Keep persisted state in sync without re-rendering on the per-second tick.
  const patchPersisted = useCallback(
    (patch: Partial<PersistedState>) =>
      setPersisted((prev) => ({ ...prev, ...patch })),
    [setPersisted],
  );

  // Persist the active track index when it changes.
  useEffect(() => {
    patchPersisted({ trackIndex: index });
  }, [index, patchPersisted]);

  const playTrack = useCallback((nextIndex: number) => {
    setIndex(nextIndex);
    setPosition(0);
    setPlaying(true);
  }, []);

  const goNext = useCallback(
    (auto: boolean) => {
      if (auto && repeat === 'one') {
        setPosition(0);
        setPlaying(true);
        return;
      }
      if (shuffle) {
        playTrack(randomIndex(index, PLAYLIST.length));
        return;
      }
      const atEnd = index === PLAYLIST.length - 1;
      if (atEnd) {
        if (repeat === 'all') {
          playTrack(0);
        } else {
          // Stop at the end of the list.
          setIndex(0);
          setPosition(0);
          setPlaying(false);
        }
        return;
      }
      playTrack(index + 1);
    },
    [index, repeat, shuffle, playTrack],
  );

  const goPrev = useCallback(() => {
    // Restart the current track if we're more than 3s in, otherwise go back.
    if (position > 3) {
      setPosition(0);
      return;
    }
    if (shuffle) {
      playTrack(randomIndex(index, PLAYLIST.length));
      return;
    }
    const prevIndex = index === 0 ? PLAYLIST.length - 1 : index - 1;
    playTrack(prevIndex);
  }, [index, position, shuffle, playTrack]);

  // Simulated playback clock: advance once per second while playing.
  // We keep `goNext` in a ref so the interval doesn't constantly tear down.
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;

  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => {
      setPosition((prev) => {
        const next = prev + 1;
        if (next >= track.durationSec) {
          // Defer the track change out of the state updater.
          window.setTimeout(() => goNextRef.current(true), 0);
          return track.durationSec;
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [playing, track.durationSec]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      // If we hit the end while stopped, restart from the top of the track.
      if (!p && position >= track.durationSec) setPosition(0);
      return !p;
    });
  }, [position, track.durationSec]);

  const cycleRepeat = useCallback(() => {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    const nextMode = order[(order.indexOf(repeat) + 1) % order.length];
    patchPersisted({ repeat: nextMode });
  }, [repeat, patchPersisted]);

  const toggleShuffle = useCallback(
    () => patchPersisted({ shuffle: !shuffle }),
    [shuffle, patchPersisted],
  );

  const setVolume = useCallback(
    (v: number) => patchPersisted({ volume: Math.min(1, Math.max(0, v)) }),
    [patchPersisted],
  );

  const seekToFraction = useCallback(
    (fraction: number) => {
      const clamped = Math.min(1, Math.max(0, fraction));
      setPosition(Math.round(clamped * track.durationSec));
    },
    [track.durationSec],
  );

  const progress = track.durationSec ? position / track.durationSec : 0;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-gradient-to-b from-slate-950/60 to-black/60 text-slate-100">
      <VisualizerStyles />

      {/* Header */}
      <header className="flex items-center gap-2.5 px-5 py-3 border-b border-white/10 bg-black/20">
        <div className="grid place-items-center h-8 w-8 rounded-lg bg-accent/20 border border-accent/40">
          <Music2 size={16} className="text-accent" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-wide">Media Player</h1>
          <p className="text-[11px] text-slate-400 truncate">
            Player shell · demo only, no audio files are loaded
          </p>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* ---- Now playing ---- */}
        <section className="flex flex-1 min-h-0 flex-col items-center justify-center gap-5 px-6 py-6">
          {/* Album art + visualizer */}
          <div className="relative w-full max-w-[280px] aspect-square">
            <div
              className={cn(
                'absolute inset-0 rounded-3xl bg-gradient-to-br shadow-2xl',
                'border border-white/10',
                track.gradient,
              )}
            >
              <div className="absolute inset-0 rounded-3xl bg-black/10" />
              <Music2
                size={64}
                className="absolute inset-0 m-auto text-white/80 drop-shadow"
              />
            </div>
            {/* Visualizer overlaid along the bottom of the art */}
            <div className="absolute inset-x-4 bottom-4 flex h-12 items-end justify-center gap-[3px]">
              {Array.from({ length: BAR_COUNT }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'flex-1 rounded-full bg-white/80',
                    playing ? 'media-bar' : '',
                  )}
                  style={
                    playing
                      ? {
                          animationDelay: `${(i % 7) * 90}ms`,
                          animationDuration: `${700 + (i % 5) * 110}ms`,
                        }
                      : { height: '14%' }
                  }
                />
              ))}
            </div>
          </div>

          {/* Title + artist */}
          <div className="text-center min-w-0 w-full max-w-[320px]">
            <h2 className="truncate text-lg font-semibold text-slate-50">
              {track.title}
            </h2>
            <p className="truncate text-sm text-slate-400">{track.artist}</p>
          </div>

          {/* Seekable progress bar */}
          <div className="w-full max-w-[320px]">
            <SeekBar progress={progress} onSeek={seekToFraction} />
            <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-slate-400">
              <span>{formatTime(position)}</span>
              <span>{formatTime(track.durationSec)}</span>
            </div>
          </div>

          {/* Transport controls */}
          <div className="flex items-center gap-3">
            <IconToggle
              active={shuffle}
              onClick={toggleShuffle}
              label="Shuffle"
            >
              <Shuffle size={16} />
            </IconToggle>

            <button
              onClick={goPrev}
              aria-label="Previous track"
              className="grid h-10 w-10 place-items-center rounded-full text-slate-200 hover:bg-white/10 transition-colors active:scale-95"
            >
              <SkipBack size={20} />
            </button>

            <button
              onClick={togglePlay}
              aria-label={playing ? 'Pause' : 'Play'}
              className="grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 hover:brightness-110 transition-all active:scale-95"
            >
              {playing ? (
                <Pause size={26} />
              ) : (
                <Play size={26} className="translate-x-[1px]" />
              )}
            </button>

            <button
              onClick={() => goNext(false)}
              aria-label="Next track"
              className="grid h-10 w-10 place-items-center rounded-full text-slate-200 hover:bg-white/10 transition-colors active:scale-95"
            >
              <SkipForward size={20} />
            </button>

            <IconToggle
              active={repeat !== 'off'}
              onClick={cycleRepeat}
              label={
                repeat === 'one'
                  ? 'Repeat one'
                  : repeat === 'all'
                    ? 'Repeat all'
                    : 'Repeat off'
              }
            >
              {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </IconToggle>
          </div>

          {/* Volume */}
          <div className="flex w-full max-w-[320px] items-center gap-3">
            <button
              onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
              aria-label={volume === 0 ? 'Unmute' : 'Mute'}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-300 hover:bg-white/10 transition-colors"
            >
              {volume === 0 ? (
                <VolumeX size={16} />
              ) : volume < 0.5 ? (
                <Volume1 size={16} />
              ) : (
                <Volume2 size={16} />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="media-range flex-1"
              style={{ '--fill': `${volume * 100}%` } as React.CSSProperties}
            />
            <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-slate-400">
              {Math.round(volume * 100)}
            </span>
          </div>
        </section>

        {/* ---- Playlist ---- */}
        <aside className="flex w-full md:w-72 shrink-0 flex-col border-t md:border-t-0 md:border-l border-white/10 bg-black/20 min-h-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Up next
            </h3>
            <span className="text-[11px] text-slate-500 tabular-nums">
              {PLAYLIST.length} tracks
            </span>
          </div>
          <ul className="flex-1 overflow-auto scroll-thin p-2 space-y-1">
            {PLAYLIST.map((t, i) => {
              const active = i === index;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => playTrack(i)}
                    className={cn(
                      'group w-full text-left rounded-lg px-2.5 py-2 transition-colors border flex items-center gap-2.5',
                      active
                        ? 'bg-accent/20 border-accent/40'
                        : 'bg-transparent border-transparent hover:bg-white/5',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gradient-to-br',
                        t.gradient,
                      )}
                    >
                      {active && playing ? (
                        <span className="flex items-end gap-[2px] h-4">
                          <span className="media-bar w-[2px] bg-white" style={{ animationDuration: '600ms' }} />
                          <span className="media-bar w-[2px] bg-white" style={{ animationDuration: '780ms', animationDelay: '120ms' }} />
                          <span className="media-bar w-[2px] bg-white" style={{ animationDuration: '680ms', animationDelay: '240ms' }} />
                        </span>
                      ) : (
                        <Music2 size={15} className="text-white/80" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate text-sm font-medium',
                          active ? 'text-accent' : 'text-slate-100',
                        )}
                      >
                        {t.title}
                      </span>
                      <span className="block truncate text-[11px] text-slate-400">
                        {t.artist}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-slate-500">
                      {formatTime(t.durationSec)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="px-4 py-2.5 border-t border-white/10 text-[10px] leading-relaxed text-slate-500">
            Demo player shell — playback is simulated and no audio files are
            streamed.
          </p>
        </aside>
      </div>
    </div>
  );
}

/** A clickable progress / seek bar. */
function SeekBar({
  progress,
  onSeek,
}: {
  progress: number;
  onSeek: (fraction: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pct = Math.min(100, Math.max(0, progress * 100));

  const handlePointer = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    onSeek((clientX - rect.left) / rect.width);
  };

  return (
    <div
      ref={ref}
      onClick={(e) => handlePointer(e.clientX)}
      className="group relative h-2 w-full cursor-pointer rounded-full bg-white/10"
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-accent"
        style={{ width: `${pct}%` }}
      />
      <div
        className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow opacity-0 transition-opacity group-hover:opacity-100"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

/** A small square toggle button used for shuffle / repeat. */
function IconToggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'relative grid h-9 w-9 place-items-center rounded-full transition-colors active:scale-95',
        active
          ? 'text-accent bg-accent/15'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/10',
      )}
    >
      {children}
      {active && (
        <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-accent" />
      )}
    </button>
  );
}

/**
 * Scoped keyframes for the visualizer bars and the volume slider fill.
 * Kept inline so this app stays self-contained (no edits to globals.css).
 */
function VisualizerStyles() {
  return (
    <style>{`
      @keyframes media-bar-pulse {
        0%, 100% { height: 18%; opacity: 0.55; }
        50% { height: 100%; opacity: 1; }
      }
      .media-bar {
        height: 100%;
        animation-name: media-bar-pulse;
        animation-timing-function: ease-in-out;
        animation-iteration-count: infinite;
        will-change: height;
      }
      .media-range {
        -webkit-appearance: none;
        appearance: none;
        height: 6px;
        border-radius: 9999px;
        background: linear-gradient(
          to right,
          rgb(var(--accent)) 0%,
          rgb(var(--accent)) var(--fill, 0%),
          rgb(255 255 255 / 0.12) var(--fill, 0%),
          rgb(255 255 255 / 0.12) 100%
        );
        cursor: pointer;
        outline: none;
      }
      .media-range::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        height: 14px;
        width: 14px;
        border-radius: 9999px;
        background: #fff;
        box-shadow: 0 1px 4px rgb(0 0 0 / 0.4);
        cursor: pointer;
      }
      .media-range::-moz-range-thumb {
        height: 14px;
        width: 14px;
        border: none;
        border-radius: 9999px;
        background: #fff;
        box-shadow: 0 1px 4px rgb(0 0 0 / 0.4);
        cursor: pointer;
      }
    `}</style>
  );
}
