import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../os/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** A centered glass modal with a backdrop. Closes on Escape / backdrop click. */
export function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onMouseDown={onClose}
    >
      <div
        className={cn(
          'glass-strong text-slate-100 w-[min(90vw,460px)] rounded-2xl shadow-2xl overflow-hidden',
          className,
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <h2 className="font-semibold text-sm">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 text-slate-300"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 text-sm text-slate-200 selectable">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-white/10 flex justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>
  );
}
