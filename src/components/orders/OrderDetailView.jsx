import { Badge } from '../ui/Badge';
import { KeyValue } from '../ui/List';
import { Meta, PageHeader } from '../ui/PageHeader';
import { OrderTimeline } from '../ui/OrderTimeline';
import { Section } from '../ui/Section';
import { statusFor } from '../../utils/orderStatus';

const rupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

const formatDateTime = (value) =>
  new Date(value).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

/**
 * One order, in full.
 *
 * The retailer's copy used to draw the status twice — a hand-rolled stepper
 * under "Order Status" and then the real OrderTimeline underneath it, saying
 * the same thing in two different visual languages. There is one timeline now,
 * and it is the one with the timestamps.
 */
export function OrderDetailView({ order, counterpartyLabel, counterpartyName, actions }) {
  const status = statusFor(order.status);

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        eyebrow={counterpartyLabel}
        title={order.order_number}
        meta={
          <>
            <Badge variant={status.variant} dot>{status.label}</Badge>
            <Meta>{counterpartyName}</Meta>
            <Meta>{formatDateTime(order.created_at)}</Meta>
          </>
        }
      />

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-7">
        <Section title="Order ke items">
          <div className="panel overflow-hidden">
            <ul className="divide-y divide-border">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">
                      {item.product_name}
                      {item.variant_name && (
                        <span className="ml-1.5 font-normal text-text-muted">
                          {item.variant_name}
                        </span>
                      )}
                    </p>
                    <p className="num mt-0.5 text-2xs text-text-muted">
                      {item.quantity} &times; {rupees(item.unit_price)}
                    </p>
                  </div>
                  <span className="num flex-shrink-0 text-sm font-medium text-text-primary">
                    {rupees(item.line_total)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="border-t border-border bg-surface-muted px-4">
              <KeyValue label="Items" value={order.items.length} />
              <div className="flex items-baseline justify-between gap-4 border-t border-border py-2.5">
                <dt className="text-sm font-semibold text-text-primary">Total</dt>
                <dd className="num text-base font-bold text-text-primary">{rupees(order.total)}</dd>
              </div>
            </dl>
          </div>

          {actions}
        </Section>

        <OrderTimeline history={order.history} currentStatus={order.status} />
      </div>
    </div>
  );
}
