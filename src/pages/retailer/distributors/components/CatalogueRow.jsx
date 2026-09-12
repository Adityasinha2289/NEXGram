import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { QuantityStepper } from '../../../../components/ui/QuantityStepper';

const rupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

/**
 * The API returns snake_case stock states. The old card switched on
 * "Available" / "Out of Stock" title case, so every badge fell through to
 * neutral and the out-of-stock guard on the add button never fired — an item
 * with no stock could be added to an order.
 */
const STOCK = {
  available: { label: 'Available', variant: 'success', orderable: true },
  low_stock: { label: 'Low stock', variant: 'warning', orderable: true },
  out_of_stock: { label: 'Stock khatam', variant: 'danger', orderable: false },
};

export function CatalogueRow({ product, quantity, onAdd, onChangeQuantity, onRemove }) {
  const stock = STOCK[product.stockStatus] || { label: 'Unknown', variant: 'neutral', orderable: false };
  const inOrder = quantity > 0;

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold leading-tight text-text-primary">
            {product.name}
            {product.variant && (
              <span className="ml-1.5 font-normal text-text-muted">{product.variant}</span>
            )}
          </h3>
          <Badge variant={stock.variant} dot>{stock.label}</Badge>
        </div>
        <p className="num mt-1 text-2xs text-text-muted">
          {rupees(product.price)} per pack &middot; MOQ {product.minimumOrderQuantity} &middot;{' '}
          {product.availableStock} in stock
          {product.deliveryTime ? ` · ${product.deliveryTime}` : ''}
        </p>
      </div>

      {/* Right-aligned on a phone too, where the row is a column: a
          content-width control reads as an action, a full-bleed one reads as
          another band of the row. */}
      <div className="flex flex-shrink-0 items-center justify-end gap-3">
      {!stock.orderable ? (
        <p className="text-2xs text-text-muted">Abhi order nahi kar sakte</p>
      ) : inOrder ? (
        <>
          <QuantityStepper
            value={quantity}
            min={product.minimumOrderQuantity}
            max={product.availableStock}
            label={product.name}
            onChange={(next) => onChangeQuantity(product.id, next)}
          />
          <span className="num w-20 text-right text-sm font-semibold text-text-primary">
            {rupees(quantity * product.price)}
          </span>
          <button
            type="button"
            onClick={() => onRemove(product.id)}
            className="rounded-md px-2 py-2 text-2xs font-semibold text-text-muted transition-colors hover:bg-danger-bg hover:text-danger"
          >
            Hatayein
          </button>
        </>
      ) : (
        <Button variant="outline" size="sm" onClick={() => onAdd(product)}>
          Order mein daalein
        </Button>
      )}
      </div>
    </div>
  );
}
