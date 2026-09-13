import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, MapPin, Search, Store } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { List, ListRow, RowChevron } from '../../components/ui/List';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useApiResource } from '../../hooks/useApiResource';
import { useDebounced } from '../../hooks/useDebounced';
import { storefrontApi } from '../../services/api/storefrontApi';

/**
 * The shops close enough to deliver to this household.
 *
 * Bounded by what someone covers on foot or a bicycle, which is the whole
 * reason the promise is deliverable without a fleet. A shop further away is not
 * a slower option, it is simply not listed — so the reason sits under the list,
 * where someone looking at three shops actually asks the question, rather than
 * in a header paragraph read before there was anything to explain.
 */
export function Shops() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search, 300);

  const fetcher = useCallback(
    () => storefrontApi.getShops({ search: debounced.trim() || undefined }),
    [debounced],
  );
  const { data, isLoading, error, reload } = useApiResource(fetcher, { initialData: [] });
  const shops = data || [];

  return (
    <div className="flex animate-fade-in flex-col gap-5">
      <PageHeader
        eyebrow="Aas-paas"
        title="Kya mangwana hai?"
        description="Jo abhi dukaan mein hai wahi dikh raha hai."
      />

      <Input
        icon={Search}
        type="search"
        placeholder="Dukaan dhoondhein"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Dukaan dhoondhein"
      />

      {error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : isLoading ? (
        <SkeletonList rows={4} />
      ) : shops.length === 0 ? (
        <EmptyState
          icon={Store}
          title={debounced ? 'Koi dukaan nahi mili' : 'Aapke paas koi dukaan online nahi hai'}
          description={
            debounced
              ? 'Naam badal kar dekhiye.'
              : 'Delivery cycle par hoti hai, isliye sirf paas ki dukaanein dikhti hain. Apna address sahi hai to woh jald hi yahaan aayengi.'
          }
          actionLabel="Address theek karein"
          onAction={() => navigate('/shop/address')}
        />
      ) : (
        <>
          <List>
            {shops.map((shop) => (
              <ListRow key={shop.shopId} onClick={() => navigate(`/shop/${shop.shopId}`)}>
                <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-primary-light text-primary">
                  <Store size={16} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-text-primary">{shop.name}</p>
                    {/* A count, not a status — it was wearing a status chip. */}
                    <p className="num flex-shrink-0 text-2xs text-text-muted">
                      {shop.itemsAvailable} items
                    </p>
                  </div>
                  <p className="num mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-2xs text-text-muted">
                    {/* The payload has carried businessType all along and this
                        row dropped it — it is the one fact that tells a
                        household whether the shop sells what they came for. */}
                    {shop.businessType && <span>{shop.businessType}</span>}
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {shop.distanceLabel}
                    </span>
                    <span className="flex items-center gap-1">
                      <Bike size={11} /> {shop.deliveryEstimate}
                    </span>
                  </p>
                </div>
                <RowChevron />
              </ListRow>
            ))}
          </List>

          <p className="text-2xs leading-relaxed text-text-muted">
            Delivery dukaan ka apna ladka cycle ya paidal karta hai, isliye sirf aapke paas ki
            dukaanein dikhti hain.
          </p>
        </>
      )}
    </div>
  );
}
