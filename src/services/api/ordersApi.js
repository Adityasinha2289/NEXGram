import { fetchApi } from './client';

export const ordersApi = {
  createOrder: (orderData) => {
    return fetchApi('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },
  
  getOrders: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.retailer_id) queryParams.append('retailer_id', params.retailer_id);
    if (params.distributor_id) queryParams.append('distributor_id', params.distributor_id);
    if (params.page) queryParams.append('page', params.page);
    if (params.page_size) queryParams.append('page_size', params.page_size);
    
    return fetchApi(`/orders?${queryParams.toString()}`);
  },
  
  getOrderDetail: (orderId) => {
    return fetchApi(`/orders/${orderId}`);
  },
  
  updateOrderStatus: (orderId, statusData) => {
    return fetchApi(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData)
    });
  }
};
