import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { FilterChips } from '../ui/FilterChips';
import { List, ListRow, RowChevron } from '../ui/List';
import { PageHeader } from '../ui/PageHeader';
import { SkeletonList } from '../ui/Skeleton';
import { ordersApi } from '../../services/api/ordersApi';
import { useApiResource } from '../../hooks/useApiResource';
import { ORDER_FILTERS, statusFor } from '../../utils/orderStatus';

const rupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/**
 * The order list, for both sides of the market.
 *
 * The retailer's and the distributor's copies were the same hundred lines twice
 * over, already diverged on their status colours — and only one of them had a
 * status filter, while neither had an error state: a failed request logged to
 * the console and rendered as "koi order nahi hai".
 */
export function OrderList({ role, title, description, emptyAction }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const fetcher = useCallback(() => ordersApi.getOrders({}), []);
  const { data, isLoading, error, reload } = useApiResource(fetcher);
  const orders = useMemo(() => data?.items || [], [data]);

  const counts = useMemo(() => {
    const tally = { all: orders.length };
    orders.forEach((order) => {
      tally[order.status] = (tally[order.status] || 0) + 1;
    });
    return tally;
  }, [orders]);

  const visible = filter === 'all' ? orders : orders.filter((order) => order.status === filter);

  // A filter nobody can use is worse than no filter, so a status with no orders
  // behind it is not offered.
  const options = ORDER_FILTERS
    .filter((option) => option.value === 'all' || counts[option.value])
    .map((option) => ({ ...option, count: counts[option.value] || 0 }));

  return (
    <div className="flex animate-fade-in flex-col gap-5">
      <PageHeader eyebrow="Orders" title={title} description={description} />

      {error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : isLoading ? (
        <SkeletonList rows={4} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Abhi koi order nahi"
          description={
            role === 'retailer'
              ? 'Aapne abhi tak koi order place nahi kiya hai.'
              : 'Retailers ke orders aate hi yahaan dikhenge.'
          }
          actionLabel={emptyAction?.label}
          onAction={emptyAction?.onAction}
        />
      ) : (
        <>
          {options.length > 2 && (
            <FilterChips
              name="order-status"
              label="Status se filter karein"
              options={options}
              value={filter}
              onChange={setFilter}
            />
          )}

          {visible.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Is status mein kuch nahi"
              description="Koi doosra status chunein."
            />
          ) : (
            <List>
              {visible.map((order) => {
                const status = statusFor(order.status);
                const counterparty = role === 'retailer'
                  ? order.distributor_name
                  : order.retailer_name;

                return (
                  <ListRow
                    key={order.id}
                    onClick={() => navigate(`/${role}/orders/${order.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="num text-sm font-semibold text-text-primary">
                          {order.order_number}
                        </span>
                        <Badge variant={status.variant} dot>{status.label}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-text-muted">{counterparty}</p>
                      {/* On a phone these two facts stack under the name; from
                          640px they become their own columns instead, which is
                          what the extra width is for. */}
                      <p className="num mt-1 text-2xs text-text-muted sm:hidden">
                        {order.item_count} product{order.item_count === 1 ? '' : 's'}
                        {' · '}{formatDate(order.created_at)}
                      </p>
                    </div>

                    <span className="num hidden w-24 flex-shrink-0 text-sm text-text-muted sm:block">
                      {order.item_count} product{order.item_count === 1 ? '' : 's'}
                    </span>
                    <span className="num hidden w-16 flex-shrink-0 text-sm text-text-muted sm:block">
                      {formatDate(order.created_at)}
                    </span>

                    <span className="num w-24 flex-shrink-0 text-right text-sm font-semibold text-text-primary">
                      {rupees(order.total)}
                    </span>
                    <RowChevron />
                  </ListRow>
                );
              })}
            </List>
          )}
        </>
      )}
    </div>
  );
}
