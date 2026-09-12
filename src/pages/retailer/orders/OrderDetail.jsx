import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { OrderDetailView } from '../../../components/orders/OrderDetailView';
import { Skeleton, SkeletonList } from '../../../components/ui/Skeleton';
import { ordersApi } from '../../../services/api/ordersApi';
import { useApiResource } from '../../../hooks/useApiResource';

export function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const fetcher = useCallback(() => ordersApi.getOrderDetail(orderId), [orderId]);
  const { data: order, isLoading, error, reload } = useApiResource(fetcher);

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

  return (
    <OrderDetailView
      order={order}
      counterpartyLabel="Distributor"
      counterpartyName={order.distributor_name}
    />
  );
}
