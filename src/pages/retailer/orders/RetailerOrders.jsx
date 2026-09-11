import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ordersApi } from '../../../services/api/ordersApi';

export function RetailerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await ordersApi.getOrders({});
      setOrders(res.items || []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'success';
      case 'cancelled':
      case 'rejected': return 'danger';
      case 'draft':
      case 'requested': return 'warning';
      default: return 'primary'; // accepted, preparing, ready
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="flex flex-col gap-5 pb-6 animate-fade-in h-full">
      <header>
        <h2 className="text-2xl font-bold text-text-primary leading-tight">Order Dekho</h2>
        <p className="text-sm text-text-muted mt-1">Aapke current aur past orders.</p>
      </header>

      {orders.length === 0 ? (
        <div className="py-12">
          <EmptyState 
            icon={Package}
            title="Koi order nahi hai" 
            description="Aapne abhi tak koi order place nahi kiya hai." 
            actionLabel="Products Dekho"
            onAction={() => navigate('/retailer/distributors')}
          />
        </div>
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
                    <h4 className="font-bold text-md text-text-primary">{order.order_number}</h4>
                    <p className="text-xs text-text-muted">{order.distributor_name}</p>
                  </div>
                  <Badge variant={getStatusBadge(order.status)} className="capitalize">{order.status}</Badge>
                </div>
                
                <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/50">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <Package size={12} /> {order.item_count} Products
                    </span>
                    <span className="font-bold text-primary">₹{order.total.toLocaleString('en-IN')}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-text-muted">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] flex items-center gap-1">
                        <Clock size={10} /> {new Date(order.created_at).toLocaleDateString()}
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
