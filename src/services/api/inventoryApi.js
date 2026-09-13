import { fetchApi, buildQueryString } from './client';

/**
 * The shop's own shelf — what it holds, what it sells, what is about to spoil.
 *
 * Distinct from the distributor catalogue: `available_stock` there is "what I
 * can sell you wholesale", `quantity` here is "what is in my shop". Conflating
 * them is what makes a restock suggestion tell a shopkeeper to order something
 * they already have three cartons of.
 */
export const inventoryApi = {
  getInventory: (params) => fetchApi(`/inventory${buildQueryString(params)}`),
  getItem: (id) => fetchApi(`/inventory/${id}`),

  receiveStock: (data) => fetchApi('/inventory', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateItem: (id, data) => fetchApi(`/inventory/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  /** Sets the count to what a physical stock-take found. */
  adjustStock: (id, quantity, note) => fetchApi(`/inventory/${id}/adjust`, {
    method: 'POST',
    body: JSON.stringify({ quantity, note }),
  }),

  counterSale: (inventoryId, quantity) => fetchApi('/inventory/counter-sale', {
    method: 'POST',
    body: JSON.stringify({ inventory_id: inventoryId, quantity }),
  }),

  /** Reads a spoken sentence without changing any stock. */
  previewVoiceSale: (transcript) => fetchApi('/inventory/voice-sale/preview', {
    method: 'POST',
    body: JSON.stringify({ transcript }),
  }),

  /**
   * Applies what it is sure of. Anything ambiguous comes back in
   * `needsConfirmation` with candidates; send the chosen row back through
   * `confirmations` keyed by the heard phrase.
   */
  voiceSale: (transcript, confirmations) => fetchApi('/inventory/voice-sale', {
    method: 'POST',
    body: JSON.stringify({ transcript, confirmations }),
  }),

  getMovements: (params) => fetchApi(`/inventory/movements${buildQueryString(params)}`),

  /** Running low, about to expire, and what the area wants that you lack. */
  getRestockPlan: () => fetchApi('/inventory/restock-plan'),

  writeOffExpired: () => fetchApi('/inventory/write-off-expired', { method: 'POST' }),
};
