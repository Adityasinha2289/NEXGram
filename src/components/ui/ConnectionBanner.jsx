import { CloudOff, WifiOff } from 'lucide-react';
import { useConnection } from '../../hooks/useConnection';

/**
 * Tells the user when what they are reading is not current.
 *
 * The product's whole claim is that its numbers are traceable, so showing
 * cached intelligence without saying so would undercut it more than a brief
 * banner ever costs.
 */
export function ConnectionBanner() {
  const { isOnline, isStale } = useConnection();

  if (isOnline && !isStale) return null;

  const offline = !isOnline;
  const Icon = offline ? WifiOff : CloudOff;

  return (
    <div
      role="status"
      className={`flex items-center gap-2 px-4 py-2 text-xs font-medium ${
        offline ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-text-secondary'
      }`}
    >
      <Icon size={14} className="flex-shrink-0" />
      <span>
        {offline
          ? 'Internet nahi hai. Purana data dikha rahe hain, naye order abhi nahi ja payenge.'
          : 'Network slow hai. Yeh numbers thode purane ho sakte hain.'}
      </span>
    </div>
  );
}
