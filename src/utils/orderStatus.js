/**
 * One description of an order's status, for every screen that shows one.
 *
 * The two order lists each carried their own switch statement, and they had
 * already drifted: a draft order was amber on one side and green on the other,
 * and both printed the raw database value at the user.
 */
export const ORDER_STATUS = {
  draft: { label: 'Draft', variant: 'neutral' },
  requested: { label: 'Bheja gaya', variant: 'warning' },
  accepted: { label: 'Accept hua', variant: 'primary' },
  preparing: { label: 'Taiyari mein', variant: 'primary' },
  ready: { label: 'Ready', variant: 'info' },
  completed: { label: 'Poora hua', variant: 'success' },
  cancelled: { label: 'Cancel hua', variant: 'danger' },
  rejected: { label: 'Reject hua', variant: 'danger' },
};

const FALLBACK = { label: 'Unknown', variant: 'neutral' };

export const statusFor = (status) => ORDER_STATUS[String(status || '').toLowerCase()] || FALLBACK;

/** The filter row, in the order an order actually moves through. */
export const ORDER_FILTERS = [
  { value: 'all', label: 'Sab' },
  { value: 'requested', label: 'Bheja gaya' },
  { value: 'accepted', label: 'Accept hua' },
  { value: 'preparing', label: 'Taiyari mein' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Poora hua' },
];
