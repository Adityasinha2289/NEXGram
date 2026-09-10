import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { storage } from '../../../utils/storage';
import { APP_CONSTANTS } from '../../../constants/appConstants';
import { INITIAL_ORDERS_MOCK } from '../../../data/ordersMock';

export function RetailerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // Merge INITIAL_ORDERS_MOCK with any stored orders
    const storedOrders = storage.get(APP_CONSTANTS.STORAGE_KEYS.RETAILER_ORDERS, []);
    // Ensure we only show orders belonging to RET_1 for mock purposes
    const combined = [...INITIAL_ORDERS_MOCK, ...storedOrders].filter(o => o.retailerId === 'RET_1');
    
    // Sort by createdAt descending
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Deduplicate by ID
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
    setOrders(unique);
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case APP_CONSTANTS.ORDER_STATUSES.COMPLETED: return 'success';
      case APP_CONSTANTS.ORDER_STATUSES.CANCELLED: return 'danger';
      case APP_CONSTANTS.ORDER_STATUSES.PENDING: return 'warning';
      default: return 'primary';
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-6 animate-fade-in">
      <header>
        <h2 className="text-2xl font-bold text-text-primary leading-tight">Order Dekho</h2>
        <p className="text-sm text-text-muted mt-1">Aapke current aur past orders.</p>
      </header>

      {orders.length === 0 ? (
        <EmptyState 
          icon={Package}
          title="Koi order nahi hai" 
          description="Aapne abhi tak koi order place nahi kiya hai." 
          actionLabel="Products Dekho"
          onAction={() => navigate('/retailer/distributors')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map(order => (
            <Card 
              key={order.id} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/retailer/orders/${order.id}`)}
            >
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-md text-text-primary">{order.id}</h4>
                    <p className="text-xs text-text-muted">{order.distributorName}</p>
                  </div>
                  <Badge variant={getStatusBadge(order.status)}>{order.status}</Badge>
                </div>
                
                <div className="flex items-center justify-between mt-2 pt-3 border-t border-border">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <Package size={12} /> {order.items.length} Products
                    </span>
                    <span className="font-bold text-primary">₹{order.estimatedTotal.toLocaleString('en-IN')}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-text-muted">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] flex items-center gap-1">
                        <Clock size={10} /> {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <ChevronRight size={18} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
