// mockData.js

export const MOCK_USER = {
  retailer: {
    name: 'Ramesh Kirana',
    location: 'Village Palampur',
    pendingOrders: 3,
    recentActivity: 'Stock refilled 2 days ago',
  },
  distributor: {
    name: 'Gupta Distributors',
    location: 'Palampur Hub',
    radius: '50 km',
    activeSignals: 5,
  }
};

export const MOCK_PRODUCTS = [
  { id: 1, name: 'Parle-G Biscuit 50g', category: 'FMCG', price: 4.5, moq: 100, image: '🍪' },
  { id: 2, name: 'Tata Salt 1kg', category: 'Groceries', price: 20, moq: 50, image: '🧂' },
  { id: 3, name: 'Surf Excel 500g', category: 'Household', price: 65, moq: 20, image: '🧼' },
  { id: 4, name: 'Maggi Noodles 70g', category: 'FMCG', price: 12, moq: 50, image: '🍜' },
];

export const MOCK_OPPORTUNITIES = [
  { id: 101, title: 'Demand Spike in Palampur', description: '5 retailers are looking for Surf Excel 500g.', type: 'demand' },
  { id: 102, title: 'New Scheme from Tata', description: 'Get 5% extra margin on Tata Salt bulk orders.', type: 'scheme' }
];

export const MOCK_ORDERS = [
  { id: 'ORD-1001', date: '2026-09-07', status: 'Delivered', amount: 4500, items: 3 },
  { id: 'ORD-1002', date: '2026-09-08', status: 'Processing', amount: 1200, items: 1 },
];
