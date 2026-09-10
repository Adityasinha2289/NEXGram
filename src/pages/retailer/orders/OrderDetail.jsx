import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, PackageOpen } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { storage } from '../../../utils/storage';
import { APP_CONSTANTS } from '../../../constants/appConstants';
import { INITIAL_ORDERS_MOCK } from '../../../data/ordersMock';

const TIMELINE_STEPS = [
  APP_CONSTANTS.ORDER_STATUSES.PENDING,
  APP_CONSTANTS.ORDER_STATUSES.CONFIRMED,
  APP_CONSTANTS.ORDER_STATUSES.PREPARING,
  APP_CONSTANTS.ORDER_STATUSES.READY,
  APP_CONSTANTS.ORDER_STATUSES.COMPLETED
];

export function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const storedOrders = storage.get(APP_CONSTANTS.STORAGE_KEYS.RETAILER_ORDERS, []);
    const combined = [...INITIAL_ORDERS_MOCK, ...storedOrders];
    const found = combined.find(o => o.id === orderId);
    setOrder(found || null);
  }, [orderId]);

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

  const currentStepIndex = TIMELINE_STEPS.indexOf(order.status);
  const isCancelled = order.status === APP_CONSTANTS.ORDER_STATUSES.CANCELLED;

  return (
    <div className="flex flex-col gap-6 pb-6 animate-fade-in">
      <header className="flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-surface-muted text-text-muted transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-text-primary leading-tight">{order.id}</h2>
          <p className="text-sm text-text-muted mt-0.5">{order.distributorName}</p>
        </div>
      </header>

      {/* Progress Timeline */}
      <Card className="border-border">
        <CardContent className="p-5">
          <h3 className="font-bold text-md text-text-primary mb-4">Order Status</h3>
          
          {isCancelled ? (
            <div className="flex items-center gap-2 text-danger">
              <CheckCircle2 size={20} />
              <span className="font-bold">Order Cancelled</span>
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
                      <p className={`text-sm ${isCurrent ? 'font-bold text-text-primary' : isCompleted ? 'font-medium text-text-primary' : 'text-text-muted'}`}>
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
          <h3 className="font-bold text-md text-text-primary mb-3">Order Summary</h3>
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

    </div>
  );
}
