import { APP_CONSTANTS } from '../constants/appConstants';

export const INITIAL_ORDERS_MOCK = [
  {
    id: 'ORD_1001',
    retailerId: 'RET_1',
    retailerName: 'Ram Kumar Kirana',
    distributorId: 'dist_1',
    distributorName: 'Sharma Distributors',
    items: [
      { id: 'dp_1', name: 'Paneer', quantity: 10, unit: 'kg', price: 320 },
      { id: 'dp_2', name: 'Milk', quantity: 20, unit: 'packets', price: 68 }
    ],
    estimatedTotal: 4560,
    status: APP_CONSTANTS.ORDER_STATUSES.PENDING,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
  },
  {
    id: 'ORD_1002',
    retailerId: 'RET_1',
    retailerName: 'Ram Kumar Kirana',
    distributorId: 'dist_2',
    distributorName: 'Gupta Rural Supplies',
    items: [
      { id: 'gupta_1', name: 'Aashirvaad Atta', quantity: 15, unit: 'kg', price: 220 },
      { id: 'gupta_2', name: 'Tata Salt', quantity: 50, unit: 'packets', price: 25 }
    ],
    estimatedTotal: 4550,
    status: APP_CONSTANTS.ORDER_STATUSES.CONFIRMED,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
  },
  {
    id: 'ORD_1003',
    retailerId: 'RET_2',
    retailerName: 'Manoj General Store',
    distributorId: 'dist_1',
    distributorName: 'Sharma Distributors',
    items: [
      { id: 'sharma_2', name: 'Parle-G', quantity: 10, unit: 'boxes', price: 800 }
    ],
    estimatedTotal: 8000,
    status: APP_CONSTANTS.ORDER_STATUSES.COMPLETED,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString() // 3 days ago
  }
];
