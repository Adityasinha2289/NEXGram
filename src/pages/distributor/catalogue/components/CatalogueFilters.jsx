import { Search } from 'lucide-react';
import { Input } from '../../../../components/ui/Input';

export function CatalogueFilters({ 
  searchQuery, 
  setSearchQuery, 
  categories, 
  selectedCategory, 
  setSelectedCategory 
}) {
  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="Product search karein..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        icon={Search}
      />
      
      {/* Horizontal scrolling chip list for categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`flex-shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === category 
                ? 'bg-primary text-text-inverse shadow-sm' 
                : 'bg-surface border border-border text-text-muted hover:bg-surface-muted'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}
