import { Search } from 'lucide-react';
import { Input } from '../../../../components/ui/Input';

const CATEGORIES = ['All', 'Dairy', 'FMCG', 'Staples', 'Beverages', 'Spices', 'Household', 'Agriculture'];
const SORTS = ['Recommended', 'Nearest', 'Fastest Delivery'];

export function DistributorFilters({ 
  searchQuery, 
  setSearchQuery, 
  selectedCategory, 
  setSelectedCategory,
  sortBy,
  setSortBy
}) {
  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="Distributor ya category search karein..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        icon={Search}
      />
      
      <div className="flex items-center gap-2">
        {/* Horizontal scrolling chip list for categories */}
        <div className="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category 
                  ? 'bg-primary text-text-inverse shadow-sm' 
                  : 'bg-surface border border-border text-text-muted hover:bg-surface-muted'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Lightweight Sort Control */}
        <div className="flex-shrink-0 pb-2">
          <select 
            className="bg-surface border border-border text-text-muted text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {SORTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
