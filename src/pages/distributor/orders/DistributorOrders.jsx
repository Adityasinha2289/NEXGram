import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { storage } from '../../../utils/storage';
import { APP_CONSTANTS } from '../../../constants/appConstants';
import { INITIAL_ORDERS_MOCK } from '../../../data/ordersMock';

export function DistributorOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    // Merge INITIAL_ORDERS_MOCK with stored orders
    const storedOrders = storage.get(APP_CONSTANTS.STORAGE_KEYS.DISTRIBUTOR_ORDERS, []);
    // For mock purposes, assume we are 'dist_1'
    const combined = [...INITIAL_ORDERS_MOCK, ...storedOrders].filter(o => o.distributorId === 'dist_1');
    
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

  const tabs = ['All', 'Pending Confirmation', 'Confirmed', 'Preparing', 'Ready', 'Completed'];

  const filteredOrders = activeTab === 'All' 
    ? orders 
    : orders.filter(o => o.status === activeTab);

  return (
    <div className="flex flex-col gap-5 pb-6 animate-fade-in">
      <header>
        <h2 className="text-2xl font-bold text-text-primary leading-tight">Orders</h2>
        <p className="text-sm text-text-muted mt-1">Manage incoming requests from retailers.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab 
                ? 'bg-primary text-text-inverse shadow-sm' 
                : 'bg-surface border border-border text-text-muted hover:bg-surface-muted'
            }`}
          >
            {tab === 'Pending Confirmation' ? 'Pending' : tab}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState 
          icon={Package}
          title="Koi order nahi hai" 
          description="Is category mein abhi koi order nahi hai." 
        />
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
                    <h4 className="font-bold text-md text-text-primary">{order.id}</h4>
                    <p className="text-xs text-text-muted font-medium">{order.retailerName}</p>
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
