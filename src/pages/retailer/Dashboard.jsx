import { PackageOpen, Clock, Package } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { MOCK_USER, MOCK_ORDERS } from '../../data/mockData';

export function RetailerDashboard() {
  const { name, pendingOrders, recentActivity } = MOCK_USER.retailer;
  const recentOrders = MOCK_ORDERS;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold">Namaste, {name}!</h2>
        <p className="text-muted">Aaj ka business kaisa chal raha hai?</p>
      </header>

      <div className="flex gap-4">
        <Card className="flex-1 bg-surface border-border">
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
            <PackageOpen className="text-primary" size={24} />
            <div className="text-center">
              <p className="text-xs text-muted">Pending Orders</p>
              <p className="text-xl font-bold text-primary">{pendingOrders}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="flex-1 bg-surface border-border">
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
            <Clock className="text-secondary" size={24} />
            <div className="text-center">
              <p className="text-xs text-muted">Recent Activity</p>
              <p className="text-sm font-bold text-secondary mt-1 line-clamp-2 leading-tight">
                {recentActivity}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Recent Orders</h3>
          <Button variant="ghost" size="sm">Sab Dekho</Button>
        </div>
        
        {recentOrders.length > 0 ? (
          <div className="flex flex-col gap-3">
            {recentOrders.map(order => (
              <Card key={order.id} interactive>
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-surface-muted rounded-lg">
                      <Package size={20} className="text-muted" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{order.id}</p>
                      <p className="text-xs text-muted">{order.date} • {order.items} items</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={order.status === 'Delivered' ? 'success' : 'warning'}>
                      {order.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState 
            title="Koi Order Nahi Hai" 
            description="Aapne abhi tak koi order place nahi kiya hai." 
            actionLabel="Order Karein"
            onAction={() => {}}
          />
        )}
      </section>

      <section className="mt-4">
        <Card className="bg-primary text-text-inverse border-none">
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <h3 className="font-bold text-lg">AI Business Copilot</h3>
            <p className="text-sm opacity-90">Apne business ko badhane ke naye tarike seekhein.</p>
            <Button variant="secondary" className="mt-2 w-full">Baat Karein</Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
