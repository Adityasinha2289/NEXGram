import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';

const rupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

// The API speaks snake_case; the row needs a label and a colour.
const STATUS = {
  available: { label: 'Available', variant: 'success' },
  low_stock: { label: 'Low stock', variant: 'warning' },
  out_of_stock: { label: 'Stock khatam', variant: 'danger' },
};

export function ProductRow({ product, onEdit, onRemove }) {
  const [confirming, setConfirming] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const status = STATUS[product.stockStatus]
    || { label: product.stockStatus || 'Unknown', variant: 'neutral' };

  const remove = async () => {
    setIsRemoving(true);
    try {
      await onRemove(product.id);
    } finally {
      setIsRemoving(false);
      setConfirming(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold leading-tight text-text-primary">{product.name}</h3>
          <Badge variant={status.variant} dot>{status.label}</Badge>
        </div>
        <p className="num mt-0.5 truncate text-2xs text-text-muted">
          {product.category}
          {product.deliveryTime ? ` · ${product.deliveryTime}` : ''}
        </p>
      </div>

      <dl className="flex flex-shrink-0 gap-5 sm:gap-6">
        <div>
          <dt className="eyebrow">Price</dt>
          <dd className="num text-sm font-semibold text-text-primary">{rupees(product.price)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Stock</dt>
          <dd className="num text-sm font-semibold text-text-primary">{product.availableStock}</dd>
        </div>
        <div>
          <dt className="eyebrow">MOQ</dt>
          <dd className="num text-sm font-semibold text-text-primary">
            {product.minimumOrderQuantity}
          </dd>
        </div>
      </dl>

      {/*
       * Confirmed in place rather than through window.confirm(): a native
       * dialog blocks the whole page, cannot say which product it means, and
       * looks like it belongs to the browser rather than to the app.
       */}
      <div className="flex flex-shrink-0 items-center gap-1">
        {confirming ? (
          <>
            <span className="mr-1 text-2xs text-text-muted">Pakka?</span>
            <button
              type="button"
              onClick={remove}
              disabled={isRemoving}
              className="rounded-md bg-danger px-2.5 py-1.5 text-2xs font-semibold text-text-inverse transition-colors hover:bg-danger/90 disabled:opacity-60"
            >
              Haan, hatayein
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md px-2.5 py-1.5 text-2xs font-semibold text-text-muted transition-colors hover:bg-surface-muted"
            >
              Rehne dein
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onEdit(product)}
              aria-label={`${product.name} edit karein`}
              className="grid h-8 w-8 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary"
            >
              <Pencil size={15} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`${product.name} catalogue se hatayein`}
              className="grid h-8 w-8 place-items-center rounded-md text-text-muted transition-colors hover:bg-danger-bg hover:text-danger"
            >
              <Trash2 size={15} strokeWidth={2} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
