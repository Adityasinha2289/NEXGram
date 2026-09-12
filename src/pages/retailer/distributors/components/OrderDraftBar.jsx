import { useState } from 'react';
import { AlertCircle, ShoppingCart } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';

const rupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

/**
 * The draft order, and the one place it becomes real.
 *
 * Placing an order used to happen on a single tap of a summary strip, with no
 * review and no way back. Sending stock requests to a supplier is not something
 * to do by accident, so the strip opens a summary and the order is placed from
 * there.
 */
export function OrderDraftBar({ lines, total, distributorName, isPlacing, error, onPlace }) {
  const [isReviewing, setIsReviewing] = useState(false);

  if (lines.length === 0) return null;

  const place = async () => {
    const ok = await onPlace();
    if (ok) setIsReviewing(false);
  };

  return (
    <>
      <div className="sticky bottom-[calc(var(--bottom-nav-height)+12px)] z-10 md:bottom-4">
        <div className="panel flex items-center gap-3 p-3 shadow-lg">
          <div className="min-w-0 flex-1">
            <p className="num text-sm font-semibold text-text-primary">
              {lines.length} item{lines.length === 1 ? '' : 's'} &middot; {rupees(total)}
            </p>
            <p className="truncate text-2xs text-text-muted">{distributorName} se</p>
          </div>
          <Button icon={ShoppingCart} onClick={() => setIsReviewing(true)}>
            Order dekhein
          </Button>
        </div>
      </div>

      {isReviewing && (
        <Modal
          title="Order confirm karein"
          onClose={() => setIsReviewing(false)}
          footer={
            <div className="flex flex-col gap-2">
              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-2xs leading-snug text-danger"
                >
                  <AlertCircle size={13} className="mt-px flex-shrink-0" strokeWidth={2.25} />
                  {error}
                </p>
              )}
              <Button fullWidth isLoading={isPlacing} onClick={place}>
                Haan, order bhejein
              </Button>
            </div>
          }
        >
          <div className="px-4 py-3">
            <p className="text-sm text-text-muted">
              Yeh order <span className="font-semibold text-text-primary">{distributorName}</span>{' '}
              ko jayega. Woh accept karenge tab stock reserve hoga.
            </p>
          </div>

          <ul className="divide-y divide-border border-y border-border">
            {lines.map((line) => (
              <li key={line.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {line.name}
                    {line.variant && (
                      <span className="ml-1.5 font-normal text-text-muted">{line.variant}</span>
                    )}
                  </p>
                  <p className="num mt-0.5 text-2xs text-text-muted">
                    {line.quantity} &times; {rupees(line.price)}
                  </p>
                </div>
                <span className="num flex-shrink-0 text-sm font-medium text-text-primary">
                  {rupees(line.quantity * line.price)}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-baseline justify-between gap-4 bg-surface-muted px-4 py-3">
            <span className="text-sm font-semibold text-text-primary">Total</span>
            <span className="num text-base font-bold text-text-primary">{rupees(total)}</span>
          </div>
        </Modal>
      )}
    </>
  );
}
