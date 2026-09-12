import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ShoppingCart, Store } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { useBasket } from '../../../../context/useBasket';

const formatRupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

/**
 * Turns a stock plan into real orders.
 *
 * A plan is assembled from whichever local supplier is cheapest per product, so
 * it routinely spans several distributors. The backend enforces one distributor
 * per order (MOQ, stock locking and price snapshotting are all per-supplier), so
 * the pack is split into one order per supplier and the user is told that up
 * front rather than discovering it after a failure.
 */
export function PackOrderAction({ packItems, onOrdered }) {
  const navigate = useNavigate();
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState(null);

  const groups = useMemo(() => {
    const bySupplier = new Map();
    packItems.forEach((item) => {
      if (!item.distributorId) return;
      const group = bySupplier.get(item.distributorId) || {
        distributorId: item.distributorId,
        distributorName: item.distributorName || 'Supplier',
        items: [],
        total: 0,
      };
      group.items.push(item);
      group.total += item.lineTotal ?? item.price ?? 0;
      bySupplier.set(item.distributorId, group);
    });
    return [...bySupplier.values()];
  }, [packItems]);

  const { addItem } = useBasket();

  const placeOrders = () => {
    setIsPlacing(true);
    setError(null);
    try {
      for (const group of groups) {
        group.items.forEach(item => {
          const productForBasket = {
            id: item.id, // Catalogue item ID
            name: item.name,
            variant: item.variant || item.unit,
            category: item.category || 'Uncategorised',
            price: item.price,
            minimumOrderQuantity: item.minimumOrderQuantity || 1,
            availableStock: item.availableStock || 999, // default if not provided
            stockStatus: item.availability || 'available',
            deliveryTime: item.deliveryTime
          };
          
          addItem(productForBasket, group.distributorId, group.distributorName);
        });
      }

      onOrdered?.();
      navigate('/retailer/procurement');
    } catch (err) {
      setError(err.message || 'Basket mein add nahi hua. Dobara try karein.');
    } finally {
      setIsPlacing(false);
    }
  };

  if (groups.length === 0) return null;

  return (
    <Card elevated clip>
      <div className="border-b border-border bg-primary-subtle px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">Basket mein daalein</h3>
        <p className="mt-0.5 text-2xs leading-snug text-text-muted">
          {groups.length === 1
            ? 'Yeh pack ek hi supplier se aa raha hai.'
            : `Yeh pack ${groups.length} suppliers se aa raha hai.`}
        </p>
      </div>

      <ul className="divide-y divide-border">
        {groups.map((group) => (
          <li key={group.distributorId} className="flex items-center gap-3 px-4 py-2.5">
            <Store size={14} className="flex-shrink-0 text-text-muted" strokeWidth={2} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-text-primary">
                {group.distributorName}
              </span>
              <span className="num block text-2xs text-text-muted">
                {group.items.length} product{group.items.length === 1 ? '' : 's'}
              </span>
            </span>
            <span className="num flex-shrink-0 text-sm font-semibold text-text-primary">
              {formatRupees(group.total)}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 border-t border-border p-3">
        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-2xs leading-snug text-danger"
          >
            <AlertCircle size={13} className="mt-px flex-shrink-0" strokeWidth={2.25} />
            {error}
          </p>
        )}
        <Button fullWidth icon={ShoppingCart} isLoading={isPlacing} onClick={placeOrders}>
          Basket mein daalein
        </Button>
      </div>
    </Card>
  );
}
