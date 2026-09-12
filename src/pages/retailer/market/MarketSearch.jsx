import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, MapPin, Search, Store, TrendingUp, Truck } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Input } from '../../../components/ui/Input';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { intelligenceApi } from '../../../services/api/intelligenceApi';
import { useApiResource } from '../../../hooks/useApiResource';
import { useDebounced } from '../../../hooks/useDebounced';

const rupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

/**
 * "Who near me sells this, and for how much."
 *
 * Results are grouped by product rather than by listing, so a shopkeeper sees
 * one row per thing they might buy with every local supplier's price underneath
 * it. Price comparison only ever runs within the same pack size.
 */
export function MarketSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);

  // Debounced so a search is one request per pause, not one per keystroke -
  // which matters on a connection the user is paying for by the megabyte.
  const debouncedQuery = useDebounced(query, 300);
  const fetcher = useCallback(
    () => intelligenceApi.searchMarket({ q: debouncedQuery.trim() || undefined }),
    [debouncedQuery],
  );
  const { data, isLoading, error, reload } = useApiResource(fetcher, { initialData: [] });
  const results = useMemo(() => data || [], [data]);

  return (
    <div className="flex animate-fade-in flex-col gap-5">
      <PageHeader
        eyebrow="Local market"
        title="Kya milta hai?"
        description="Aapke district ke distributors ke paas abhi jo stock hai — sabse sasta pehle."
      />

      <Input
        icon={Search}
        type="search"
        placeholder="Product dhoondhein, e.g. Paneer"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Product dhoondhein"
      />

      {error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : isLoading ? (
        <SkeletonList rows={5} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Kuch nahi mila"
          description={
            query
              ? `"${query}" abhi koi local distributor stock nahi karta. Aap ise "Kya nahi mila?" mein report kar sakte hain.`
              : 'Aapke district mein abhi koi stock listed nahi hai.'
          }
          actionLabel="Demand report karein"
          onAction={() => navigate('/retailer/report-demand')}
        />
      ) : (
        <ul className="panel divide-y divide-border overflow-hidden">
          {results.map((item) => {
            const isOpen = openId === item.productId;
            return (
              <li key={item.productId}>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : item.productId)}
                  aria-expanded={isOpen}
                  className="flex w-full items-start gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted"
                >
                  <div className="min-w-0 flex-1">
                    {item.category !== item.name && <p className="eyebrow">{item.category}</p>}
                    <h3 className="mt-0.5 truncate text-sm font-semibold text-text-primary">
                      {item.name}
                    </h3>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Badge variant={item.supplierCount > 1 ? 'success' : 'warning'} dot>
                        {item.supplierCount} supplier{item.supplierCount === 1 ? '' : 's'}
                      </Badge>
                      {item.retailersAsking > 0 && (
                        <span className="num flex items-center gap-1 text-2xs text-text-muted">
                          <TrendingUp size={11} /> {item.retailersAsking} shop
                          {item.retailersAsking === 1 ? '' : 's'} maang rahe hain
                        </span>
                      )}
                    </div>

                    {item.priceSpread > 0 && (
                      <p className="num mt-1.5 text-2xs font-medium text-success">
                        {rupees(item.priceSpread)} tak bacha sakte hain ({item.comparableVariant})
                      </p>
                    )}
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="text-right">
                      <span className="num block text-sm font-semibold text-text-primary">
                        {rupees(item.bestPrice)}
                      </span>
                      <span className="block text-2xs text-text-muted">se shuru</span>
                    </span>
                    <ChevronDown
                      size={16}
                      strokeWidth={2.25}
                      className={`text-text-faint transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                {isOpen && (
                  <ul className="divide-y divide-border border-t border-border bg-surface-muted">
                    {item.offers.map((offer) => (
                      <li key={offer.catalogueItemId}>
                        <button
                          type="button"
                          onClick={() => navigate(`/retailer/distributors/${offer.distributorId}`)}
                          className="flex w-full items-center justify-between gap-3 py-3 pl-6 pr-4 text-left transition-colors hover:bg-surface-sunken"
                        >
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                              <Store size={13} className="flex-shrink-0 text-text-muted" />
                              <span className="truncate">{offer.distributorName}</span>
                            </span>
                            <span className="num mt-0.5 block text-2xs text-text-muted">
                              {offer.variant} &middot; MOQ {offer.minimumOrderQuantity} &middot;{' '}
                              {offer.availableStock} in stock
                            </span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-2xs text-text-muted">
                              {offer.sameArea && (
                                <span className="flex items-center gap-1">
                                  <MapPin size={10} /> Aapke area mein
                                </span>
                              )}
                              {offer.deliveryTime && (
                                <span className="flex items-center gap-1">
                                  <Truck size={10} /> {offer.deliveryTime}
                                </span>
                              )}
                            </span>
                          </span>
                          <span className="num flex-shrink-0 text-sm font-semibold text-text-primary">
                            {rupees(offer.price)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
