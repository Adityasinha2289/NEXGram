import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { OrderTimeline } from '../../../components/ui/OrderTimeline';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ordersApi } from '../../../services/api/ordersApi';

export function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrder = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await ordersApi.getOrderDetail(orderId);
      setOrder(res);
    } catch (err) {
      console.error("Failed to fetch order detail:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const updateOrderStatus = async (newStatus) => {
    try {
      setIsUpdating(true);
      const res = await ordersApi.updateOrderStatus(orderId, { status: newStatus });
      setOrder(res); // update locally
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Status update failed: " + (err.message || "Unknown error"));
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (error || !order) {
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

  // Action Logic based on current API status
  let primaryAction = null;
  let secondaryAction = null;

  switch (order.status) {
    case 'requested':
      primaryAction = { label: 'Accept Karo', action: () => updateOrderStatus('accepted') };
      secondaryAction = { label: 'Reject', action: () => updateOrderStatus('rejected'), variant: 'outline' };
      break;
    case 'accepted':
      primaryAction = { label: 'Start Preparing', action: () => updateOrderStatus('preparing') };
      secondaryAction = { label: 'Cancel', action: () => updateOrderStatus('cancelled'), variant: 'outline' };
      break;
    case 'preparing':
      primaryAction = { label: 'Mark as Ready', action: () => updateOrderStatus('ready') };
      secondaryAction = { label: 'Cancel', action: () => updateOrderStatus('cancelled'), variant: 'outline' };
      break;
    case 'ready':
      primaryAction = { label: 'Complete Order', action: () => updateOrderStatus('completed') };
      break;
    default:
      break; // completed, cancelled, rejected
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'cancelled': 
      case 'rejected': return 'danger';
      case 'requested': return 'warning';
      default: return 'primary';
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-20 animate-fade-in relative h-full">
      <header className="flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-surface-hover text-text-secondary transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-text-primary leading-tight">{order.order_number}</h2>
          <p className="text-sm text-text-muted mt-0.5">{order.retailer_name}</p>
        </div>
      </header>

      {/* Status Info */}
      <Card className="border-border">
        <CardContent className="p-4 flex justify-between items-center bg-surface-muted">
          <div>
            <span className="text-xs text-text-muted block mb-1">Current Status</span>
            <Badge variant={getStatusBadge(order.status)} className="text-sm py-1 capitalize">{order.status}</Badge>
          </div>
          <div className="text-right">
            <span className="text-xs text-text-muted block mb-1">Ordered On</span>
            <span className="text-sm font-medium text-text-primary">{new Date(order.created_at).toLocaleDateString('en-IN')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card className="border-border">
        <CardContent className="p-4">
          <h3 className="font-bold text-base text-text-primary mb-3">Order Items</h3>
          <ul className="flex flex-col gap-3">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between items-start text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <div>
                  <span className="font-medium text-text-primary block">{item.product_name} ({item.variant_name})</span>
                  <span className="text-xs text-text-muted">{item.quantity} units @ ₹{item.unit_price}</span>
                </div>
                <span className="font-medium text-text-primary">₹{item.line_total.toLocaleString('en-IN')}</span>
              </li>
            ))}
          </ul>
          
          <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
            <span className="font-bold text-text-muted text-sm">Total Amount</span>
            <span className="font-bold text-lg text-primary">₹{order.total.toLocaleString('en-IN')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      {(primaryAction || secondaryAction) && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface border-t border-border flex gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          {secondaryAction && (
            <Button variant={secondaryAction.variant} fullWidth onClick={secondaryAction.action} disabled={isUpdating}>
              {secondaryAction.label}
            </Button>
          )}
          {primaryAction && (
            <Button variant="primary" fullWidth onClick={primaryAction.action} disabled={isUpdating}>
              {isUpdating ? <Loader2 size={20} className="animate-spin mx-auto" /> : primaryAction.label}
            </Button>
          )}
        </div>
      )}

      <OrderTimeline history={order.history} currentStatus={order.status} />

    </div>
  );
}
