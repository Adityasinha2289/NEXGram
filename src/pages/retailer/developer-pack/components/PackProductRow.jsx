import { Trash2 } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';

const rupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

/**
 * One line of the stock plan.
 *
 * Was a card in a two-column grid, which meant four bordered boxes to read six
 * facts, and the boxes stretched to the tallest reason in the row. As rows they
 * share one surface, line up their money in a column, and each takes the height
 * its own content needs.
 */
export function PackProductRow({ product, onRemove }) {
  const perPack = product.price ? `${rupees(product.price)} per pack` : null;

  return (
    <div className="flex flex-col gap-2 px-4 py-3.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {product.category !== product.name && <p className="eyebrow">{product.category}</p>}
          <h4 className="mt-0.5 text-sm font-semibold leading-snug text-text-primary">
            {product.name}
            {product.variant && (
              <span className="ml-1.5 font-normal text-text-muted">{product.variant}</span>
            )}
          </h4>
          <p className="num mt-1 text-2xs text-text-muted">
            {product.suggestedQuantity} &times; {product.variant || product.unit}
            {' · MOQ '}{product.minimumOrderQuantity}
            {product.distributorName ? ` · ${product.distributorName}` : ''}
          </p>
        </div>

        <div className="flex-shrink-0 text-right">
          <p className="num text-sm font-semibold text-text-primary">
            {rupees(product.lineTotal ?? product.price)}
          </p>
          {perPack && <p className="num mt-0.5 text-2xs text-text-muted">{perPack}</p>}
        </div>
      </div>

      {product.reason && (
        <p className="text-2xs leading-snug text-text-muted">{product.reason}</p>
      )}

      <div className="flex items-center justify-between gap-3">
        {/* Only when it is not the default. The planner only ever puts items in
            the pack that a local supplier has in stock, so a green "Available"
            chip on every row said nothing and cost a line of attention each. */}
        {product.availability && product.availability !== 'Available' ? (
          <Badge variant="warning" dot>{product.availability}</Badge>
        ) : <span />}
        <button
          type="button"
          onClick={() => onRemove(product.id)}
          className="flex items-center gap-1.5 rounded-md px-2 py-2 text-2xs font-semibold text-text-muted transition-colors hover:bg-danger-bg hover:text-danger"
          aria-label={`${product.name} pack se hatayein`}
        >
          <Trash2 size={13} strokeWidth={2} /> Hatayein
        </button>
      </div>
    </div>
  );
}
