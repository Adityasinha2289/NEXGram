import { fetchApi } from './client';

/**
 * Sourcing a shopping list across every local distributor at once.
 *
 * The point of the product: each supplier is cheapest on something, nobody is
 * cheapest on everything, and comparing them by hand is not work anyone does.
 */
export const procurementApi = {
  /** Prices an explicit list. Items are [{ product_id, quantity }]. */
  optimise: (items) => fetchApi('/procurement/optimise', {
    method: 'POST',
    body: JSON.stringify({ items }),
  }),

  /** Builds the list from the shelf and the area, then sources it. */
  getAutoBasket: () => fetchApi('/procurement/auto-basket'),

  /**
   * Turns the cheapest split into real orders — one per supplier.
   *
   * Re-optimised server-side, so a stale quote cannot become a stale price.
   */
  placeSplit: (items, notes, mode = 'split') => fetchApi('/procurement/place-split', {
    method: 'POST',
    body: JSON.stringify({ items, notes, mode }),
  }),
};
