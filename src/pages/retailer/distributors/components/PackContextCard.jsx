import { Package, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PackContextCard({ packItems = [] }) {
  const navigate = useNavigate();
  
  if (packItems.length === 0) return null;

  // Show up to 3 product names joined by bullet
  const productNames = packItems.slice(0, 3).map(p => p.name).join(' • ');
  const hasMore = packItems.length > 3;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-primary/15 transition-colors" onClick={() => navigate('/retailer/developer-pack')}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-surface rounded-lg shadow-sm flex-shrink-0">
          <Package size={20} className="text-primary" />
        </div>
        <div>
          <p className="font-bold text-sm text-text-primary leading-tight">Your Developer Pack</p>
          <p className="text-xs text-text-muted mt-0.5">{packItems.length} products selected</p>
          <p className="text-xs text-text-primary mt-1 font-medium truncate max-w-[200px] sm:max-w-[300px]">
            {productNames}{hasMore ? ' ...' : ''}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <span className="text-[10px] uppercase font-bold text-primary">Pack Dekho</span>
        <div className="w-8 h-8 rounded-full bg-surface shadow-sm flex items-center justify-center text-primary">
          <ArrowRight size={16} />
        </div>
      </div>
    </div>
  );
}
