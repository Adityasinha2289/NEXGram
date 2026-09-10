export const DISTRIBUTORS_LIST_MOCK = [
  {
    id: 'dist_1',
    name: 'Sharma Distributors',
    categories: ['Dairy', 'FMCG'],
    distance: '8 km away',
    deliveryTime: '1–2 days',
    minimumOrder: 2000,
    hasDelivery: true
  },
  {
    id: 'dist_2',
    name: 'Gupta Rural Supplies',
    categories: ['Staples', 'Household'],
    distance: '12 km away',
    deliveryTime: '2 days',
    minimumOrder: 1500,
    hasDelivery: true
  },
  {
    id: 'dist_3',
    name: 'Kangra Wholesale Hub',
    categories: ['FMCG', 'Beverages'],
    distance: '18 km away',
    deliveryTime: '2–3 days',
    minimumOrder: 3000,
    hasDelivery: true
  },
  {
    id: 'dist_4',
    name: 'Kisan Traders',
    categories: ['Agriculture', 'Spices'],
    distance: '5 km away',
    deliveryTime: '1 day',
    minimumOrder: 1000,
    hasDelivery: false
  }
];

export const DISTRIBUTOR_CATALOGUES_MOCK = {
  dist_1: {
    distributorName: 'Sharma Distributors',
    products: [
      { id: 'dp_1', name: 'Paneer', category: 'Dairy', unit: 'kg', price: 320, minimumOrderQuantity: 5, stockStatus: 'Available', deliveryTime: '1 day' },
      { id: 'dp_2', name: 'Milk', category: 'Dairy', unit: 'packets', price: 68, minimumOrderQuantity: 10, stockStatus: 'Available', deliveryTime: '1 day' },
      { id: 'sharma_1', name: 'Cheese Slices', category: 'Dairy', unit: 'packets', price: 120, minimumOrderQuantity: 5, stockStatus: 'Available', deliveryTime: '1 day' },
      { id: 'sharma_2', name: 'Parle-G', category: 'FMCG', unit: 'boxes', price: 800, minimumOrderQuantity: 5, stockStatus: 'Available', deliveryTime: '2 days' }
    ]
  },
  dist_2: {
    distributorName: 'Gupta Rural Supplies',
    products: [
      { id: 'gupta_1', name: 'Aashirvaad Atta', category: 'Staples', unit: 'kg', price: 220, minimumOrderQuantity: 10, stockStatus: 'Available', deliveryTime: '2 days' },
      { id: 'gupta_2', name: 'Tata Salt', category: 'Staples', unit: 'packets', price: 25, minimumOrderQuantity: 50, stockStatus: 'Available', deliveryTime: '1 day' },
      { id: 'gupta_3', name: 'Surf Excel', category: 'Household', unit: 'kg', price: 180, minimumOrderQuantity: 15, stockStatus: 'Low Stock', deliveryTime: '2 days' }
    ]
  },
  dist_3: {
    distributorName: 'Kangra Wholesale Hub',
    products: [
      { id: 'kangra_1', name: 'Thums Up (2L)', category: 'Beverages', unit: 'bottles', price: 90, minimumOrderQuantity: 12, stockStatus: 'Available', deliveryTime: '2 days' },
      { id: 'kangra_2', name: 'Maggi Noodles', category: 'FMCG', unit: 'boxes', price: 540, minimumOrderQuantity: 5, stockStatus: 'Available', deliveryTime: '2 days' },
      { id: 'dp_3', name: 'Butter', category: 'Dairy', unit: 'boxes', price: 250, minimumOrderQuantity: 2, stockStatus: 'Available', deliveryTime: '2 days' }
    ]
  },
  dist_4: {
    distributorName: 'Kisan Traders',
    products: [
      { id: 'kisan_1', name: 'MDH Garam Masala', category: 'Spices', unit: 'box', price: 85, minimumOrderQuantity: 20, stockStatus: 'Available', deliveryTime: '1 day' },
      { id: 'kisan_2', name: 'Everest Turmeric', category: 'Spices', unit: 'packet', price: 130, minimumOrderQuantity: 10, stockStatus: 'Available', deliveryTime: '1 day' },
      { id: 'kisan_3', name: 'Urea Fertilizer', category: 'Agriculture', unit: 'bag', price: 266, minimumOrderQuantity: 20, stockStatus: 'Out of Stock', deliveryTime: '5 days' }
    ]
  }
};
