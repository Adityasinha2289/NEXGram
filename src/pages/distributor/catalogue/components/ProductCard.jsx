import { Edit2, Trash2, Box, Truck } from 'lucide-react';
import { Card, CardContent } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';

export function ProductCard({ product, onEdit, onRemove }) {
  const getStatusVariant = (status) => {
    switch (status) {
      case 'Available': return 'success';
      case 'Low Stock': return 'warning';
      case 'Out of Stock': return 'danger';
      default: return 'neutral';
    }
  };

  return (
    <Card className="border-border">
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-text-primary text-md leading-tight">{product.name}</h3>
            <p className="text-sm text-text-muted">{product.category}</p>
          </div>
          <Badge variant={getStatusVariant(product.stockStatus)} className="ml-2 flex-shrink-0">
            {product.stockStatus}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">₹{product.price}</span>
          <span className="text-sm text-text-muted">/ {product.unit}</span>
        </div>

        <div className="flex gap-4 text-sm text-text-muted bg-surface-muted p-2 rounded-md">
          <div className="flex items-center gap-1">
            <Box size={14} />
            <span>MOQ: {product.minimumOrderQuantity} {product.unit}s</span>
          </div>
          <div className="flex items-center gap-1">
            <Truck size={14} />
            <span>{product.deliveryTime}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-2 pt-3 border-t border-border">
          <button 
            onClick={() => onEdit(product)}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-text-primary py-2 hover:bg-surface-muted rounded-md transition-colors"
          >
            <Edit2 size={16} /> Edit
          </button>
          <div className="w-px bg-border my-2"></div>
          <button 
            onClick={() => onRemove(product.id)}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-danger py-2 hover:bg-danger/10 rounded-md transition-colors"
          >
            <Trash2 size={16} /> Remove
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
