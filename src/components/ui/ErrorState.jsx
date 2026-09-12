import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

/**
 * Something failed, and here is the one thing to try.
 *
 * Kept on a neutral surface with the danger colour spent only on the icon and
 * the retry control: a wall of red for a request that timed out overstates what
 * happened, and the user still has to read the sentence to know what to do.
 */
export function ErrorState({
  title = 'Kuch galat ho gaya',
  description = 'System error, kripya thodi der baad try karein.',
  onRetry,
  className = '',
}) {
  return (
    <div
      role="alert"
      className={`panel flex flex-col items-center justify-center px-6 py-10 text-center ${className}`}
    >
      <span className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-danger-bg text-danger">
        <AlertTriangle size={18} strokeWidth={2} />
      </span>
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      <p className="mt-1 max-w-[42ch] text-sm leading-relaxed text-text-muted">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Dobara try karein
        </Button>
      )}
    </div>
  );
}
