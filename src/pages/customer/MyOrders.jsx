import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bike, Clock, MapPin, Package, Store } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { List, ListRow, RowChevron } from '../../components/ui/List';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useApiResource } from '../../hooks/useApiResource';
import { storefrontApi } from '../../services/api/storefrontApi';
import { consumerStatusFor } from '../../utils/consumerOrderStatus';

const rupees = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;

export function MyOrders() {
  const navigate = useNavigate();
  const fetcher = useCallback(() => storefrontApi.getMyOrders(), []);
  const { data, isLoading, error, reload } = useApiResource(fetcher, { initialData: [] });
  const orders = data || [];

  return (
    <div className="flex animate-fade-in flex-col gap-5">
      <PageHeader
        eyebrow="Mere order"
        title="Kya aa raha hai"
        description="Aapke aas-paas ki dukaanon se mangwaya hua saman."
      />

      {error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : isLoading ? (
        <SkeletonList rows={3} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Abhi koi order nahi"
          description="Aas-paas ki dukaan se kuch mangwayein — unka ladka ghar tak pahuncha dega."
          actionLabel="Dukaanein dekhein"
          onAction={() => navigate('/shop')}
        />
      ) : (
        <List>
          {orders.map((order) => {
            const status = consumerStatusFor(order.status);
            return (
              <ListRow key={order.id} onClick={() => navigate(`/shop/orders/${order.id}`)}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-sm font-semibold text-text-primary">
                      {order.orderNumber}
                    </span>
                    <Badge variant={status.variant} dot>{status.label}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-2xs text-text-muted">
                    {order.shop?.name} · {order.items.length} item
                  </p>
                </div>
                <span className="num flex-shrink-0 text-sm font-semibold text-text-primary">
                  {rupees(order.total)}
                </span>
                <RowChevron />
              </ListRow>
            );
          })}
        </List>
      )}
    </div>
  );
}

/** One order, and the only action a customer has: calling it back. */
export function MyOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const fetcher = useCallback(() => storefrontApi.getMyOrder(orderId), [orderId]);
  const { data: order, isLoading, error, reload, setData } = useApiResource(fetcher);

  const cancel = async () => {
    try {
      setData(await storefrontApi.cancelMyOrder(orderId));
    } catch {
      reload();
    }
  };

  if (isLoading) return <SkeletonList rows={4} />;
  if (error) return <ErrorState description={error} onRetry={reload} />;
  if (!order) {
    return (
      <EmptyState
        title="Order nahi mila"
        description="Yeh order aapka nahi hai ya exist nahi karta."
        actionLabel="Wapas jayein"
        onAction={() => navigate('/shop/orders')}
      />
    );
  }

  const status = consumerStatusFor(order.status);
  // Once the runner has left, someone is already on a bicycle with the goods -
  // that is the shop's to sort out, not a button.
  const canCancel = order.status === 'placed' || order.status === 'accepted';

  return (
    <div className="flex animate-fade-in flex-col gap-5">
      <PageHeader
        eyebrow={order.orderNumber}
        title={status.label}
        description={
          order.status === 'out_for_delivery'
            ? `${order.runner?.name || 'Delivery waala'} nikal chuka hai — ${order.deliveryEstimate}.`
            : `${order.shop?.name} se · ${order.deliveryEstimate}`
        }
      />

      <ul className="panel divide-y divide-border overflow-hidden">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0 text-sm text-text-primary">
              {item.name}
              {item.variant && <span className="text-text-muted"> {item.variant}</span>}
            </span>
            <span className="num flex-shrink-0 text-sm text-text-secondary">
              {item.quantity} × {rupees(item.unitPrice)}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 bg-surface-muted px-4 py-3">
          <span className="text-sm font-semibold text-text-primary">Kul</span>
          <span className="num text-base font-bold text-text-primary">{rupees(order.total)}</span>
        </li>
      </ul>

      <div className="panel flex flex-col gap-2 px-4 py-3.5">
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Store size={14} className="flex-shrink-0 text-text-muted" /> {order.shop?.name}
        </p>
        {order.distanceKm != null && (
          <p className="num flex items-center gap-2 text-sm text-text-secondary">
            <MapPin size={14} className="flex-shrink-0 text-text-muted" /> {order.distanceKm} km door
          </p>
        )}
        {order.runner && (
          <p className="flex items-center gap-2 text-sm text-text-secondary">
            <Bike size={14} className="flex-shrink-0 text-text-muted" />
            {order.runner.name} ({order.runner.mode === 'cycle' ? 'cycle par' : 'paidal'})
          </p>
        )}
        <p className="flex items-center gap-2 text-2xs text-text-muted">
          <Clock size={12} className="flex-shrink-0" /> {order.deliveryEstimate}
        </p>
        {order.cancelReason && (
          <p className="text-2xs leading-snug text-danger">{order.cancelReason}</p>
        )}
      </div>

      {canCancel && (
        <Button variant="outline" fullWidth onClick={cancel}>
          Order cancel karein
        </Button>
      )}
    </div>
  );
}
