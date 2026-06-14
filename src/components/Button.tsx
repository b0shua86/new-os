import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../os/utils';

type Variant = 'primary' | 'ghost' | 'subtle' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:brightness-110 shadow-lg shadow-accent/20',
  ghost: 'bg-white/5 hover:bg-white/10 text-current border border-white/10',
  subtle: 'bg-black/10 hover:bg-black/20 text-current',
  danger: 'bg-rose-500/90 text-white hover:bg-rose-500',
};

const SIZES: Record<Size, string> = {
  sm: 'px-2.5 py-1 text-xs rounded-md',
  md: 'px-3.5 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-base rounded-xl',
};

export function Button({
  variant = 'ghost',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all',
        'disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
