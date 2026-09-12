import { useNavigate } from 'react-router-dom';
import { OrderList } from '../../../components/orders/OrderList';

export function RetailerOrders() {
  const navigate = useNavigate();

  return (
    <OrderList
      role="retailer"
      title="Aapke orders"
      description="Current aur pichhle orders, unke status ke saath."
      emptyAction={{
        label: 'Products dekho',
        onAction: () => navigate('/retailer/distributors'),
      }}
    />
  );
}
