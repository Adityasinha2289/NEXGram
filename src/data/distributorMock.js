export const DISTRIBUTOR_DASHBOARD_MOCK = {
  businessName: 'Sharma Distributors',
  location: {
    area: 'Palampur Market',
    district: 'Kangra'
  },
  snapshot: {
    opportunityScore: '72/100',
    opportunityLabel: 'Achha scope hai',
    retailersLooking: 18,
    retailersLabel: 'Current local demand',
  },
  demandGaps: [
    { 
      id: 'gap_1', 
      category: 'Dairy', 
      product: 'Paneer', 
      demand: 'High', 
      retailers: 14, 
      supply: 'Limited', 
      opportunity: 'Strong',
      badgeVariant: 'success'
    },
    { 
      id: 'gap_2', 
      category: 'Beverages', 
      product: 'Packaged Drinking Water', 
      demand: 'Medium-High', 
      retailers: 9, 
      supply: 'Limited', 
      opportunity: 'Good',
      badgeVariant: 'primary'
    },
    { 
      id: 'gap_3', 
      category: 'Staples', 
      product: 'Atta', 
      demand: 'Medium', 
      retailers: 7, 
      supply: 'Available', 
      opportunity: 'Moderate',
      badgeVariant: 'warning'
    }
  ],
  retailerDemand: [
    { id: 'rd_1', category: 'Dairy', count: 14 },
    { id: 'rd_2', category: 'Beverages', count: 9 },
    { id: 'rd_3', category: 'Staples', count: 7 }
  ],
  orders: {
    pending: 3,
    ready: 1,
    completed: 2
  }
};
