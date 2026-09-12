/**
 * Values the UI offers that are not stored in the database.
 *
 * This file used to also carry a CATEGORIES list, ORDER_STATUSES,
 * STOCK_STATUSES and a set of STORAGE_KEYS. Every one of them was either dead
 * or actively wrong: the categories had drifted from the real category table,
 * the order statuses were a second, differently-spelled copy of the ones in
 * utils/orderStatus.js, and nothing read the storage keys after the profile
 * screen stopped reading its data out of localStorage.
 */
export const APP_CONSTANTS = {
  DELIVERY_OPTIONS: ['1 day', '1–2 days', '2 days', '2–3 days', '3+ days'],
};
