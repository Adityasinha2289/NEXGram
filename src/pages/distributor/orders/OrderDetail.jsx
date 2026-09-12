import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { OrderDetailView } from '../../../components/orders/OrderDetailView';
import { Skeleton, SkeletonList } from '../../../components/ui/Skeleton';
import { ordersApi } from '../../../services/api/ordersApi';
import { useApiResource } from '../../../hooks/useApiResource';

/**
 * What a distributor can do next, by where the order currently is. Mirrors the
 * transitions the backend will accept, so a button never offers a move the
 * server is going to refuse.
 */
const NEXT_MOVES = {
  requested: {
    primary: { label: 'Accept karein', to: 'accepted' },
    secondary: { label: 'Reject karein', to: 'rejected' },
  },
  accepted: {
    primary: { label: 'Taiyari shuru karein', to: 'preparing' },
    secondary: { label: 'Cancel karein', to: 'cancelled' },
  },
  preparing: {
    primary: { label: 'Ready mark karein', to: 'ready' },
    secondary: { label: 'Cancel karein', to: 'cancelled' },
  },
  ready: {
    primary: { label: 'Poora hua mark karein', to: 'completed' },
  },
};

export function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  const fetcher = useCallback(() => ordersApi.getOrderDetail(orderId), [orderId]);
  const { data: order, isLoading, error, reload, setData } = useApiResource(fetcher);

  const move = async (status) => {
    setIsUpdating(true);
    setUpdateError(null);
    try {
      // A window.alert() blocks the page and says nothing useful; the failure
      // belongs next to the control that caused it.
      const updated = await ordersApi.updateOrderStatus(orderId, { status });
      setData(updated);
    } catch (err) {
      setUpdateError(err.message || 'Status update nahi ho paya. Dobara try karein.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-[55%] max-w-[280px]" />
        <SkeletonList rows={3} />
      </div>
    );
  }

  if (error) return <ErrorState description={error} onRetry={reload} />;

  if (!order) {
    return (
      <EmptyState
        title="Order nahi mila"
        description="Yeh order exist nahi karta ya aapka nahi hai."
        actionLabel="Wapas jayein"
        onAction={() => navigate(-1)}
      />
    );
  }

  const moves = NEXT_MOVES[order.status];

  return (
    <OrderDetailView
      order={order}
      counterpartyLabel="Retailer"
      counterpartyName={order.retailer_name}
      actions={(moves || updateError) && (
        <div className="flex flex-col gap-3">
          {updateError && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2.5 text-sm leading-snug text-danger"
            >
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" strokeWidth={2} />
              {updateError}
            </p>
          )}
          {moves && (
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                fullWidth
                isLoading={isUpdating}
                onClick={() => move(moves.primary.to)}
              >
                {moves.primary.label}
              </Button>
              {moves.secondary && (
                <Button
                  variant="outline"
                  fullWidth
                  disabled={isUpdating}
                  onClick={() => move(moves.secondary.to)}
                >
                  {moves.secondary.label}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    />
  );
}
