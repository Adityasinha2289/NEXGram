import { Plus, Check, Clock, Box } from 'lucide-react';
import { Card, CardContent } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';

export function CatalogueProductCard({ product, isAlreadyInPack, onAddToPack }) {
  const getAvailabilityBadge = (status) => {
    switch (status) {
      case 'Available': return 'success';
      case 'Low Stock': return 'warning';
      case 'Out of Stock': return 'danger';
      default: return 'neutral';
    }
  };

  return (
    <Card className={`border-border transition-colors shadow-sm ${isAlreadyInPack ? 'bg-primary/5 border-primary/20' : 'bg-surface'}`}>
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-2">
          <div>
            <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">{product.category}</p>
            <h4 className="font-bold text-md text-text-primary leading-tight">{product.name}</h4>
          </div>
          <Badge variant={getAvailabilityBadge(product.stockStatus)} className="flex-shrink-0 text-[10px] py-0.5">
            {product.stockStatus}
          </Badge>
        </div>

        {/* Price & Metrics */}
        <div className="flex items-end gap-2 mt-1">
          <span className="text-lg font-bold text-primary leading-none">₹{product.price}</span>
          <span className="text-xs text-text-muted mb-0.5">/ {product.unit}</span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 border-t border-border/50 pt-2 text-[11px] text-text-muted">
          <span className="flex items-center gap-1"><Box size={12}/> MOQ: {product.minimumOrderQuantity} {product.unit}</span>
          <span className="flex items-center gap-1"><Clock size={12}/> {product.deliveryTime}</span>
        </div>

        {/* Action */}
        <div className="mt-2">
          <Button 
            variant={isAlreadyInPack ? "ghost" : "outline"} 
            size="sm" 
            fullWidth 
            icon={isAlreadyInPack ? Check : Plus}
            onClick={() => !isAlreadyInPack && onAddToPack(product)}
            disabled={isAlreadyInPack || product.stockStatus === 'Out of Stock'}
            className={isAlreadyInPack ? "text-success border-success/20 bg-success/5" : ""}
          >
            {isAlreadyInPack ? "Pack mein hai" : "Pack Mein Add Karo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
