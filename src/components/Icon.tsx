import { cn } from '../os/utils';

interface AppIconProps {
  /** Emoji glyph. */
  glyph: string;
  size?: number;
  className?: string;
  /** Render with a rounded glass tile behind the glyph. */
  tile?: boolean;
}

/**
 * Renders an app icon. Emoji are used as the icon language across the OS
 * (lucide-react is used for chrome controls). A `tile` wraps the glyph in a
 * frosted rounded square, matching dock / launcher styling.
 */
export function AppIcon({ glyph, size = 24, tile = false, className }: AppIconProps) {
  if (!tile) {
    return (
      <span style={{ fontSize: size, lineHeight: 1 }} className={cn('select-none', className)}>
        {glyph}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-xl bg-white/10 border border-white/10 shadow-inner',
        className,
      )}
      style={{ width: size * 1.7, height: size * 1.7 }}
    >
      <span style={{ fontSize: size, lineHeight: 1 }} className="select-none">
        {glyph}
      </span>
    </span>
  );
}
