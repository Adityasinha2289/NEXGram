import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Sparkles, CheckCircle2 } from 'lucide-react';
import { PackContextCard } from './components/PackContextCard';
import { DistributorFilters } from './components/DistributorFilters';
import { DistributorCard } from './components/DistributorCard';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Badge } from '../../../components/ui/Badge';
import { distributorsApi } from '../../../services/api/distributorsApi';
import { useAuth } from '../../../context/AuthContext';
import { useDeveloperPack } from '../developer-pack/hooks/useDeveloperPack';

export function DistributorDiscovery() {
  const { profile } = useAuth();
  // Matching is computed with the plan, server-side, so this page can never
  // rank suppliers differently from the plan that sent the user here.
  const { packItems, distributorMatches } = useDeveloperPack();
  const [locationStr, setLocationStr] = useState('Area, District');
  
  // API State
  const [dbDistributors, setDbDistributors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Recommended');

  useEffect(() => {
    const parsed = profile?.profile_data;
    if (parsed?.location?.area && parsed?.location?.district) {
      setLocationStr(`${parsed.location.area}, ${parsed.location.district}`);
    }
  }, [profile]);

  const fetchDistributors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await distributorsApi.getDistributors({
        search: searchQuery || undefined,
        // The API supports location search, but UI filters locally for now to match old behavior
        page_size: 50
      });
      
      // Map DB schema to UI schema
      const mapped = response.items.map(d => ({
        id: d.id,
        name: d.business_name,
        categories: d.business_category ? [d.business_category] : ['General'], // Fallback since schema might not have array
        distance: d.service_radius || 'Nearby',
        deliveryTime: d.delivery_capability || 'N/A',
        minimumOrder: d.minimum_order_value || 0,
        hasDelivery: !!d.delivery_capability
      }));
      
      setDbDistributors(mapped);
    } catch (err) {
      console.error("Failed to fetch distributors", err);
      setError("Failed to load distributors.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchDistributors();
  }, [fetchDistributors]);

  const matchesById = useMemo(
    () => new Map(distributorMatches.map(m => [m.distributorId, m])),
    [distributorMatches],
  );

  const distributorsWithMatch = useMemo(
    () => dbDistributors.map(dist => {
      const match = matchesById.get(dist.id);
      return {
        ...dist,
        packMatchCount: match?.productsFulfilled || 0,
        packMatchPercent: match?.fulfilmentPercent || 0,
        packEstimatedTotal: match?.estimatedTotal || 0,
        distanceKm: match?.distanceKm ?? null,
      };
    }),
    [dbDistributors, matchesById],
  );

  const bestMatch = distributorMatches[0] || null;

  // Apply Filters & Sort
  const filteredAndSorted = useMemo(() => {
    let result = distributorsWithMatch;

    if (selectedCategory !== 'All') {
      result = result.filter(d => d.categories.some(c => c.toLowerCase() === selectedCategory.toLowerCase()));
    }

    // Search is handled by API mostly, but keeping client-side filter for robustness
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => 
        d.name.toLowerCase().includes(q) || 
        d.categories.some(c => c.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'Most Pack Products') return b.packMatchCount - a.packMatchCount;
      if (sortBy === 'Nearest') {
        return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
      }
      // Recommended: most of the plan covered, cheapest breaking the tie.
      if (b.packMatchCount !== a.packMatchCount) return b.packMatchCount - a.packMatchCount;
      return (a.packEstimatedTotal || Infinity) - (b.packEstimatedTotal || Infinity);
    });

    return result;
  }, [distributorsWithMatch, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="flex flex-col gap-5 pb-6 animate-fade-in">
      
      {/* 1. Page Header */}
      <header>
        <h2 className="text-2xl font-bold text-text-primary leading-tight">Nearby Distributors</h2>
        <p className="text-sm text-text-muted mt-1">Is pack ke products supply karne wale distributors dekhiye.</p>
        <p className="text-xs font-medium text-primary mt-2">Near: {locationStr}</p>
      </header>

      {/* 2. Pack Context */}
      <PackContextCard packItems={packItems} />

      {/* 3. Filters */}
      <DistributorFilters 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/* 3.5 Best Match Highlight */}
      {bestMatch && !searchQuery && selectedCategory === 'All' && (
        <div className="bg-gradient-to-br from-primary/5 to-surface border border-primary/20 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-primary" />
                <h3 className="font-bold text-lg text-text-primary">Aapke Pack Ke Liye Best Match</h3>
              </div>
              <p className="text-sm text-text-muted">{bestMatch.distributorName}</p>
            </div>
            <Badge variant={bestMatch.fulfilmentStatus === 'Full' ? 'success' : 'warning'} className="shadow-sm">
              {bestMatch.fulfilmentStatus} Fulfilment
            </Badge>
          </div>
          
          <div className="bg-surface rounded-xl p-3 border border-border mt-4 mb-4 text-sm flex justify-between items-center">
            <span className="text-text-secondary">Products Available</span>
            <span className="font-bold text-text-primary">{bestMatch.productsFulfilled} / {packItems.length} items</span>
          </div>

          <div className="flex flex-col gap-2">
            {bestMatch.reasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-text-secondary">
                <CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <p>{reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Distributor Grid */}
      <div className="mt-2">
        {isLoading ? (
          <div className="flex justify-center items-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : error ? (
          <div className="py-10">
            <EmptyState icon={Search} title="Error" description={error} />
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="py-10">
            <EmptyState 
              icon={Search}
              title="Koi distributor nahi mila" 
              description="Search ya filter change karke dekhiye." 
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAndSorted.map(distributor => (
              <DistributorCard 
                key={distributor.id} 
                distributor={distributor}
                packMatchCount={distributor.packMatchCount}
                totalPackItems={packItems.length}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
