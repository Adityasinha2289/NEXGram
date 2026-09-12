import { PackageOpen } from 'lucide-react';
import { Button } from './Button';

/**
 * Nothing to show, said quietly.
 *
 * The previous version filled the screen with a 48px icon inside a circle, which
 * gave "no data yet" more visual weight than the data would have had. An empty
 * state should be legible and then get out of the way.
 */
export function EmptyState({
  icon: Icon = PackageOpen,
  title = 'Yahan kuch nahi hai',
  description = 'Abhi data available nahi hai.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`panel flex flex-col items-center justify-center px-6 py-10 text-center ${className}`}>
      <span className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-surface-muted text-text-muted">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      <p className="mt-1 max-w-[38ch] text-sm leading-relaxed text-text-muted">{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
