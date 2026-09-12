import { useNavigate } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';

/**
 * A reminder of what the user is shopping for, and a way back to it.
 */
export function PackContextCard({ packItems = [] }) {
  const navigate = useNavigate();

  if (packItems.length === 0) return null;

  const names = packItems.slice(0, 3).map((item) => item.name).join(', ');
  const remaining = packItems.length - 3;

  return (
    <button
      type="button"
      onClick={() => navigate('/retailer/developer-pack')}
      className="flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-primary-subtle px-4 py-3 text-left transition-colors hover:bg-primary-light"
    >
      <Package size={17} className="flex-shrink-0 text-primary" strokeWidth={2} />
      <span className="min-w-0 flex-1">
        <span className="num block text-sm font-semibold text-text-primary">
          Aapke pack mein {packItems.length} product{packItems.length === 1 ? '' : 's'}
        </span>
        <span className="block truncate text-2xs text-text-muted">
          {names}{remaining > 0 ? ` +${remaining} aur` : ''}
        </span>
      </span>
      <ChevronRight size={16} className="flex-shrink-0 text-primary" strokeWidth={2.25} />
    </button>
  );
}
