import { Models } from './models';
import { DEMAND_TEST_MOCK } from './demandTestMock';

/**
 * MOCK DISTRIBUTOR DATA FOR GAP ANALYSIS
 * Intentionally aligned with Palampur and Kangra to intersect DEMAND_TEST_MOCK.
 */

const locPalampur = { area: "Palampur Market", district: "Kangra" };
const locKangra = { area: "Kangra Central", district: "Kangra" };

export const SUPPLY_GAP_CATALOGUES_MOCK = [
  // 1. Sharma Distributors (Palampur)
  {
    ...Models.createDistributorProfile({
      id: "dist_sharma",
      businessName: "Sharma Distributors",
      location: locPalampur,
      productCategories: ["Dairy"]
    }),
    products: [
      Models.createDistributorProduct({
        name: "Paneer",
        category: "Dairy",
        stockStatus: "Low Stock", // Will trigger Limited supply
        availableStock: 5 
      }),
      Models.createDistributorProduct({
        name: "Milk",
        category: "Dairy",
        stockStatus: "Available",
        availableStock: 50
      })
    ]
  },

  // 2. Verma Suppliers (Palampur)
  {
    ...Models.createDistributorProfile({
      id: "dist_verma",
      businessName: "Verma Suppliers",
      location: locPalampur
    }),
    products: [
      Models.createDistributorProduct({
        name: "Milk",
        category: "Dairy",
        availableStock: 25 // Should derive 'Available'
      }),
      Models.createDistributorProduct({
        name: "Paneer",
        category: "Dairy",
        stockStatus: "Out of Stock"
      })
    ]
  },

  // 3. Duplicate Verma Suppliers (Palampur)
  {
    ...Models.createDistributorProfile({
      id: "dist_verma",
      businessName: "Verma Suppliers",
      location: locPalampur
    }),
    products: []
  },

  // 4. Kangra Central Staples (Kangra)
  {
    ...Models.createDistributorProfile({
      id: "dist_kangra_staples",
      businessName: "Kangra Central Staples",
      location: locKangra
    }),
    products: [
      Models.createDistributorProduct({
        name: "Masala",
        category: "Spices",
        stockStatus: "Available"
      })
    ]
  },

  // 5. Missing Location Edge Case
  {
    ...Models.createDistributorProfile({
      id: "dist_unknown",
      businessName: "Ghost Distributors",
      location: null
    }),
    products: [
      Models.createDistributorProduct({
        name: "Paneer",
        category: "Dairy",
        stockStatus: "Available"
      })
    ]
  }
];
