export const APP_CONSTANTS = {
  CATEGORIES: [
    'Dairy',
    'FMCG',
    'Staples',
    'Beverages',
    'Spices',
    'Household',
    'Agriculture',
    'Snacks',
    'Personal Care'
  ],
  UNITS: ['kg', 'packets', 'boxes', 'bottles', 'bag', 'piece'],
  ORDER_STATUSES: {
    PENDING: 'Pending Confirmation',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Preparing',
    READY: 'Ready',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled'
  },
  STOCK_STATUSES: {
    AVAILABLE: 'Available',
    LOW_STOCK: 'Low Stock',
    OUT_OF_STOCK: 'Out of Stock'
  },
  STOCK_RULES: {
    OUT_OF_STOCK_MAX: 0,
    LOW_STOCK_MAX: 10
  },
  DELIVERY_OPTIONS: ['1 day', '1–2 days', '2 days', '2–3 days', '3+ days'],
  SERVICE_RADIUS_OPTIONS: ['5 km', '10 km', '20 km', '50+ km'],
  STORAGE_KEYS: {
    RETAILER_ONBOARDING: 'nexgram_retailer_onboarding',
    DISTRIBUTOR_ONBOARDING: 'nexgram_distributor_onboarding',
    DEVELOPER_PACK: 'nexgram_retailer_developer_pack',
    RETAILER_ORDERS: 'nexgram_retailer_orders',
    DISTRIBUTOR_ORDERS: 'nexgram_distributor_orders',
    DISTRIBUTOR_CATALOGUE: 'nexgram_distributor_catalogue'
  }
};
