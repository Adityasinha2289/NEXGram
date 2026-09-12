import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Input } from '../../../../components/ui/Input';
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

  // Escape closes it, and the page behind stops scrolling while it is open —
  // both of which a dialog owes the user and neither of which it did.
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onCancel]);

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
    <div className="fixed inset-0 z-100 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Band karein"
        className="absolute inset-0 bg-text-primary/40 backdrop-blur-[2px]"
        onClick={onCancel}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pack-selector-title"
        className="relative z-10 flex h-[82vh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-2xl bg-surface shadow-lg sm:h-[min(620px,86vh)] sm:rounded-2xl"
      >
        <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id="pack-selector-title" className="text-base font-semibold text-text-primary">
            Products add karein
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Band karein"
            className="grid h-9 w-9 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="flex-shrink-0 border-b border-border px-4 py-3">
          <Input
            icon={Search}
            placeholder="Product ya category dhoondhein"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto">
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
                      {product.variant} · {rupees(product.price)}/pack · MOQ{' '}
                      {product.minimumOrderQuantity} · {product.distributorName}
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
        </div>
      </div>
    </div>
  );
}
