import { Search } from 'lucide-react';
import { FilterChips } from '../../../../components/ui/FilterChips';
import { Input } from '../../../../components/ui/Input';

export function CatalogueFilters({
  searchQuery,
  setSearchQuery,
  categories,
  selectedCategory,
  setSelectedCategory,
}) {
  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="Apne products mein dhoondhein"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        icon={Search}
        type="search"
        aria-label="Product dhoondhein"
      />

      {categories.length > 2 && (
        <FilterChips
          name="catalogue-category"
          label="Category se filter karein"
          options={categories.map((category) => ({
            value: category,
            label: category === 'All' ? 'Sab' : category,
          }))}
          value={selectedCategory}
          onChange={setSelectedCategory}
        />
      )}
    </div>
  );
}
