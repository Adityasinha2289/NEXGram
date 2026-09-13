import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Bike, Minus, Plus, Search, ShoppingBag } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useApiResource } from '../../hooks/useApiResource';
import { storefrontApi } from '../../services/api/storefrontApi';

const rupees = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;

/**
 * One shop's shelf, as a household sees it.
 *
 * Quantities are capped at what the shop actually has, because this is the same
 * stock the counter is selling from — someone walking in can take the last one
 * while this basket is open, and the order is only committed when the shop
 * accepts it.
 */
export function ShopCatalogue() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [basket, setBasket] = useState({});
  const [isPlacing, setIsPlacing] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);

  const fetcher = useCallback(() => storefrontApi.getShop(shopId), [shopId]);
  const { data, isLoading, error: loadError, reload } = useApiResource(fetcher);

  const items = useMemo(() => {
    const all = data?.items || [];
    const query = search.trim().toLowerCase();
    return query ? all.filter((i) => i.name.toLowerCase().includes(query)) : all;
  }, [data, search]);

  const lines = useMemo(
    () => Object.entries(basket)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = (data?.items || []).find((i) => i.inventoryId === id);
        return item ? { ...item, quantity: qty } : null;
      })
      .filter(Boolean),
    [basket, data],
  );

  const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

  const setQuantity = (item, quantity) => {
    setError(null);
    setBasket((prev) => ({
      ...prev,
      // Never above what the shop has: the order would be refused anyway, and
      // finding that out at checkout wastes the trip.
      [item.inventoryId]: Math.max(0, Math.min(quantity, item.available)),
    }));
  };

  const placeOrder = async () => {
    setIsPlacing(true);
    setError(null);
    try {
      const order = await storefrontApi.placeOrder({
        shop_id: shopId,
        items: lines.map((line) => ({
          inventory_id: line.inventoryId,
          quantity: line.quantity,
        })),
        note: note.trim() || undefined,
      });
      navigate(`/shop/orders/${order.id}`);
    } catch (err) {
      setError(err.message || 'Order nahi ja paya. Dobara try karein.');
      // Stock may have moved under us; re-read so the caps are current.
      reload();
    } finally {
      setIsPlacing(false);
    }
  };

  if (isLoading) return <div className="flex flex-col gap-6"><SkeletonList rows={6} /></div>;
  if (loadError) return <ErrorState description={loadError} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="flex animate-fade-in flex-col gap-6 pb-32">
      <PageHeader
        eyebrow={data.area || 'Aapke paas'}
        title={data.name}
        description="Jo abhi dukaan mein hai wahi dikh raha hai. Order accept hote hi stock rakh liya jayega."
      />

      <Input
        icon={Search}
        type="search"
        placeholder="Is dukaan mein dhoondhein"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Dukaan mein dhoondhein"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={search ? 'Kuch nahi mila' : 'Is dukaan ne abhi kuch online nahi rakha'}
          description={search ? 'Naam badal kar dekhiye.' : 'Thodi der baad dekhein.'}
        />
      ) : (
        <ul className="panel divide-y divide-border overflow-hidden">
          {items.map((item) => {
            const quantity = basket[item.inventoryId] || 0;
            return (
              <li key={item.inventoryId} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="eyebrow">{item.category}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
                    {item.name}
                    {item.variant && <span className="font-normal text-text-muted"> {item.variant}</span>}
                  </p>
                  <p className="num mt-0.5 text-2xs text-text-muted">
                    {rupees(item.price)} · {item.available} bache
                  </p>
                </div>

                {quantity === 0 ? (
                  <Button size="sm" variant="outline" onClick={() => setQuantity(item, 1)}>
                    Add
                  </Button>
                ) : (
                  <div className="flex flex-shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-1 py-0.5">
                    <button
                      type="button"
                      aria-label={`${item.name} kam karein`}
                      onClick={() => setQuantity(item, quantity - 1)}
                      className="grid h-7 w-7 place-items-center rounded-full bg-surface-muted text-text-secondary"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="num w-5 text-center text-sm font-semibold">{quantity}</span>
                    <button
                      type="button"
                      aria-label={`${item.name} aur lein`}
                      disabled={quantity >= item.available}
                      onClick={() => setQuantity(item, quantity + 1)}
                      className="grid h-7 w-7 place-items-center rounded-full bg-surface-muted text-text-secondary disabled:opacity-30"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {lines.length > 0 && (
        <div className="fixed bottom-14 left-0 right-0 z-20 mx-auto max-w-lg border-t border-border bg-surface p-4 shadow-elevated env-safe-bottom md:bottom-0">
          <Input
            placeholder="Koi baat batani hai? (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="Order ke saath note"
          />
          {error && (
            <p role="alert" className="mt-2 flex items-start gap-2 text-2xs leading-snug text-danger">
              <AlertCircle size={13} className="mt-px flex-shrink-0" strokeWidth={2.25} />
              {error}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-2xs text-text-muted">
                {lines.length} item · <Bike size={11} className="inline" /> {data.name}
              </p>
              <p className="num text-xl font-bold leading-tight text-text-primary">
                {rupees(total)}
              </p>
            </div>
            <Button icon={ShoppingBag} isLoading={isPlacing} onClick={placeOrder}>
              Order karein
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
