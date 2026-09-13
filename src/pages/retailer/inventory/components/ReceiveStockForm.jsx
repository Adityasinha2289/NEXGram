import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Search } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Modal } from '../../../../components/ui/Modal';
import { SkeletonList } from '../../../../components/ui/Skeleton';
import { inventoryApi } from '../../../../services/api/inventoryApi';
import { productsApi } from '../../../../services/api/productsApi';

/**
 * Recording that a delivery arrived.
 *
 * Stock goes on as a dated batch, not a bare number, because shelf life is per
 * lot: the milk that came Monday and the milk that came Thursday are the same
 * product and expire on different days. The expiry is optional — an undated
 * delivery of something with a known shelf life is dated from it — so a
 * shopkeeper is never blocked by a field they cannot answer.
 */
export function ReceiveStockForm({ onClose, onSaved }) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [isSearching, setIsSearching] = useState(true);
  const [selection, setSelection] = useState(null);

  const [form, setForm] = useState({
    quantity: '',
    unitCost: '',
    sellingPrice: '',
    shelfLifeDays: '',
    expiresOn: '',
    reorderLevel: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selection) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      setIsSearching(true);
      productsApi.getProducts({ search: query || undefined, page_size: 30 })
        .then((res) => { if (!cancelled) setProducts(res.items || []); })
        .catch(() => { if (!cancelled) setProducts([]); })
        .finally(() => { if (!cancelled) setIsSearching(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, selection]);

  const variants = useMemo(
    () => products.flatMap((product) => (product.variants || []).map((variant) => ({
      variantId: variant.id,
      label: `${product.canonical_name} ${variant.variant_name}`,
      category: product.category?.name || 'Uncategorised',
    }))),
    [products],
  );

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!selection) next.product = 'Product chunein';
    if (!form.quantity || Number(form.quantity) <= 0) next.quantity = 'Kitne aaye?';
    setErrors(next);
    if (Object.keys(next).length) return;

    setIsSaving(true);
    setSubmitError(null);
    try {
      await inventoryApi.receiveStock({
        product_variant_id: selection.variantId,
        quantity: Number(form.quantity),
        unit_cost: form.unitCost ? Number(form.unitCost) : undefined,
        selling_price: form.sellingPrice ? Number(form.sellingPrice) : undefined,
        shelf_life_days: form.shelfLifeDays ? Number(form.shelfLifeDays) : undefined,
        expires_on: form.expiresOn || undefined,
        reorder_level: form.reorderLevel ? Number(form.reorderLevel) : undefined,
      });
      onSaved?.();
    } catch (err) {
      setSubmitError(err.message || 'Save nahi hua, dobara try karein');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title="Stock aaya"
      onClose={onClose}
      footer={
        <Button type="submit" form="receive-stock" fullWidth isLoading={isSaving}>
          Shelf par daalein
        </Button>
      }
    >
      <form id="receive-stock" onSubmit={submit} className="flex flex-col gap-4 p-4">
        {selection ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary-light px-3 py-2.5">
            <div className="min-w-0">
              <p className="eyebrow">{selection.category}</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
                {selection.label}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelection(null)}
              className="flex-shrink-0 rounded-md px-2 py-1.5 text-2xs font-semibold text-primary transition-colors hover:bg-surface"
            >
              Badlein
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Input
              label="Kaunsa product"
              icon={Search}
              type="search"
              placeholder="e.g. Doodh"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              error={errors.product}
            />
            <div className="max-h-52 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {isSearching ? (
                <div className="p-3"><SkeletonList rows={3} className="border-0" /></div>
              ) : variants.length === 0 ? (
                <p className="p-4 text-center text-sm text-text-muted">Koi product nahi mila.</p>
              ) : (
                variants.map((choice) => (
                  <button
                    key={choice.variantId}
                    type="button"
                    onClick={() => setSelection(choice)}
                    className="w-full px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
                  >
                    <span className="eyebrow block">{choice.category}</span>
                    <span className="mt-0.5 block text-sm font-medium text-text-primary">
                      {choice.label}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Kitne aaye"
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="0"
            value={form.quantity}
            onChange={(e) => set('quantity', e.target.value)}
            error={errors.quantity}
          />
          <Input
            label="Kitne ka pada"
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="per piece"
            value={form.unitCost}
            onChange={(e) => set('unitCost', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Bechne ka daam"
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="per piece"
            value={form.sellingPrice}
            onChange={(e) => set('sellingPrice', e.target.value)}
          />
          <Input
            label="Itne se kam ho to batayein"
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="0"
            value={form.reorderLevel}
            onChange={(e) => set('reorderLevel', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Kitne din chalta hai"
              type="number"
              inputMode="numeric"
              min="1"
              placeholder="e.g. 5"
              value={form.shelfLifeDays}
              onChange={(e) => set('shelfLifeDays', e.target.value)}
            />
            <Input
              label="Expiry date (optional)"
              type="date"
              value={form.expiresOn}
              onChange={(e) => set('expiresOn', e.target.value)}
            />
          </div>
          <p className="text-2xs leading-snug text-text-muted">
            Date na pata ho to sirf din bhar dein — expiry khud lag jayegi. Sale hamesha
            sabse pehle expire hone wale batch se hoti hai.
          </p>
        </div>

        {submitError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2.5 text-sm leading-snug text-danger"
          >
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" strokeWidth={2} />
            {submitError}
          </p>
        )}
      </form>
    </Modal>
  );
}
