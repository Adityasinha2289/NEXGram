import { Package, Trash2, Tag, Box } from 'lucide-react';
import { Card, CardContent } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';

export function PackProductCard({ product, onRemove }) {
  const getAvailabilityBadge = (availability) => {
    return availability === 'Available' ? 'success' : 'warning';
  };

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-2">
          <div>
            <p className="text-xs text-text-muted uppercase font-bold tracking-wider mb-0.5">{product.category}</p>
            <h4 className="font-bold text-lg text-text-primary leading-tight">
              {product.name} {product.variant && <span className="text-text-muted font-medium text-sm">{product.variant}</span>}
            </h4>
          </div>
          <Badge variant={getAvailabilityBadge(product.availability)} className="flex-shrink-0">
            {product.availability}
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 bg-surface-muted p-2 rounded-md border border-border/50">
          <div className="flex flex-col">
            <span className="text-[10px] text-text-muted flex items-center gap-1"><Package size={12}/> Qty</span>
            <span className="font-bold text-sm text-text-primary">{product.suggestedQuantity} &times; {product.variant || product.unit}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-text-muted flex items-center gap-1"><Tag size={12}/> Est. Price</span>
            <span className="font-bold text-sm text-primary">
              ₹{Math.round(product.lineTotal ?? product.price).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-text-muted">₹{product.price.toLocaleString('en-IN')} per pack</span>
          </div>
          <div className="col-span-2 pt-1 border-t border-border/50 mt-1 flex items-center gap-1 flex-wrap">
             <Box size={12} className="text-text-muted" />
             <span className="text-[10px] text-text-muted">MOQ: {product.minimumOrderQuantity} packs</span>
             {product.distributorName && (
               <span className="text-[10px] text-text-muted">&middot; {product.distributorName}</span>
             )}
          </div>
        </div>

        {product.reason && (
          <p className="text-xs text-text-muted border-l-2 border-primary/20 pl-2 leading-snug">
            {product.reason}
          </p>
        )}

        {/* Remove Button */}
        <div className="mt-1 flex justify-end">
          <button 
            onClick={() => onRemove(product.id)}
            className="flex items-center justify-center gap-1.5 text-xs font-medium text-danger hover:bg-danger/10 px-3 py-1.5 rounded-md transition-colors"
          >
            <Trash2 size={14} /> Remove
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
