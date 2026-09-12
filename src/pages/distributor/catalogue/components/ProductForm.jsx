import { useEffect, useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner';
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
        .then(res => { if (!cancelled) setProducts(res.items || []); })
        .catch(() => { if (!cancelled) setProducts([]); })
        .finally(() => { if (!cancelled) setIsSearching(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, isEditing, selection]);

  const variantChoices = useMemo(
    () => products.flatMap(product =>
      (product.variants || []).map(variant => ({
        variantId: variant.id,
        label: `${product.canonical_name} ${variant.variant_name}`,
        category: product.category?.name || 'Uncategorised',
        unit: variant.unit || 'unit',
      }))
    ),
    [products],
  );

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
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

  const handleSubmit = async () => {
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
    <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center animate-fade-in pointer-events-none">
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={onCancel} />

      <div className="bg-surface w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl flex flex-col pointer-events-auto shadow-lg relative z-10">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-surface z-20">
          <h2 className="font-bold text-lg text-text-primary">
            {isEditing ? 'Edit Listing' : 'Naya Product Add Karein'}
          </h2>
          <button onClick={onCancel} className="p-2 text-text-muted hover:bg-surface-muted rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {isEditing ? (
            <div className="bg-surface-muted border border-border rounded-lg p-3">
              <p className="eyebrow">Product</p>
              <p className="font-bold text-text-primary">{initialData.name}</p>
            </div>
          ) : selection ? (
            <div className="bg-primary-light border border-primary/20 rounded-lg p-3 flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">{selection.category}</p>
                <p className="font-bold text-text-primary">{selection.label}</p>
                {prefill?.variantId === selection.variantId && (
                  <p className="text-2xs text-primary mt-0.5">Opportunity se aaya hai</p>
                )}
              </div>
              <button
                onClick={() => setSelection(null)}
                className="text-xs font-medium text-primary hover:underline flex-shrink-0"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Input
                label="Product Dhoondhein"
                icon={Search}
                placeholder="e.g. Paneer"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                error={errors.product}
              />
              <div className="border border-border rounded-lg max-h-56 overflow-y-auto divide-y divide-border">
                {isSearching ? (
                  <LoadingSpinner />
                ) : variantChoices.length === 0 ? (
                  <p className="p-4 text-sm text-text-muted text-center">Koi product nahi mila.</p>
                ) : (
                  variantChoices.map(choice => (
                    <button
                      key={choice.variantId}
                      onClick={() => setSelection(choice)}
                      className="w-full text-left p-3 hover:bg-surface-muted flex items-center justify-between gap-2"
                    >
                      <span>
                        <span className="block eyebrow">
                          {choice.category}
                        </span>
                        <span className="font-medium text-sm text-text-primary">{choice.label}</span>
                      </span>
                      <Check size={16} className="text-primary opacity-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price (₹)"
              type="number"
              placeholder="0"
              value={formData.price}
              onChange={(e) => handleChange('price', e.target.value)}
              error={errors.price}
            />
            <Input
              label="MOQ"
              type="number"
              placeholder="0"
              value={formData.minimumOrderQuantity}
              onChange={(e) => handleChange('minimumOrderQuantity', e.target.value)}
              error={errors.minimumOrderQuantity}
            />
          </div>

          <Input
            label="Available Stock"
            type="number"
            placeholder="0"
            value={formData.availableStock}
            onChange={(e) => handleChange('availableStock', e.target.value)}
            error={errors.availableStock}
          />
          <p className="text-xs text-text-muted italic -mt-2 ml-1">
            Stock status quantity se automatically calculate hota hai.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-text-primary ml-1" htmlFor="delivery-time">Delivery Time</label>
            <select
              id="delivery-time"
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
              value={formData.deliveryTime}
              onChange={(e) => handleChange('deliveryTime', e.target.value)}
            >
              {APP_CONSTANTS.DELIVERY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {submitError && <p className="text-sm text-danger">{submitError}</p>}
        </div>

        <div className="p-4 border-t border-border sticky bottom-0 bg-surface z-20">
          <Button fullWidth onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Product Add Karo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
