import { useState, useEffect, useMemo } from 'react';
import { Search, Sparkles, CheckCircle2 } from 'lucide-react';
import { DISTRIBUTORS_LIST_MOCK } from '../../../data/distributorDiscoveryMock';
import { SUPPLY_GAP_CATALOGUES_MOCK } from '../../../data/supplyGapTestMock';
import { DistributorMatchingEngine } from '../../../features/intelligence/services/DistributorMatchingEngine';
import { PackContextCard } from './components/PackContextCard';
import { DistributorFilters } from './components/DistributorFilters';
import { DistributorCard } from './components/DistributorCard';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Badge } from '../../../components/ui/Badge';

export function DistributorDiscovery() {
  const [packItems, setPackItems] = useState([]);
  const [retailerProfile, setRetailerProfile] = useState(null);
  const [locationStr, setLocationStr] = useState('Area, District');
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Recommended');

  useEffect(() => {
    // Load Location & Profile
    try {
      const savedOnboarding = localStorage.getItem('nexgram_retailer_onboarding');
      if (savedOnboarding) {
        const parsed = JSON.parse(savedOnboarding);
        setRetailerProfile(parsed);
        if (parsed.location?.area && parsed.location?.district) {
          setLocationStr(`${parsed.location.area}, ${parsed.location.district}`);
        }
      }
    } catch (e) {
      console.error('Failed to parse onboarding', e);
    }

    // Load Developer Pack
    try {
      const savedPack = localStorage.getItem('nexgram_retailer_developer_pack');
      if (savedPack) {
        setPackItems(JSON.parse(savedPack));
      }
    } catch (e) {
      console.error('Failed to parse developer pack', e);
    }
  }, []);

  // Run Deterministic Matching Engine
  const matchingData = useMemo(() => {
    if (packItems.length === 0) return null;
    
    // Construct payload for the engine
    const developerPackPayload = {
      retailerId: retailerProfile?.id || 'unknown',
      retailerLocation: retailerProfile?.location || null,
      products: packItems
    };

    return DistributorMatchingEngine.match(
      developerPackPayload, 
      SUPPLY_GAP_CATALOGUES_MOCK, 
      DISTRIBUTORS_LIST_MOCK,
      { limit: 5 }
    );
  }, [packItems, retailerProfile]);

  const bestMatch = matchingData?.bestMatch || null;

  // Compute distributor pack match for legacy list
  const distributorsWithMatch = useMemo(() => {
    return DISTRIBUTORS_LIST_MOCK.map(dist => {
      let matchCount = 0;
      
      if (matchingData) {
        // Did the matching engine evaluate this distributor?
        if (matchingData.bestMatch?.distributorId === dist.id) {
          matchCount = matchingData.bestMatch.productsFulfilled;
        } else {
          const alt = matchingData.alternatives.find(a => a.distributorId === dist.id);
          if (alt) matchCount = alt.productsFulfilled;
        }
      }
      
      return { ...dist, packMatchCount: matchCount };
    });
  }, [matchingData]);

  // Apply Filters & Sort
  const filteredAndSorted = useMemo(() => {
    let result = distributorsWithMatch;

    if (selectedCategory !== 'All') {
      result = result.filter(d => d.categories.includes(selectedCategory));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => 
        d.name.toLowerCase().includes(q) || 
        d.categories.some(c => c.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'Most Pack Products') return b.packMatchCount - a.packMatchCount;
      if (sortBy === 'Nearest') return parseInt(a.distance) - parseInt(b.distance);
      // 'Fastest Delivery' and 'Recommended' use default mock order for now
      return 0; 
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
        {filteredAndSorted.length === 0 ? (
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
