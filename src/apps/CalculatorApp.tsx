import { useCallback, useEffect, useState } from 'react';
import { Delete } from 'lucide-react';
import { cn } from '../os/utils';

type Operator = '+' | '-' | '*' | '/';

interface CalcState {
  /** The value currently being typed/shown. */
  display: string;
  /** The stored left-hand operand (as a number), or null when none. */
  previous: number | null;
  /** Pending operator awaiting a right-hand operand. */
  operator: Operator | null;
  /** True right after an operator or equals — next digit starts a fresh entry. */
  overwrite: boolean;
  /** Error latch (e.g. divide by zero). Cleared on AC. */
  error: boolean;
}

const INITIAL: CalcState = {
  display: '0',
  previous: null,
  operator: null,
  overwrite: false,
  error: false,
};

const OPERATOR_SYMBOL: Record<Operator, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

/** Round to ~10 significant digits to suppress float noise, then trim zeros. */
function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return 'Error';
  if (n === 0) return '0';
  // toPrecision avoids long binary-float tails; parseFloat strips trailing zeros.
  const rounded = parseFloat(n.toPrecision(10));
  if (!Number.isFinite(rounded)) return 'Error';
  // Avoid exponential noise for reasonable magnitudes.
  if (Math.abs(rounded) >= 1e-7 && Math.abs(rounded) < 1e15) {
    return String(rounded);
  }
  return rounded.toExponential(6).replace(/\.?0+e/, 'e');
}

function compute(a: number, b: number, op: Operator): number {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      return b === 0 ? Number.NaN : a / b;
    default:
      return b;
  }
}

export default function CalculatorApp() {
  const [state, setState] = useState<CalcState>(INITIAL);

  const inputDigit = useCallback((digit: string) => {
    setState((s) => {
      if (s.error) return s;
      if (s.overwrite) {
        return { ...s, display: digit === '0' ? '0' : digit, overwrite: false };
      }
      if (s.display === '0') {
        return { ...s, display: digit };
      }
      if (s.display.replace(/[^0-9]/g, '').length >= 15) return s;
      return { ...s, display: s.display + digit };
    });
  }, []);

  const inputDecimal = useCallback(() => {
    setState((s) => {
      if (s.error) return s;
      if (s.overwrite) {
        return { ...s, display: '0.', overwrite: false };
      }
      if (s.display.includes('.')) return s;
      return { ...s, display: s.display + '.' };
    });
  }, []);

  const clearAll = useCallback(() => {
    setState(INITIAL);
  }, []);

  /** Clear current entry only (C). Falls back to full reset when nothing typed. */
  const clearEntry = useCallback(() => {
    setState((s) => {
      if (s.error) return INITIAL;
      if (s.overwrite || s.display === '0') return INITIAL;
      return { ...s, display: '0', overwrite: false };
    });
  }, []);

  const backspace = useCallback(() => {
    setState((s) => {
      if (s.error || s.overwrite) return s;
      const next = s.display.length > 1 ? s.display.slice(0, -1) : '0';
      return { ...s, display: next === '-' || next === '-0' ? '0' : next };
    });
  }, []);

  const toggleSign = useCallback(() => {
    setState((s) => {
      if (s.error || s.display === '0') return s;
      const n = parseFloat(s.display) * -1;
      return { ...s, display: formatNumber(n) };
    });
  }, []);

  const percent = useCallback(() => {
    setState((s) => {
      if (s.error) return s;
      const current = parseFloat(s.display);
      // Percent of the pending operand when chaining, else plain /100.
      const base =
        s.previous !== null && (s.operator === '+' || s.operator === '-')
          ? (s.previous * current) / 100
          : current / 100;
      return { ...s, display: formatNumber(base), overwrite: false };
    });
  }, []);

  const chooseOperator = useCallback((op: Operator) => {
    setState((s) => {
      if (s.error) return s;
      const current = parseFloat(s.display);

      // Just replace the operator if we're waiting for the next operand.
      if (s.overwrite && s.previous !== null) {
        return { ...s, operator: op };
      }

      // First operator: stash the current value.
      if (s.previous === null) {
        return {
          ...s,
          previous: current,
          operator: op,
          overwrite: true,
        };
      }

      // Chained operator: compute the pending result first.
      if (s.operator) {
        const result = compute(s.previous, current, s.operator);
        if (!Number.isFinite(result)) {
          return { ...INITIAL, display: 'Error', error: true };
        }
        return {
          display: formatNumber(result),
          previous: result,
          operator: op,
          overwrite: true,
          error: false,
        };
      }

      return { ...s, previous: current, operator: op, overwrite: true };
    });
  }, []);

  const equals = useCallback(() => {
    setState((s) => {
      if (s.error || s.operator === null || s.previous === null) return s;
      const current = parseFloat(s.display);
      const result = compute(s.previous, current, s.operator);
      if (!Number.isFinite(result)) {
        return { ...INITIAL, display: 'Error', error: true };
      }
      return {
        display: formatNumber(result),
        previous: null,
        operator: null,
        overwrite: true,
        error: false,
      };
    });
  }, []);

  // Keyboard support while mounted.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const { key } = e;
      if (key >= '0' && key <= '9') {
        inputDigit(key);
      } else if (key === '.') {
        inputDecimal();
      } else if (key === '+' || key === '-' || key === '*' || key === '/') {
        e.preventDefault();
        chooseOperator(key);
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        equals();
      } else if (key === 'Backspace') {
        backspace();
      } else if (key === 'Escape') {
        clearAll();
      } else if (key === '%') {
        percent();
      } else {
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    inputDigit,
    inputDecimal,
    chooseOperator,
    equals,
    backspace,
    clearAll,
    percent,
  ]);

  const expression =
    state.previous !== null && state.operator
      ? `${formatNumber(state.previous)} ${OPERATOR_SYMBOL[state.operator]}`
      : ' ';

  const opBtn =
    'flex items-center justify-center rounded-xl bg-accent text-white font-semibold text-xl ' +
    'shadow-lg shadow-accent/20 transition-all hover:brightness-110 active:scale-[0.96] ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60';
  const numBtn =
    'flex items-center justify-center rounded-xl bg-white/5 text-slate-100 font-medium text-xl ' +
    'border border-white/10 transition-all hover:bg-white/10 active:scale-[0.96] ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60';
  const fnBtn =
    'flex items-center justify-center rounded-xl bg-white/10 text-slate-200 font-medium text-lg ' +
    'border border-white/10 transition-all hover:bg-white/20 active:scale-[0.96] ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60';

  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-slate-100 bg-slate-950/40">
      {/* Display */}
      <div className="shrink-0 px-5 pt-5 pb-4 glass-strong border-b border-white/10">
        <div className="h-5 text-right text-sm text-slate-400 font-mono tabular-nums truncate">
          {state.operator && state.overwrite ? expression : ' '}
        </div>
        <div
          className={cn(
            'text-right font-mono tabular-nums leading-none truncate',
            state.error ? 'text-rose-400' : 'text-slate-50',
            state.display.length > 9 ? 'text-3xl' : 'text-5xl',
          )}
          aria-live="polite"
        >
          {state.display}
        </div>
      </div>

      {/* Keypad */}
      <div className="flex-1 grid grid-cols-4 grid-rows-5 gap-2 p-3 min-h-0">
        <button type="button" className={fnBtn} onClick={clearAll}>
          AC
        </button>
        <button type="button" className={fnBtn} onClick={clearEntry}>
          C
        </button>
        <button
          type="button"
          className={fnBtn}
          onClick={backspace}
          aria-label="Backspace"
        >
          <Delete size={20} />
        </button>
        <button
          type="button"
          className={opBtn}
          onClick={() => chooseOperator('/')}
          aria-label="Divide"
        >
          ÷
        </button>

        <button type="button" className={numBtn} onClick={() => inputDigit('7')}>
          7
        </button>
        <button type="button" className={numBtn} onClick={() => inputDigit('8')}>
          8
        </button>
        <button type="button" className={numBtn} onClick={() => inputDigit('9')}>
          9
        </button>
        <button
          type="button"
          className={opBtn}
          onClick={() => chooseOperator('*')}
          aria-label="Multiply"
        >
          ×
        </button>

        <button type="button" className={numBtn} onClick={() => inputDigit('4')}>
          4
        </button>
        <button type="button" className={numBtn} onClick={() => inputDigit('5')}>
          5
        </button>
        <button type="button" className={numBtn} onClick={() => inputDigit('6')}>
          6
        </button>
        <button
          type="button"
          className={opBtn}
          onClick={() => chooseOperator('-')}
          aria-label="Subtract"
        >
          −
        </button>

        <button type="button" className={numBtn} onClick={() => inputDigit('1')}>
          1
        </button>
        <button type="button" className={numBtn} onClick={() => inputDigit('2')}>
          2
        </button>
        <button type="button" className={numBtn} onClick={() => inputDigit('3')}>
          3
        </button>
        <button
          type="button"
          className={opBtn}
          onClick={() => chooseOperator('+')}
          aria-label="Add"
        >
          +
        </button>

        <button
          type="button"
          className={fnBtn}
          onClick={toggleSign}
          aria-label="Toggle sign"
        >
          ±
        </button>
        <button type="button" className={numBtn} onClick={() => inputDigit('0')}>
          0
        </button>
        <button
          type="button"
          className={fnBtn}
          onClick={percent}
          aria-label="Percent"
        >
          %
        </button>
        <button
          type="button"
          className={opBtn}
          onClick={equals}
          aria-label="Equals"
        >
          =
        </button>
      </div>
    </div>
  );
}
