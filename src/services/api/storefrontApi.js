import { fetchApi, buildQueryString } from './client';

/**
 * The consumer storefront, and the shop's delivery desk.
 *
 * Two audiences over one set of tables: a household ordering from the kirana
 * two streets away, and the shopkeeper working through what arrives.
 */
export const storefrontApi = {
  // --- Customer ---------------------------------------------------------
  getMe: () => fetchApi('/storefront/me'),
  updateMe: (data) => fetchApi('/storefront/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  /** Shops close enough for someone to walk or cycle the order over. */
  getShops: (params) => fetchApi(`/storefront/shops${buildQueryString(params)}`),
  getShop: (shopId, params) => fetchApi(`/storefront/shops/${shopId}${buildQueryString(params)}`),

  placeOrder: (data) => fetchApi('/storefront/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getMyOrders: () => fetchApi('/storefront/orders'),
  getMyOrder: (id) => fetchApi(`/storefront/orders/${id}`),
  cancelMyOrder: (id) => fetchApi(`/storefront/orders/${id}/cancel`, { method: 'POST' }),

  // --- Shop -------------------------------------------------------------
  getShopOrders: (params) => fetchApi(`/storefront/shop/orders${buildQueryString(params)}`),
  updateOrderStatus: (id, data) => fetchApi(`/storefront/shop/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  getRunners: () => fetchApi('/storefront/shop/runners'),
  addRunner: (data) => fetchApi('/storefront/shop/runners', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  removeRunner: (id) => fetchApi(`/storefront/shop/runners/${id}`, { method: 'DELETE' }),
};
