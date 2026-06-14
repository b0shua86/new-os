import { useCallback, useEffect, useRef, useState } from 'react';
import { useOS } from '../os/store';
import { BUILTIN_APPS, matchBuiltins, resolveSearch } from '../os/appRegistry';
import { cn, uid } from '../os/utils';

type LineKind = 'banner' | 'input' | 'output' | 'success' | 'error' | 'muted';

interface Line {
  id: string;
  kind: LineKind;
  text: string;
}

const PROMPT = 'promptos:~$';

const BANNER = [
  '   ___                            _    ___  ___ ',
  '  | _ \\_ _ ___ _ __  _ __ _ ___ | |  / _ \\/ __|',
  "  |  _/ '_/ _ \\ '  \\| '_ \\ _/ _ \\_| | (_) \\__ \\",
  '  |_| |_| \\___/_|_|_| .__/\\__\\___(_)  \\___/|___/',
  '                    |_|                          ',
];

const HELP: Array<[string, string]> = [
  ['help', 'show this list of commands'],
  ['apps', 'list built-in and generated apps'],
  ['open <name>', 'open an app by name'],
  ['create <name>', 'generate a brand-new app'],
  ['theme <dark|light>', 'switch the OS theme'],
  ['echo <text>', 'print text back'],
  ['date', 'show the current date and time'],
  ['about', 'about PromptOS'],
  ['clear', 'clear the screen'],
];

function line(kind: LineKind, text: string): Line {
  return { id: uid('ln'), kind, text };
}

const KIND_CLASS: Record<LineKind, string> = {
  banner: 'text-accent',
  input: 'text-slate-100',
  output: 'text-slate-300',
  success: 'text-emerald-400',
  error: 'text-rose-400',
  muted: 'text-slate-500',
};

export default function TerminalApp() {
  const openApp = useOS((s) => s.openApp);
  const openGeneratedApp = useOS((s) => s.openGeneratedApp);
  const createApp = useOS((s) => s.createApp);
  const generatedApps = useOS((s) => s.generatedApps);
  const updateSettings = useOS((s) => s.updateSettings);
  const notify = useOS((s) => s.notify);

  const [lines, setLines] = useState<Line[]>(() => [
    ...BANNER.map((b) => line('banner', b)),
    line('muted', "Welcome to PromptOS Terminal. Type 'help' to get started."),
    line('muted', ''),
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  // -1 means "current (not browsing history)". A ref because it's only read
  // across keypresses, never rendered.
  const historyIndexRef = useRef(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const push = useCallback((...newLines: Line[]) => {
    setLines((prev) => [...prev, ...newLines]);
  }, []);

  // Auto-scroll to the newest output whenever lines change.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  // Focus the input on mount.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const printApps = useCallback(() => {
    const out: Line[] = [line('muted', 'Built-in apps')];
    for (const app of BUILTIN_APPS) {
      out.push(line('output', `  ${app.id.padEnd(14)} — ${app.name}`));
    }
    out.push(line('muted', ''));
    if (generatedApps.length === 0) {
      out.push(line('muted', "No generated apps yet — try 'create <name>'."));
    } else {
      out.push(line('muted', 'Generated apps'));
      for (const g of generatedApps) {
        out.push(line('output', `  ${g.name}`));
      }
    }
    push(...out);
  }, [generatedApps, push]);

  const runCommand = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      // Echo the command with the prompt prefix.
      push(line('input', `${PROMPT} ${trimmed}`));
      if (!trimmed) return;

      const [cmdRaw, ...rest] = trimmed.split(/\s+/);
      const cmd = cmdRaw.toLowerCase();
      const arg = rest.join(' ');

      switch (cmd) {
        case 'help': {
          const out: Line[] = [line('muted', 'Available commands')];
          for (const [name, desc] of HELP) {
            out.push(line('output', `  ${name.padEnd(20)} ${desc}`));
          }
          push(...out);
          break;
        }

        case 'apps': {
          printApps();
          break;
        }

        case 'open': {
          if (!arg) {
            push(line('error', 'usage: open <name>'));
            break;
          }
          const builtin = matchBuiltins(arg)[0];
          if (builtin) {
            openApp(builtin.id);
            push(line('success', `Opening ${builtin.name}…`));
            break;
          }
          const q = arg.toLowerCase();
          const gen =
            generatedApps.find((g) => g.name.toLowerCase() === q) ??
            generatedApps.find((g) => g.name.toLowerCase().includes(q));
          if (gen) {
            openGeneratedApp(gen.id);
            push(line('success', `Opening ${gen.name}…`));
            break;
          }
          push(line('error', `no app named "${arg}"`));
          break;
        }

        case 'create': {
          if (!arg) {
            push(line('error', 'usage: create <name>'));
            break;
          }
          const app = createApp(arg);
          push(line('success', `Created "${app.name}" and opened it.`));
          break;
        }

        case 'clear': {
          setLines([]);
          break;
        }

        case 'about': {
          push(
            line('banner', 'PromptOS v1.0.0'),
            line('output', 'A prompt-native browser desktop.'),
            line('output', 'Search for any app and PromptOS builds it on the fly.'),
            line('muted', "Tip: try 'create habit tracker' or 'open paint'."),
          );
          break;
        }

        case 'theme': {
          const mode = arg.toLowerCase();
          if (mode === 'dark' || mode === 'light') {
            updateSettings({ theme: mode });
            push(line('success', `Theme set to ${mode}.`));
          } else {
            push(line('error', 'usage: theme <dark|light>'));
          }
          break;
        }

        case 'echo': {
          push(line('output', arg));
          break;
        }

        case 'date': {
          push(line('output', new Date().toString()));
          break;
        }

        case 'sudo': {
          // A little easter egg, and a useful hint.
          push(line('muted', "permission denied: you are already root in your own OS :)"));
          break;
        }

        default: {
          // Suggest the closest match so unknown words are still helpful.
          const guess = resolveSearch(trimmed, generatedApps);
          if (guess.kind === 'builtin') {
            push(
              line('error', `command not found: ${cmd} (try 'help')`),
              line('muted', `did you mean: open ${guess.app.id}?`),
            );
          } else {
            push(line('error', `command not found: ${cmd} (try 'help')`));
          }
          break;
        }
      }
    },
    [
      push,
      printApps,
      openApp,
      openGeneratedApp,
      createApp,
      updateSettings,
      generatedApps,
    ],
  );

  const submit = useCallback(() => {
    const value = input;
    if (value.trim()) {
      setHistory((prev) => [...prev, value.trim()]);
    }
    historyIndexRef.current = -1;
    setInput('');
    runCommand(value);
  }, [input, runCommand]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const idx = historyIndexRef.current;
      const next = idx === -1 ? history.length - 1 : Math.max(0, idx - 1);
      setInput(history[next] ?? '');
      historyIndexRef.current = next;
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (history.length === 0) return;
      const idx = historyIndexRef.current;
      if (idx === -1) return;
      const next = idx + 1;
      if (next >= history.length) {
        setInput('');
        historyIndexRef.current = -1;
        return;
      }
      setInput(history[next] ?? '');
      historyIndexRef.current = next;
      return;
    }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
      notify('Terminal cleared', 'info');
    }
  };

  return (
    <div
      className="h-full w-full flex flex-col overflow-hidden bg-slate-950/70 text-slate-200 font-mono text-[13px]"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Output log */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto scroll-thin px-4 py-3">
        {lines.map((l) => (
          <pre
            key={l.id}
            className={cn('whitespace-pre-wrap break-words leading-relaxed', KIND_CLASS[l.kind])}
          >
            {l.text === '' ? ' ' : l.text}
          </pre>
        ))}
      </div>

      {/* Input line */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-t border-white/10 bg-black/30">
        <span className="text-accent select-none shrink-0">{PROMPT}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Terminal input"
          className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-600 caret-accent"
          placeholder="type a command…"
        />
      </div>
    </div>
  );
}
