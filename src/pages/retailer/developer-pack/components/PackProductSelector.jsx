import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Input } from '../../../../components/ui/Input';
import { Modal } from '../../../../components/ui/Modal';
import { SkeletonList } from '../../../../components/ui/Skeleton';
import { intelligenceApi } from '../../../../services/api/intelligenceApi';

const rupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

export function PackProductSelector({ onAdd, onCancel, currentPackItems }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Only what a supplier near this shop can actually deliver.
  useEffect(() => {
    let cancelled = false;
    intelligenceApi.getDeveloperPackOptions()
      .then((items) => { if (!cancelled) setOptions(items); })
      .catch(() => { if (!cancelled) setOptions([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const currentIds = new Set(currentPackItems.map((item) => item.id));
    const addable = options.filter((p) => !currentIds.has(p.id));
    const query = searchQuery.trim().toLowerCase();
    return {
      addableCount: addable.length,
      items: query
        ? addable.filter(
          (p) => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query),
        )
        : addable,
    };
  }, [options, currentPackItems, searchQuery]);

  return (
    <Modal title="Products add karein" onClose={onCancel} size="tall">
      <div className="sticky top-0 z-10 border-b border-border bg-surface px-4 py-3">
        <Input
          icon={Search}
          type="search"
          placeholder="Product ya category dhoondhein"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Product dhoondhein"
        />
      </div>

      {isLoading ? (
        <div className="p-4">
          <SkeletonList rows={4} />
        </div>
      ) : filtered.items.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm leading-relaxed text-text-muted">
          {filtered.addableCount === 0
            ? 'Aapke area ke saare available products pack mein aa chuke hain.'
            : 'Is naam se kuch nahi mila.'}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.items.map((product) => (
            <li key={product.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                {product.category !== product.name && (
                  <p className="eyebrow">{product.category}</p>
                )}
                <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
                  {product.name}
                </p>
                <p className="num mt-0.5 truncate text-2xs text-text-muted">
                  {product.variant} &middot; {rupees(product.price)}/pack &middot; MOQ{' '}
                  {product.minimumOrderQuantity} &middot; {product.distributorName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAdd(product)}
                aria-label={`${product.name} pack mein add karein`}
                className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-primary-light text-primary transition-colors hover:bg-primary hover:text-text-inverse"
              >
                <Plus size={17} strokeWidth={2.25} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
