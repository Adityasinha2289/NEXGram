import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Check } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { storage } from '../../../utils/storage';
import { APP_CONSTANTS } from '../../../constants/appConstants';
import { INITIAL_ORDERS_MOCK } from '../../../data/ordersMock';

export function Reorder() {
  const navigate = useNavigate();
  const [reorderItems, setReorderItems] = useState([]);
  const [currentPack, setCurrentPack] = useState([]);

  useEffect(() => {
    // Load developer pack state
    const pack = storage.get(APP_CONSTANTS.STORAGE_KEYS.DEVELOPER_PACK, []);
    setCurrentPack(pack);

    // Load past orders and extract completed/confirmed products
    const storedOrders = storage.get(APP_CONSTANTS.STORAGE_KEYS.RETAILER_ORDERS, []);
    const combined = [...INITIAL_ORDERS_MOCK, ...storedOrders].filter(o => o.retailerId === 'RET_1');
    
    // Filter for valid past statuses
    const validOrders = combined.filter(o => 
      o.status === APP_CONSTANTS.ORDER_STATUSES.COMPLETED || 
      o.status === APP_CONSTANTS.ORDER_STATUSES.CONFIRMED
    );

    // Extract items and deduplicate by item ID, keeping the most recent order's detail
    const itemsMap = new Map();
    validOrders.forEach(order => {
      order.items.forEach(item => {
        if (!itemsMap.has(item.id)) {
          itemsMap.set(item.id, {
            ...item,
            lastOrderedDate: order.createdAt,
            distributorName: order.distributorName,
            orderId: order.id
          });
        }
      });
    });

    setReorderItems(Array.from(itemsMap.values()));
  }, []);

  const handleAddToPack = (item) => {
    if (currentPack.some(p => p.id === item.id)) return;
    
    const newPack = [...currentPack, {
      id: item.id,
      name: item.name,
      category: item.category || 'General', // Fallback if missing from order mock
      unit: item.unit,
      price: item.price
    }];
    
    setCurrentPack(newPack);
    storage.set(APP_CONSTANTS.STORAGE_KEYS.DEVELOPER_PACK, newPack);
  };

  return (
    <div className="flex flex-col gap-5 pb-6 animate-fade-in">
      <header>
        <h2 className="text-2xl font-bold text-text-primary leading-tight">Quick Reorder</h2>
        <p className="text-sm text-text-muted mt-1">Aapke pehle mangwaye gaye products wapas pack mein add karein.</p>
      </header>

      {reorderItems.length === 0 ? (
        <EmptyState 
          icon={Package}
          title="Koi past order nahi" 
          description="Aapne abhi tak koi order complete nahi kiya hai." 
          actionLabel="Products Dekho"
          onAction={() => navigate('/retailer/distributors')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {reorderItems.map((item, index) => {
            const inPack = currentPack.some(p => p.id === item.id);
            return (
              <Card key={`${item.id}-${index}`} className={`border-border ${inPack ? 'bg-primary/5 border-primary/20' : ''}`}>
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-md text-text-primary">{item.name}</h4>
                      <p className="text-xs text-text-muted mt-0.5">Supplier: {item.distributorName}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-primary block">₹{item.price}</span>
                      <span className="text-[10px] text-text-muted">/ {item.unit}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1 pt-3 border-t border-border">
                    <span className="text-xs text-text-muted">
                      Last ordered: {new Date(item.lastOrderedDate).toLocaleDateString()}
                    </span>
                    
                    <Button 
                      variant={inPack ? "ghost" : "outline"} 
                      size="sm" 
                      icon={inPack ? Check : Plus}
                      onClick={() => handleAddToPack(item)}
                      disabled={inPack}
                      className={inPack ? "text-success border-success/20 bg-success/5" : ""}
                    >
                      {inPack ? "Pack mein hai" : "Pack Mein Add"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Floating Pack Summary */}
      {currentPack.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-10">
          <div 
            className="bg-primary text-text-inverse px-4 py-3 rounded-lg shadow-lg flex justify-between items-center cursor-pointer hover:bg-primary-dark transition-colors" 
            onClick={() => navigate('/retailer/developer-pack')}
          >
            <span className="text-sm font-medium">Developer Pack: {currentPack.length} items</span>
            <span className="text-xs font-bold uppercase tracking-wider">Pack Dekho &rarr;</span>
          </div>
        </div>
      )}
    </div>
  );
}
