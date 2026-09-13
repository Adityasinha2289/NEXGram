import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Package } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Input } from '../../../components/ui/Input';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { useApiResource } from '../../../hooks/useApiResource';
import { useDebounced } from '../../../hooks/useDebounced';
import { productsApi } from '../../../services/api/productsApi';

export function ProductDiscovery() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  
  const debouncedQuery = useDebounced(query, 300);
  
  const fetcher = useCallback(
    () => productsApi.getProducts({ search: debouncedQuery.trim() || undefined }),
    [debouncedQuery]
  );
  
  const { data, isLoading, error, reload } = useApiResource(fetcher, { initialData: { items: [] } });
  const results = data?.items || [];

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        eyebrow="Products"
        title="Jo chahiye, woh dhoondo"
        description="Browse all products and find the best local suppliers."
      />

      <Input
        icon={Search}
        type="search"
        placeholder="Product dhoondhein, e.g. Paneer"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Product search"
      />

      {error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : isLoading ? (
        <SkeletonList rows={5} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Product nahi mila"
          description={
            query
              ? `"${query}" matching koi product nahi mila.`
              : 'Koi products available nahi hain.'
          }
        />
      ) : (
        <ul className="panel divide-y divide-border overflow-hidden">
          {results.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => navigate(`/retailer/products/${product.id}`)}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-surface-muted"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-text-primary">
                    {product.canonical_name}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
                    {product.brand && <span>{product.brand}</span>}
                    {product.category && <span>&middot; {product.category.name}</span>}
                  </div>
                  {product.variants?.length > 0 && (
                    <p className="mt-1 text-xs text-text-faint">
                      {product.variants.length} variant{product.variants.length > 1 ? 's' : ''} available
                    </p>
                  )}
                </div>
                <ChevronRight size={20} className="text-text-faint flex-shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
