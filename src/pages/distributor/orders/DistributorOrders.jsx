import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ordersApi } from '../../../services/api/ordersApi';

export function DistributorOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

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
      case 'requested': return 'warning';
      default: return 'primary'; // accepted, preparing, ready
    }
  };

  const tabs = [
    { label: 'All', value: 'all' },
    { label: 'Requested', value: 'requested' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Preparing', value: 'preparing' },
    { label: 'Ready', value: 'ready' },
    { label: 'Completed', value: 'completed' }
  ];

  const filteredOrders = activeTab === 'all' 
    ? orders 
    : orders.filter(o => o.status === activeTab);

  if (isLoading) {
    return <div className="flex justify-center items-center h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="flex flex-col gap-5 pb-6 animate-fade-in h-full">
      <header>
        <h2 className="text-2xl font-bold text-text-primary leading-tight">Orders</h2>
        <p className="text-sm text-text-muted mt-1">Manage incoming requests from retailers.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.value 
                ? 'bg-primary text-text-inverse shadow-sm' 
                : 'bg-surface border border-border text-text-muted hover:bg-surface-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="py-12">
          <EmptyState 
            icon={Package}
            title="Koi order nahi hai" 
            description="Is category mein abhi koi order nahi hai." 
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredOrders.map(order => (
            <Card 
              key={order.id} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/distributor/orders/${order.id}`)}
            >
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-md text-text-primary">{order.order_number}</h4>
                    <p className="text-xs text-text-muted font-medium">{order.retailer_name}</p>
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
