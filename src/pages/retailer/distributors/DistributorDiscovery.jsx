import { useCallback, useMemo, useState } from 'react';
import { Check, MapPin, Search, Store } from 'lucide-react';
import { PackContextCard } from './components/PackContextCard';
import { DistributorFilters } from './components/DistributorFilters';
import { DistributorCard } from './components/DistributorCard';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Meta, PageHeader } from '../../../components/ui/PageHeader';
import { Section } from '../../../components/ui/Section';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { distributorsApi } from '../../../services/api/distributorsApi';
import { useApiResource } from '../../../hooks/useApiResource';
import { useAuth } from '../../../context/useAuth';
import { useDeveloperPack } from '../developer-pack/hooks/useDeveloperPack';

export function DistributorDiscovery() {
  const { profile } = useAuth();
  // Matching is computed with the plan, server-side, so this page can never
  // rank suppliers differently from the plan that sent the user here.
  const { packItems, distributorMatches } = useDeveloperPack();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Recommended');

  const fetcher = useCallback(
    () => distributorsApi.getDistributors({
      search: searchQuery.trim() || undefined,
      page_size: 50,
    }),
    [searchQuery],
  );
  const { data, isLoading, error, reload } = useApiResource(fetcher);

  const location = profile?.profile_data?.location;
  const locationLabel = location?.area && location?.district
    ? `${location.area}, ${location.district}`
    : null;

  const distributors = useMemo(() => {
    const matchesById = new Map(distributorMatches.map((m) => [m.distributorId, m]));
    return (data?.items || []).map((d) => {
      const match = matchesById.get(d.id);
      return {
        id: d.id,
        name: d.business_name,
        categories: d.business_category ? [d.business_category] : ['General'],
        distance: d.service_radius || 'Nearby',
        deliveryTime: d.delivery_capability || '',
        minimumOrder: d.minimum_order_value || 0,
        packMatchCount: match?.productsFulfilled || 0,
        packEstimatedTotal: match?.estimatedTotal || 0,
        distanceKm: match?.distanceKm ?? null,
      };
    });
  }, [data, distributorMatches]);

  // Derived from what came back rather than hard-coded: the fixed list here had
  // already drifted from the categories the database actually holds, so two of
  // its chips could never match anything.
  const categories = useMemo(() => {
    const counts = new Map();
    distributors.forEach((d) => {
      d.categories.forEach((c) => counts.set(c, (counts.get(c) || 0) + 1));
    });
    return [
      { value: 'All', label: 'Sab', count: distributors.length },
      ...[...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => ({ value, label: value, count })),
    ];
  }, [distributors]);

  const visible = useMemo(() => {
    let result = distributors;

    if (selectedCategory !== 'All') {
      result = result.filter((d) => d.categories.some(
        (c) => c.toLowerCase() === selectedCategory.toLowerCase(),
      ));
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'Most Pack Products') return b.packMatchCount - a.packMatchCount;
      if (sortBy === 'Nearest') return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
      // Recommended: most of the plan covered, cheapest breaking the tie.
      if (b.packMatchCount !== a.packMatchCount) return b.packMatchCount - a.packMatchCount;
      return (a.packEstimatedTotal || Infinity) - (b.packEstimatedTotal || Infinity);
    });
  }, [distributors, selectedCategory, sortBy]);

  const bestMatch = distributorMatches[0] || null;
  const showBestMatch = bestMatch && !searchQuery && selectedCategory === 'All';

  return (
    <div className="flex animate-fade-in flex-col gap-5">
      <PageHeader
        eyebrow="Suppliers"
        title="Aas-paas ke distributors"
        description="Aapke pack ke products kaun supply kar sakta hai, aur kitna."
        meta={locationLabel && <Meta icon={MapPin}>{locationLabel}</Meta>}
      />

      <PackContextCard packItems={packItems} />

      <DistributorFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : isLoading ? (
        <SkeletonList rows={4} />
      ) : (
        <>
          {showBestMatch && (
            <Section title="Aapke pack ke liye best match">
              <div className="panel overflow-hidden">
                <div className="flex items-start justify-between gap-3 border-b border-border bg-primary-subtle px-4 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                      <Store size={15} className="flex-shrink-0 text-primary" strokeWidth={2} />
                      <span className="truncate">{bestMatch.distributorName}</span>
                    </p>
                    <p className="num mt-0.5 text-2xs text-text-muted">
                      Pack ke {bestMatch.productsFulfilled} / {packItems.length} products yahaan
                      milte hain
                    </p>
                  </div>
                  <Badge
                    variant={bestMatch.fulfilmentStatus === 'Full' ? 'success' : 'warning'}
                    dot
                  >
                    {bestMatch.fulfilmentStatus}
                  </Badge>
                </div>

                <ul className="divide-y divide-border">
                  {bestMatch.reasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-2 px-4 py-2.5">
                      <Check
                        size={14}
                        className="mt-0.5 flex-shrink-0 text-success"
                        strokeWidth={2.5}
                      />
                      <p className="text-sm leading-snug text-text-secondary">{reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </Section>
          )}

          {visible.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Koi distributor nahi mila"
              description="Search ya filter badal kar dekhiye."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((distributor) => (
                <DistributorCard
                  key={distributor.id}
                  distributor={distributor}
                  packMatchCount={distributor.packMatchCount}
                  totalPackItems={packItems.length}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
