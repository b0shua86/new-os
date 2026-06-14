import { CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { useOS } from './store';
import { cn } from './utils';

const ICONS = {
  info: Info,
  success: CheckCircle2,
  error: XCircle,
} as const;

const TONE = {
  info: 'text-sky-300',
  success: 'text-emerald-300',
  error: 'text-rose-300',
} as const;

/** Stacked toast notifications in the top-right corner. */
export function Notifications() {
  const notifications = useOS((s) => s.notifications);
  const dismiss = useOS((s) => s.dismissNotification);

  return (
    <div className="fixed top-4 right-4 z-[8000] flex flex-col gap-2 w-[min(90vw,320px)] pointer-events-none">
      {notifications.map((t) => {
        const Icon = ICONS[t.type];
        return (
          <div
            key={t.id}
            className="pointer-events-auto glass-strong rounded-xl shadow-2xl px-3.5 py-3 flex items-start gap-2.5 animate-toast-in"
          >
            <Icon size={18} className={cn('mt-0.5 shrink-0', TONE[t.type])} />
            <p className="text-sm text-slate-100 flex-1">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-slate-400 hover:text-slate-200 shrink-0"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
