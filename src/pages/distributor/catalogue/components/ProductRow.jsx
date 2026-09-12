import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';

const rupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

// The API speaks snake_case; the row needs a label and a colour.
const STOCK = {
  available: { label: 'Available', variant: 'success' },
  low_stock: { label: 'Low stock', variant: 'warning' },
  out_of_stock: { label: 'Stock khatam', variant: 'danger' },
};

/**
 * Column widths, shared with the header row so the two line up. Declared once
 * because a table whose header does not sit over its own column is worse than
 * a table with no header at all.
 */
const COL = {
  price: 'w-20 text-right',
  stock: 'w-16 text-right',
  moq: 'w-14 text-right',
  actions: 'w-[76px]',
};

/** The column header, shown only where the row lays out as columns. */
export function ProductRowHeader() {
  return (
    <div className="hidden items-center gap-4 bg-surface-muted px-4 py-2 sm:flex">
      <span className="eyebrow flex-1">Product</span>
      <span className={`eyebrow ${COL.price}`}>Price</span>
      <span className={`eyebrow ${COL.stock}`}>Stock</span>
      <span className={`eyebrow ${COL.moq}`}>MOQ</span>
      <span className={COL.actions} />
    </div>
  );
}

export function ProductRow({ product, onEdit, onRemove }) {
  const [confirming, setConfirming] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const status = STOCK[product.stockStatus]
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

      {/* The labels caption the figures on a phone and are replaced by the
          column header from 640px, where repeating them on every row is noise. */}
      <dl className="flex flex-shrink-0 gap-5 sm:contents">
        <div className={COL.price}>
          <dt className="eyebrow sm:hidden">Price</dt>
          <dd className="num text-sm font-semibold text-text-primary">{rupees(product.price)}</dd>
        </div>
        <div className={COL.stock}>
          <dt className="eyebrow sm:hidden">Stock</dt>
          <dd className="num text-sm font-semibold text-text-primary">{product.availableStock}</dd>
        </div>
        <div className={COL.moq}>
          <dt className="eyebrow sm:hidden">MOQ</dt>
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
      <div className="flex flex-shrink-0 items-center justify-end gap-1">
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
          <div className={`flex justify-end gap-1 ${COL.actions}`}>
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
          </div>
        )}
      </div>
    </div>
  );
}
