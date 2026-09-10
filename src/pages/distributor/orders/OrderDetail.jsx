import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { storage } from '../../../utils/storage';
import { APP_CONSTANTS } from '../../../constants/appConstants';
import { INITIAL_ORDERS_MOCK } from '../../../data/ordersMock';

export function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = () => {
    const storedOrders = storage.get(APP_CONSTANTS.STORAGE_KEYS.DISTRIBUTOR_ORDERS, []);
    const combined = [...INITIAL_ORDERS_MOCK, ...storedOrders];
    // Deduplicate favoring storedOrders (which would have newer status)
    const uniqueMap = new Map(combined.map(item => [item.id, item]));
    const found = uniqueMap.get(orderId);
    setOrder(found || null);
  };

  const updateOrderStatus = (newStatus) => {
    const updatedOrder = { ...order, status: newStatus };
    setOrder(updatedOrder);

    // Save to local storage mock override
    const storedOrders = storage.get(APP_CONSTANTS.STORAGE_KEYS.DISTRIBUTOR_ORDERS, []);
    const filtered = storedOrders.filter(o => o.id !== order.id);
    filtered.push(updatedOrder);
    storage.set(APP_CONSTANTS.STORAGE_KEYS.DISTRIBUTOR_ORDERS, filtered);
    
    // In a real app we'd also update Retailer orders or the single source of truth
    const retailerOrders = storage.get(APP_CONSTANTS.STORAGE_KEYS.RETAILER_ORDERS, []);
    const rFiltered = retailerOrders.filter(o => o.id !== order.id);
    rFiltered.push(updatedOrder);
    storage.set(APP_CONSTANTS.STORAGE_KEYS.RETAILER_ORDERS, rFiltered);
  };

  if (!order) {
    return (
      <div className="py-12">
        <EmptyState 
          title="Order Not Found" 
          description="Yeh order exist nahi karta." 
          actionLabel="Go Back"
          onAction={() => navigate(-1)}
        />
      </div>
    );
  }

  // Action Logic
  let primaryAction = null;
  let secondaryAction = null;

  switch (order.status) {
    case APP_CONSTANTS.ORDER_STATUSES.PENDING:
      primaryAction = { label: 'Accept Karo', action: () => updateOrderStatus(APP_CONSTANTS.ORDER_STATUSES.CONFIRMED) };
      secondaryAction = { label: 'Reject', action: () => updateOrderStatus(APP_CONSTANTS.ORDER_STATUSES.CANCELLED), variant: 'outline' };
      break;
    case APP_CONSTANTS.ORDER_STATUSES.CONFIRMED:
      primaryAction = { label: 'Start Preparing', action: () => updateOrderStatus(APP_CONSTANTS.ORDER_STATUSES.PREPARING) };
      break;
    case APP_CONSTANTS.ORDER_STATUSES.PREPARING:
      primaryAction = { label: 'Mark as Ready', action: () => updateOrderStatus(APP_CONSTANTS.ORDER_STATUSES.READY) };
      break;
    case APP_CONSTANTS.ORDER_STATUSES.READY:
      primaryAction = { label: 'Complete Order', action: () => updateOrderStatus(APP_CONSTANTS.ORDER_STATUSES.COMPLETED) };
      break;
    default:
      break; // Completed or Cancelled
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case APP_CONSTANTS.ORDER_STATUSES.COMPLETED: return 'success';
      case APP_CONSTANTS.ORDER_STATUSES.CANCELLED: return 'danger';
      case APP_CONSTANTS.ORDER_STATUSES.PENDING: return 'warning';
      default: return 'primary';
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-20 animate-fade-in relative h-full">
      <header className="flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-surface-muted text-text-muted transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-text-primary leading-tight">{order.id}</h2>
          <p className="text-sm text-text-muted mt-0.5">{order.retailerName}</p>
        </div>
      </header>

      {/* Status Info */}
      <Card className="border-border">
        <CardContent className="p-4 flex justify-between items-center bg-surface-muted">
          <div>
            <span className="text-xs text-text-muted block mb-1">Current Status</span>
            <Badge variant={getStatusBadge(order.status)} className="text-sm py-1">{order.status}</Badge>
          </div>
          <div className="text-right">
            <span className="text-xs text-text-muted block mb-1">Ordered On</span>
            <span className="text-sm font-medium text-text-primary">{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card className="border-border">
        <CardContent className="p-4">
          <h3 className="font-bold text-md text-text-primary mb-3">Order Details</h3>
          <ul className="flex flex-col gap-3">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between items-start text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <div>
                  <span className="font-medium text-text-primary block">{item.name}</span>
                  <span className="text-xs text-text-muted">{item.quantity} {item.unit}</span>
                </div>
                <span className="font-medium text-text-primary">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
              </li>
            ))}
          </ul>
          
          <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
            <span className="font-bold text-text-muted text-sm">Estimated Total</span>
            <span className="font-bold text-lg text-primary">₹{order.estimatedTotal.toLocaleString('en-IN')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      {(primaryAction || secondaryAction) && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface border-t border-border flex gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          {secondaryAction && (
            <Button variant={secondaryAction.variant} fullWidth onClick={secondaryAction.action}>
              {secondaryAction.label}
            </Button>
          )}
          {primaryAction && (
            <Button variant="primary" fullWidth onClick={primaryAction.action}>
              {primaryAction.label}
            </Button>
          )}
        </div>
      )}

    </div>
  );
}
