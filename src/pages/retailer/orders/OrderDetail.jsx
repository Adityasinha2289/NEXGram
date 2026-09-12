import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { OrderTimeline } from '../../../components/ui/OrderTimeline';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ordersApi } from '../../../services/api/ordersApi';

const TIMELINE_STEPS = [
  'requested',
  'accepted',
  'preparing',
  'ready',
  'completed'
];

export function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
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

  const currentStepIndex = TIMELINE_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';
  const isRejected = order.status === 'rejected';

  return (
    <div className="flex flex-col gap-6 pb-6 animate-fade-in relative">
      <header className="flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-surface-hover text-text-secondary transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-text-primary leading-tight">{order.order_number}</h2>
          <p className="text-sm text-text-muted mt-0.5">{order.distributor_name}</p>
        </div>
      </header>

      {/* Progress Timeline */}
      <Card className="border-border">
        <CardContent className="p-5">
          <h3 className="font-bold text-md text-text-primary mb-4">Order Status</h3>
          
          {(isCancelled || isRejected) ? (
            <div className="flex items-center gap-2 text-danger">
              <XCircle size={20} />
              <span className="font-bold capitalize">Order {order.status}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4 relative">
              {/* Vertical line connecting steps */}
              <div className="absolute left-3 top-2 bottom-4 w-0.5 bg-border -z-10" />
              
              {TIMELINE_STEPS.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                
                return (
                  <div key={step} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      isCurrent ? 'bg-surface border-primary text-primary' :
                      isCompleted ? 'bg-primary border-primary text-text-inverse' : 
                      'bg-surface border-border text-border'
                    }`}>
                      {isCompleted && !isCurrent ? <CheckCircle2 size={12} /> : <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-primary' : 'bg-transparent'}`} />}
                    </div>
                    <div>
                      <p className={`text-sm capitalize ${isCurrent ? 'font-bold text-text-primary' : isCompleted ? 'font-medium text-text-primary' : 'text-text-muted'}`}>
                        {step}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card className="border-border">
        <CardContent className="p-4">
          <h3 className="font-bold text-md text-text-primary mb-3">Order Items</h3>
          <ul className="flex flex-col gap-3">
            {order.items.map((item, i) => (
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
      
      <OrderTimeline history={order.history} currentStatus={order.status} />

    </div>
  );
}
