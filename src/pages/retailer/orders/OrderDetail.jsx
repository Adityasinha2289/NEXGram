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
 * The states a retailer can still call an order back from.
 *
 * Mirrors the server's transition table, which accepts `cancelled` from these
 * three and nothing else. The screen previously offered no action at all, so a
 * shopkeeper who ordered the wrong thing had to phone the supplier even though
 * the API had always accepted a cancellation.
 */
const CANCELLABLE = ['requested', 'accepted', 'preparing'];

export function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [isCancelling, setIsCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const fetcher = useCallback(() => ordersApi.getOrderDetail(orderId), [orderId]);
  const { data: order, isLoading, error, reload, setData } = useApiResource(fetcher);

  const cancel = async () => {
    setIsCancelling(true);
    setCancelError(null);
    try {
      const updated = await ordersApi.updateOrderStatus(orderId, {
        status: 'cancelled',
        reason: 'Retailer ne cancel kiya',
      });
      setData(updated);
      setConfirming(false);
    } catch (err) {
      setCancelError(err.message || 'Cancel nahi ho paya. Dobara try karein.');
    } finally {
      setIsCancelling(false);
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

  const canCancel = CANCELLABLE.includes(order.status);

  return (
    <OrderDetailView
      order={order}
      counterpartyLabel="Distributor"
      counterpartyName={order.distributor_name}
      actions={(canCancel || cancelError) && (
        <div className="flex flex-col gap-3">
          {cancelError && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2.5 text-sm leading-snug text-danger"
            >
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" strokeWidth={2} />
              {cancelError}
            </p>
          )}

          {/* Confirmed in place rather than through window.confirm(), which
              blocks the page and cannot name the order it is asking about. */}
          {canCancel && (confirming ? (
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                variant="danger"
                fullWidth
                isLoading={isCancelling}
                onClick={cancel}
              >
                Haan, cancel karein
              </Button>
              <Button
                variant="ghost"
                fullWidth
                disabled={isCancelling}
                onClick={() => setConfirming(false)}
              >
                Rehne dein
              </Button>
            </div>
          ) : (
            <Button variant="outline" fullWidth onClick={() => setConfirming(true)}>
              Order cancel karein
            </Button>
          ))}
        </div>
      )}
    />
  );
}
