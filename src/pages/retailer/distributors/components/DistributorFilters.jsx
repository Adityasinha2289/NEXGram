import { Search } from 'lucide-react';
import { FilterChips } from '../../../../components/ui/FilterChips';
import { Input } from '../../../../components/ui/Input';

/**
 * Sorts the list actually implements.
 *
 * "Fastest Delivery" used to be offered here and matched no branch in the sort
 * function, so choosing it silently did nothing; "Most pack products" was
 * implemented but never offered.
 */
export const SORTS = [
  { value: 'Recommended', label: 'Recommended' },
  { value: 'Most Pack Products', label: 'Pack ke sabse zyada products' },
  { value: 'Nearest', label: 'Sabse paas' },
];

export function DistributorFilters({
  searchQuery,
  setSearchQuery,
  categories,
  selectedCategory,
  setSelectedCategory,
  sortBy,
  setSortBy,
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          placeholder="Distributor ya category dhoondhein"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={Search}
          type="search"
          aria-label="Distributor dhoondhein"
        />

        <label className="flex w-full flex-shrink-0 items-center gap-2 text-sm text-text-muted lg:w-auto">
          <span className="sr-only lg:not-sr-only">Sort</span>
          <select
            className="h-[42px] w-full cursor-pointer rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary transition-colors hover:border-text-faint focus:border-primary focus:outline-none lg:w-auto"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>{sort.label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Built from the distributors actually returned, not a hard-coded list
          that had already drifted away from what the database holds. */}
      {categories.length > 2 && (
        <FilterChips
          name="distributor-category"
          label="Category se filter karein"
          options={categories}
          value={selectedCategory}
          onChange={setSelectedCategory}
        />
      )}
    </div>
  );
}
