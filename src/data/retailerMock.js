export const RETAILER_DASHBOARD_MOCK = {
  fallbackName: 'Retailer Ji',
  fallbackLocation: 'Aapka Area',
  businessSnapshot: {
    health: 'Achha',
    healthLabel: 'Business profile complete',
    demand: 'High',
    demandLabel: 'Area mein demand strong hai',
    opportunity: '3',
    opportunityLabel: 'Products worth checking'
  },
  developerPack: {
    title: 'Starter Pack for Your Shop',
    items: [
      { name: 'Paneer', qty: '10 kg' },
      { name: 'Milk', qty: '20 packets' },
      { name: 'Butter', qty: '5 boxes' }
    ],
    estimatedTotal: '₹8,450'
  },
  recommendedProducts: [
    { id: 'rec_1', name: 'Paneer', category: 'Dairy', demand: 'High', availability: 'Limited', demandBadge: 'success', availabilityBadge: 'warning' },
    { id: 'rec_2', name: 'Packaged Drinking Water', category: 'Beverages', demand: 'Medium-High', availability: 'Limited', demandBadge: 'primary', availabilityBadge: 'warning' },
    { id: 'rec_3', name: 'Atta', category: 'Staples', demand: 'Medium', availability: 'Available', demandBadge: 'warning', availabilityBadge: 'success' }
  ],
  reorderItems: [
    { id: 'ro_1', name: 'Paneer', lastOrdered: '7 days ago' },
    { id: 'ro_2', name: 'Milk', lastOrdered: '4 days ago' },
    { id: 'ro_3', name: 'Butter', lastOrdered: '12 days ago' }
  ],
  nearbyDistributors: [
    { id: 'dist_1', name: 'Sharma Distributors', categories: 'Dairy & FMCG', distance: '8 km away', delivery: '1–2 days' },
    { id: 'dist_2', name: 'Gupta Rural Supplies', categories: 'Staples & Household', distance: '12 km away', delivery: '2 days' }
  ]
};

export const DEVELOPER_PACK_MOCK = {
  title: 'Starter Pack for Your Shop',
  description: 'Essential products jo aapke current requirements ke liye useful ho sakte hain.',
  budget: { min: 10000, max: 25000 },
  initialProducts: [
    { 
      id: 'dp_1', 
      name: 'Paneer', 
      category: 'Dairy', 
      unit: 'kg', 
      suggestedQuantity: 10, 
      price: 3200, 
      minimumOrderQuantity: 5, 
      availability: 'Available', 
      reason: 'Aapke selected Dairy requirement ke saath match karta hai.' 
    },
    { 
      id: 'dp_2', 
      name: 'Milk', 
      category: 'Dairy', 
      unit: 'packets', 
      suggestedQuantity: 20, 
      price: 1360, 
      minimumOrderQuantity: 10, 
      availability: 'Available', 
      reason: 'Aapke regular purchase pattern ke liye relevant hai.' 
    },
    { 
      id: 'dp_3', 
      name: 'Butter', 
      category: 'Dairy', 
      unit: 'boxes', 
      suggestedQuantity: 5, 
      price: 1250, 
      minimumOrderQuantity: 2, 
      availability: 'Low Stock', 
      reason: 'Aapke business category ke liye commonly required product hai.' 
    }
  ]
};

export const AVAILABLE_PRODUCTS_MOCK = [
  { id: 'ap_1', name: 'Aashirvaad Atta', category: 'Staples', unit: 'kg', suggestedQuantity: 25, price: 1100, minimumOrderQuantity: 10, availability: 'Available', reason: 'Popular staple with high area demand.' },
  { id: 'ap_2', name: 'Tata Salt', category: 'Staples', unit: 'packets', suggestedQuantity: 50, price: 1250, minimumOrderQuantity: 20, availability: 'Available', reason: 'High turnover daily essential.' },
  { id: 'ap_3', name: 'Thums Up (2L)', category: 'Beverages', unit: 'bottles', suggestedQuantity: 12, price: 1080, minimumOrderQuantity: 6, availability: 'Available', reason: 'Summer season upcoming demand.' },
  { id: 'ap_4', name: 'Parle-G', category: 'Snacks', unit: 'boxes', suggestedQuantity: 10, price: 800, minimumOrderQuantity: 5, availability: 'Available', reason: 'Consistent fast-moving consumer good.' },
  { id: 'ap_5', name: 'Surf Excel', category: 'Household', unit: 'kg', suggestedQuantity: 15, price: 2700, minimumOrderQuantity: 5, availability: 'Low Stock', reason: 'High demand in residential areas.' }
];
