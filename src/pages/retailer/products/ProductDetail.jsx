import { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Store, Truck, Check, PackageOpen } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { FilterChips } from '../../../components/ui/FilterChips';
import { useApiResource } from '../../../hooks/useApiResource';
import { productsApi } from '../../../services/api/productsApi';
import { useBasket } from '../../../context/useBasket';

const rupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

export function ProductDetail() {
  const { productId } = useParams();
  const { addItem, getQuantity } = useBasket();
  
  const fetcher = useCallback(() => productsApi.getProductWithSuppliers(productId), [productId]);
  const { data: product, isLoading, error, reload } = useApiResource(fetcher);
  
  const [selectedVariantId, setSelectedVariantId] = useState('All');
  
  const variants = useMemo(() => {
    if (!product?.variants) return [];
    return [
      { value: 'All', label: 'Sabhi sizes' },
      ...product.variants.map(v => ({ value: v.id, label: `${v.variant_name} ${v.pack_size || ''}`.trim() }))
    ];
  }, [product]);

  const filteredOffers = useMemo(() => {
    if (!product?.offers) return [];
    return selectedVariantId === 'All' 
      ? product.offers 
      : product.offers.filter(o => o.variant_id === selectedVariantId);
  }, [product, selectedVariantId]);

  if (error) return <ErrorState description={error} onRetry={reload} />;
  if (isLoading || !product) return <div className="p-4"><SkeletonList rows={6} /></div>;

  return (
    <div className="flex animate-fade-in flex-col gap-6 pb-20">
      <div className="px-4 pt-4">
        <PageHeader
          eyebrow={product.category?.name || 'Product'}
          title={product.canonical_name}
          description={product.description || 'Compare local suppliers and prices.'}
        />
        {product.brand && (
          <Badge variant="neutral" className="mt-3">{product.brand}</Badge>
        )}
      </div>

      {variants.length > 2 && (
        <div className="px-4">
          <FilterChips
            name="variant-filter"
            label="Variant chunen"
            options={variants}
            value={selectedVariantId}
            onChange={setSelectedVariantId}
          />
        </div>
      )}

      <div className="px-4">
        <h3 className="mb-4 text-sm font-semibold text-text-primary uppercase tracking-wider">
          Available Suppliers
        </h3>
        
        {filteredOffers.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title="Koi supplier nahi mila"
            description="Is product ke liye abhi koi local supplier available nahi hai."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {filteredOffers.map((offer) => {
              const basketQty = getQuantity(offer.distributor_id, offer.id);
              
              return (
                <li key={offer.id} className="panel p-4 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 text-sm font-semibold text-text-primary">
                        <Store size={14} className="flex-shrink-0 text-text-muted" />
                        <span className="truncate">{offer.distributor_name}</span>
                      </div>
                      
                      <p className="text-sm text-text-secondary">
                        {offer.variant_name} {offer.pack_size}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-2xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <PackageOpen size={12} /> MOQ {offer.moq}
                        </span>
                        {offer.stock > 0 ? (
                          <span className="text-success">Stock: {offer.stock}</span>
                        ) : (
                          <span className="text-error">Out of stock</span>
                        )}
                        {offer.distributor_location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> {offer.distributor_location}
                          </span>
                        )}
                        {offer.delivery_time && (
                          <span className="flex items-center gap-1">
                            <Truck size={12} /> {offer.delivery_time}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <span className="block text-lg font-bold text-text-primary">
                        {rupees(offer.price)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-border">
                    <button
                      type="button"
                      disabled={offer.stock < offer.moq}
                      onClick={() => {
                        const productForBasket = {
                          id: offer.id, // Catalogue item ID
                          name: product.canonical_name,
                          variant: `${offer.variant_name} ${offer.pack_size || ''}`.trim(),
                          category: product.category?.name || 'Uncategorised',
                          price: offer.price,
                          minimumOrderQuantity: offer.moq,
                          availableStock: offer.stock,
                          stockStatus: offer.stock_status,
                          deliveryTime: offer.delivery_time,
                        };
                        addItem(productForBasket, offer.distributor_id, offer.distributor_name);
                      }}
                      className={`btn btn-sm ${basketQty > 0 ? 'bg-success/10 text-success hover:bg-success/20' : 'btn-primary'}`}
                    >
                      {basketQty > 0 ? (
                        <span className="flex items-center gap-1.5">
                          <Check size={14} /> Basket mein {basketQty}
                        </span>
                      ) : (
                        'Add to Basket'
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
