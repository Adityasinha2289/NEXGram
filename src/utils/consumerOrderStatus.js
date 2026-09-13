/**
 * Where a consumer order is, in the words a household uses.
 *
 * Deliberately short: the shop is two streets away, so anything longer
 * describes a courier network this is not. Shared between the customer's own
 * order screens and the shop's delivery desk so the two can never disagree
 * about what "accepted" means.
 */
export const CONSUMER_STATUS = {
  placed: { label: 'Dukaan dekh rahi hai', variant: 'warning' },
  accepted: { label: 'Taiyar ho raha hai', variant: 'primary' },
  out_for_delivery: { label: 'Raaste mein hai', variant: 'info' },
  delivered: { label: 'Mil gaya', variant: 'success' },
  cancelled: { label: 'Cancel ho gaya', variant: 'danger' },
  rejected: { label: 'Dukaan ne mana kiya', variant: 'danger' },
};

const FALLBACK = { label: 'Unknown', variant: 'neutral' };

export const consumerStatusFor = (status) =>
  CONSUMER_STATUS[String(status || '').toLowerCase()] || FALLBACK;
