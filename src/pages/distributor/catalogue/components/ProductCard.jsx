import { Edit2, Trash2, Box, Truck, Layers } from 'lucide-react';
import { Card, CardContent } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';

export function ProductCard({ product, onEdit, onRemove }) {
  // The API speaks snake_case; the badge needs a label and a colour.
  const STATUS = {
    available: { label: 'Available', variant: 'success' },
    low_stock: { label: 'Low Stock', variant: 'warning' },
    out_of_stock: { label: 'Out of Stock', variant: 'danger' },
  };
  const status = STATUS[product.stockStatus] || { label: product.stockStatus || 'Unknown', variant: 'neutral' };

  return (
    <Card className="border-border">
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-text-primary text-base leading-tight">{product.name}</h3>
            <p className="text-sm text-text-muted">{product.category}</p>
          </div>
          <Badge variant={status.variant} className="ml-2 flex-shrink-0">
            {status.label}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">₹{product.price}</span>
          <span className="text-sm text-text-muted">per pack</span>
        </div>

        <div className="flex gap-4 flex-wrap text-sm text-text-muted bg-surface-muted p-2 rounded-md">
          <div className="flex items-center gap-1">
            <Layers size={14} />
            <span className="font-semibold text-text-primary">{product.availableStock}</span>
            <span>in stock</span>
          </div>
          <div className="flex items-center gap-1">
            <Box size={14} />
            <span>MOQ: {product.minimumOrderQuantity}</span>
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
