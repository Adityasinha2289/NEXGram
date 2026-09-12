import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, MapPin, Search, Store, TrendingUp, Truck } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardContent } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Input } from '../../../components/ui/Input';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { intelligenceApi } from '../../../services/api/intelligenceApi';

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
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      intelligenceApi.searchMarket({ q: query.trim() || undefined })
        .then((res) => { if (!cancelled) setResults(res); })
        .catch((err) => { if (!cancelled) setError(err.message || 'Search fail hui'); })
        .finally(() => { if (!cancelled) setIsLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  return (
    <div className="flex flex-col gap-4 pb-6 animate-fade-in">
      <header>
        <h2 className="text-2xl font-bold text-text-primary leading-tight">Kya Milta Hai?</h2>
        <p className="text-sm text-text-muted mt-1">
          Aapke district ke distributors ke paas abhi jo stock hai, sasta pehle.
        </p>
      </header>

      <Input
        icon={Search}
        placeholder="Product dhoondhein, e.g. Paneer"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error ? (
        <ErrorState description={error} onRetry={() => setQuery((q) => q)} />
      ) : isLoading ? (
        <LoadingSpinner />
      ) : results.length === 0 ? (
        <EmptyState
          title="Kuch nahi mila"
          description={
            query
              ? `"${query}" abhi koi local distributor stock nahi karta. Aap ise "Kya Nahi Mila?" mein report kar sakte hain.`
              : 'Aapke district mein abhi koi stock listed nahi hai.'
          }
          actionLabel="Demand Report Karein"
          onAction={() => navigate('/retailer/report-demand')}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {results.map((item) => {
            const isOpen = openId === item.productId;
            return (
              <li key={item.productId}>
                <Card className="border-border overflow-hidden">
                  <CardContent className="p-0">
                    <button
                      onClick={() => setOpenId(isOpen ? null : item.productId)}
                      aria-expanded={isOpen}
                      className="w-full text-left p-4 flex flex-col gap-2 hover:bg-surface-muted transition-colors"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                            {item.category}
                          </p>
                          <h3 className="font-bold text-text-primary leading-tight">{item.name}</h3>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-primary">{rupees(item.bestPrice)}</p>
                          <p className="text-[10px] text-text-muted">se shuru</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={item.supplierCount > 1 ? 'success' : 'warning'} className="text-[10px]">
                          {item.supplierCount} supplier{item.supplierCount === 1 ? '' : 's'}
                        </Badge>
                        {item.retailersAsking > 0 && (
                          <span className="text-[11px] text-text-muted flex items-center gap-1">
                            <TrendingUp size={11} /> {item.retailersAsking} shop
                            {item.retailersAsking === 1 ? '' : 's'} maang rahe hain
                          </span>
                        )}
                        {item.priceSpread > 0 && (
                          <span className="text-[11px] text-success font-medium">
                            {rupees(item.priceSpread)} tak bacha sakte hain ({item.comparableVariant})
                          </span>
                        )}
                        <ChevronDown
                          size={15}
                          className={`text-text-muted ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </button>

                    {isOpen && (
                      <ul className="border-t border-border divide-y divide-border">
                        {item.offers.map((offer) => (
                          <li key={offer.catalogueItemId}>
                            <button
                              onClick={() => navigate(`/retailer/distributors/${offer.distributorId}`)}
                              className="w-full text-left p-3 flex items-center justify-between gap-3 hover:bg-surface-muted transition-colors"
                            >
                              <span className="min-w-0">
                                <span className="flex items-center gap-1.5 font-semibold text-sm text-text-primary">
                                  <Store size={13} className="text-text-muted flex-shrink-0" />
                                  <span className="truncate">{offer.distributorName}</span>
                                </span>
                                <span className="block text-xs text-text-muted mt-0.5">
                                  {offer.variant} &middot; MOQ {offer.minimumOrderQuantity} &middot;{' '}
                                  {offer.availableStock} in stock
                                </span>
                                <span className="flex items-center gap-2 text-[11px] text-text-muted mt-0.5">
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
                              <span className="font-bold text-primary text-sm whitespace-nowrap">
                                {rupees(offer.price)}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
