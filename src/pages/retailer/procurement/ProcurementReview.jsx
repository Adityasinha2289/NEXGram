import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, CheckCircle, Store, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useBasket } from '../../../context/useBasket';
import { ordersApi } from '../../../services/api/ordersApi';
import { ErrorState } from '../../../components/ui/ErrorState';

const rupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

export function ProcurementReview() {
  const navigate = useNavigate();
  const { basket, updateQuantity, removeItem, clearBasket } = useBasket();
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState(null);
  const [successOrders, setSuccessOrders] = useState([]);

  const distributorIds = Object.keys(basket);
  
  const totalAmount = distributorIds.reduce((sum, distId) => {
    const items = Object.values(basket[distId].items);
    return sum + items.reduce((itemSum, item) => itemSum + (item.quantity * item.product.price), 0);
  }, 0);

  const placeOrders = async () => {
    setIsPlacing(true);
    setError(null);
    const placed = [];
    
    try {
      // Place order for each distributor group
      for (const distId of distributorIds) {
        const distData = basket[distId];
        const lines = Object.values(distData.items);
        
        if (lines.length === 0) continue;

        const order = await ordersApi.createOrder({
          distributor_id: distId,
          items: lines.map((line) => ({
            catalogue_item_id: line.product.id,
            quantity: line.quantity,
          })),
          notes: 'Procurement Basket se order',
        });
        
        placed.push(order);
        // Clear this distributor's basket immediately upon success
        clearBasket(distId);
      }
      
      setSuccessOrders(placed);
    } catch (err) {
      setError(err.message || 'Kuch orders nahi ja paaye. Kripya basket verify karein.');
    } finally {
      setIsPlacing(false);
    }
  };

  if (successOrders.length > 0 && Object.keys(basket).length === 0) {
    return (
      <div className="flex animate-fade-in flex-col gap-5 pt-8">
        <EmptyState
          icon={CheckCircle}
          title="Orders Placed Successfully"
          description={`${successOrders.length} supplier(s) ko order bhej diye gaye hain.`}
          actionLabel="Orders dekhein"
          onAction={() => navigate('/retailer/orders')}
        />
      </div>
    );
  }

  if (distributorIds.length === 0) {
    return (
      <div className="flex animate-fade-in flex-col gap-5 pt-8">
        <EmptyState
          icon={ShoppingCart}
          title="Basket Khaali Hai"
          description="Aapne abhi tak procurement basket mein kuch nahi daala hai."
          actionLabel="Products dhoondhein"
          onAction={() => navigate('/retailer/products')}
        />
      </div>
    );
  }

  return (
    <div className="flex animate-fade-in flex-col gap-5 pb-24">
      <PageHeader
        eyebrow="Review"
        title="Procurement Basket"
        description="Aapki selected items alag-alag suppliers se."
      />

      {error && <ErrorState description={error} onRetry={() => setError(null)} />}

      <div className="flex flex-col gap-4">
        {distributorIds.map((distId) => {
          const distData = basket[distId];
          const items = Object.values(distData.items);
          const distTotal = items.reduce((sum, item) => sum + (item.quantity * item.product.price), 0);

          return (
            <div key={distId} className="panel overflow-hidden">
              <div className="bg-surface-muted px-4 py-3 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <Store size={16} className="text-text-muted" />
                  {distData.distributorName}
                </div>
                <div className="text-sm font-semibold text-text-primary">
                  {rupees(distTotal)}
                </div>
              </div>
              
              <ul className="divide-y divide-border">
                {items.map((item) => {
                  const p = item.product;
                  const qty = item.quantity;
                  
                  return (
                    <li key={p.id} className="p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-text-primary">{p.name}</h4>
                          <p className="text-xs text-text-secondary mt-0.5">{p.variant} &middot; {p.category}</p>
                          <p className="text-xs text-text-muted mt-1">
                            {rupees(p.price)} / unit &middot; MOQ: {p.minimumOrderQuantity}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="block text-sm font-semibold text-text-primary">
                            {rupees(p.price * qty)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        {qty < p.minimumOrderQuantity && (
                          <div className="flex items-center gap-1 text-xs text-error font-medium">
                            <AlertCircle size={14} /> Min {p.minimumOrderQuantity} chahiye
                          </div>
                        )}
                        <div className="flex items-center gap-3 ml-auto">
                          <button
                            type="button"
                            onClick={() => removeItem(p.id, distId)}
                            className="text-xs font-medium text-error hover:text-error-hover"
                          >
                            Hatao
                          </button>
                          
                          <div className="flex items-center gap-3 rounded-full border border-border bg-surface px-1 py-0.5">
                            <button
                              type="button"
                              disabled={qty <= p.minimumOrderQuantity}
                              onClick={() => updateQuantity(p.id, qty - 1, distId)}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted text-lg font-medium text-text-secondary disabled:opacity-30"
                            >
                              &minus;
                            </button>
                            <span className="w-4 text-center text-sm font-semibold">{qty}</span>
                            <button
                              type="button"
                              disabled={qty >= p.availableStock}
                              onClick={() => updateQuantity(p.id, qty + 1, distId)}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted text-lg font-medium text-text-secondary disabled:opacity-30"
                            >
                              &#43;
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-14 left-0 right-0 z-20 mx-auto max-w-md border-t border-border bg-surface p-4 shadow-elevated env-safe-bottom">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-muted">Total amount</p>
            <p className="text-sm text-text-secondary">{distributorIds.length} supplier(s)</p>
          </div>
          <p className="text-xl font-bold text-text-primary">{rupees(totalAmount)}</p>
        </div>
        
        <button
          type="button"
          disabled={isPlacing || totalAmount === 0}
          onClick={placeOrders}
          className="btn btn-primary w-full"
        >
          {isPlacing ? 'Orders bhej rahe hain...' : 'Sabhi Orders Bhejo'}
        </button>
      </div>
    </div>
  );
}
