import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Store } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Card, CardContent } from '../../../../components/ui/Card';
import { ordersApi } from '../../../../services/api/ordersApi';

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

  const placeOrders = async () => {
    setIsPlacing(true);
    setError(null);
    try {
      const created = [];
      for (const group of groups) {
        const order = await ordersApi.createOrder({
          distributor_id: group.distributorId,
          items: group.items.map((item) => ({
            catalogue_item_id: item.id,
            quantity: item.suggestedQuantity || item.minimumOrderQuantity || 1,
          })),
          notes: 'Developer Pack se order',
        });
        created.push(order);
      }

      onOrdered?.();
      // Several orders: send them to the list. One: straight to it.
      navigate(created.length === 1 ? `/retailer/orders/${created[0].id}` : '/retailer/orders');
    } catch (err) {
      setError(err.message || 'Order place nahi hua. Dobara try karein.');
    } finally {
      setIsPlacing(false);
    }
  };

  if (groups.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 flex flex-col gap-3">
        <h3 className="font-bold text-md text-text-primary">Order Bhejein</h3>
        <p className="text-sm text-text-muted leading-snug">
          {groups.length === 1
            ? 'Yeh pack ek supplier se aa raha hai.'
            : `Yeh pack ${groups.length} suppliers se aa raha hai, isliye ${groups.length} alag orders banenge.`}
        </p>

        <ul className="flex flex-col gap-2">
          {groups.map((group) => (
            <li
              key={group.distributorId}
              className="flex items-center justify-between gap-2 bg-surface rounded-lg p-3 border border-border"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Store size={15} className="text-text-muted flex-shrink-0" />
                <span className="min-w-0">
                  <span className="block font-semibold text-sm text-text-primary truncate">
                    {group.distributorName}
                  </span>
                  <span className="block text-xs text-text-muted">
                    {group.items.length} product{group.items.length === 1 ? '' : 's'}
                  </span>
                </span>
              </span>
              <span className="font-bold text-primary text-sm whitespace-nowrap">
                {formatRupees(group.total)}
              </span>
            </li>
          ))}
        </ul>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button fullWidth icon={ShoppingCart} onClick={placeOrders} disabled={isPlacing}>
          {isPlacing
            ? 'Order bheja ja raha hai...'
            : groups.length === 1
              ? 'Order Bhejein'
              : `${groups.length} Orders Bhejein`}
        </Button>
      </CardContent>
    </Card>
  );
}
