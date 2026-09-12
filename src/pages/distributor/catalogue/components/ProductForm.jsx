import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Search } from 'lucide-react';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { SkeletonList } from '../../../../components/ui/Skeleton';
import { APP_CONSTANTS } from '../../../../constants/appConstants';
import { productsApi } from '../../../../services/api/productsApi';

/**
 * Add or edit one catalogue listing.
 *
 * A listing points at a canonical product variant rather than a typed-in name.
 * That is what lets the intelligence layer tell that this distributor's "Paneer
 * 200g" is the same paneer fourteen nearby shops are asking for; free text
 * cannot be matched against a demand signal.
 */
export function ProductForm({ initialData = null, prefill = null, onSubmit, onCancel }) {
  const isEditing = !!initialData;

  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [isSearching, setIsSearching] = useState(!isEditing && !prefill);
  // Coming from an opportunity, the product is already decided.
  const [selection, setSelection] = useState(
    prefill?.variantId
      ? { variantId: prefill.variantId, label: prefill.label, category: prefill.category, unit: 'unit' }
      : null,
  );

  const [formData, setFormData] = useState({
    price: '',
    minimumOrderQuantity: '',
    availableStock: prefill?.availableStock ? String(prefill.availableStock) : '',
    deliveryTime: APP_CONSTANTS.DELIVERY_OPTIONS[0],
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        price: initialData.price ?? '',
        minimumOrderQuantity: initialData.minimumOrderQuantity ?? '',
        availableStock: initialData.availableStock ?? '',
        deliveryTime: initialData.deliveryTime || APP_CONSTANTS.DELIVERY_OPTIONS[0],
      });
    }
  }, [initialData]);

  // Editing an existing listing keeps its product; only new ones search.
  useEffect(() => {
    if (isEditing || selection) return;
    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(() => {
      productsApi.getProducts({ search: query || undefined, page_size: 30 })
        .then((res) => { if (!cancelled) setProducts(res.items || []); })
        .catch(() => { if (!cancelled) setProducts([]); })
        .finally(() => { if (!cancelled) setIsSearching(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, isEditing, selection]);

  const variantChoices = useMemo(
    () => products.flatMap((product) => (product.variants || []).map((variant) => ({
      variantId: variant.id,
      label: `${product.canonical_name} ${variant.variant_name}`,
      category: product.category?.name || 'Uncategorised',
      unit: variant.unit || 'unit',
    }))),
    [products],
  );

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const next = {};
    if (!isEditing && !selection) next.product = 'Product select karein';
    if (!formData.price || Number(formData.price) <= 0) next.price = 'Sahi price enter karein';
    if (!formData.minimumOrderQuantity || Number(formData.minimumOrderQuantity) <= 0) {
      next.minimumOrderQuantity = 'MOQ enter karein';
    }
    if (formData.availableStock === '' || Number(formData.availableStock) < 0) {
      next.availableStock = 'Stock quantity enter karein';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    setSubmitError(null);
    try {
      await onSubmit({
        product_variant_id: selection?.variantId,
        selling_price: Number(formData.price),
        minimum_order_quantity: Number(formData.minimumOrderQuantity),
        available_stock: Number(formData.availableStock),
        delivery_time: formData.deliveryTime,
      });
    } catch (err) {
      setSubmitError(err.message || 'Save nahi hua, dobara try karein');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title={isEditing ? 'Listing edit karein' : 'Naya product add karein'}
      onClose={onCancel}
      footer={
        // A real form element, so Enter submits from any field instead of doing
        // nothing — which on a phone means dismissing the keyboard and hunting
        // for the button.
        <Button type="submit" form="catalogue-listing" fullWidth isLoading={isSaving}>
          {isEditing ? 'Changes save karein' : 'Product add karo'}
        </Button>
      }
    >
      <form id="catalogue-listing" onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
        {isEditing ? (
          <div className="rounded-lg border border-border bg-surface-muted px-3 py-2.5">
            <p className="eyebrow">Product</p>
            <p className="mt-0.5 text-sm font-semibold text-text-primary">{initialData.name}</p>
          </div>
        ) : selection ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary-light px-3 py-2.5">
            <div className="min-w-0">
              <p className="eyebrow">{selection.category}</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
                {selection.label}
              </p>
              {prefill?.variantId === selection.variantId && (
                <p className="mt-0.5 text-2xs text-primary">Opportunity se aaya hai</p>
              )}
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
              label="Product dhoondhein"
              icon={Search}
              type="search"
              placeholder="e.g. Paneer"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              error={errors.product}
            />
            <div className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {isSearching ? (
                <div className="p-3">
                  <SkeletonList rows={3} className="border-0" />
                </div>
              ) : variantChoices.length === 0 ? (
                <p className="p-4 text-center text-sm text-text-muted">Koi product nahi mila.</p>
              ) : (
                variantChoices.map((choice) => (
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
            label="Price (₹ per pack)"
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="0"
            value={formData.price}
            onChange={(e) => handleChange('price', e.target.value)}
            error={errors.price}
          />
          <Input
            label="MOQ (packs)"
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="0"
            value={formData.minimumOrderQuantity}
            onChange={(e) => handleChange('minimumOrderQuantity', e.target.value)}
            error={errors.minimumOrderQuantity}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Input
            label="Available stock (packs)"
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="0"
            value={formData.availableStock}
            onChange={(e) => handleChange('availableStock', e.target.value)}
            error={errors.availableStock}
          />
          <p className="text-2xs text-text-muted">
            Stock status is quantity se khud calculate hota hai.
          </p>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text-secondary">Delivery time</span>
          <select
            className="h-[42px] w-full cursor-pointer rounded-md border border-border-strong bg-surface px-3 text-text-primary transition-colors hover:border-text-faint focus:border-primary focus:outline-none"
            value={formData.deliveryTime}
            onChange={(e) => handleChange('deliveryTime', e.target.value)}
          >
            {APP_CONSTANTS.DELIVERY_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

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
