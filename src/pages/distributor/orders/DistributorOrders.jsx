import { OrderList } from '../../../components/orders/OrderList';

export function DistributorOrders() {
  return (
    <OrderList
      role="distributor"
      title="Orders"
      description="Retailers se aaye orders, aur unka abhi kya status hai."
    />
  );
}
