import { Models } from './models';

// Generate 20 deterministic mock profiles across 3 locations with intentional demand patterns

const locPalampur = { area: "Palampur Market", district: "Kangra" };
const locBaijnath = { area: "Baijnath Main", district: "Kangra" };
const locKangra = { area: "Kangra Central", district: "Kangra" };

export const DEMAND_TEST_MOCK = [
  // PALAMPUR (Heavy Dairy & Paneer Demand)
  ...Array(6).fill(null).map((_, i) => Models.createRetailerProfile({
    id: `RET_PAL_DAIRY_${i}`,
    location: locPalampur,
    demandedCategories: ["Dairy", "Beverages"],
    unmetNeeds: { categories: ["Dairy"], other: "paneer availability is poor" },
    requirements: "Need fresh paneer and milk daily"
  })),
  ...Array(2).fill(null).map((_, i) => Models.createRetailerProfile({
    id: `RET_PAL_MIX_${i}`,
    location: locPalampur,
    demandedCategories: ["Staples"],
    requirements: "atta, salt, water bottles"
  })),
  
  // BAIJNATH (Heavy Staples & Medium Beverages)
  ...Array(4).fill(null).map((_, i) => Models.createRetailerProfile({
    id: `RET_BJN_STAPLES_${i}`,
    location: locBaijnath,
    demandedCategories: ["Staples"],
    unmetNeeds: { categories: [], other: "need good quality atta and rice in bulk" },
    requirements: "dal, sugar"
  })),
  ...Array(3).fill(null).map((_, i) => Models.createRetailerProfile({
    id: `RET_BJN_BEV_${i}`,
    location: locBaijnath,
    demandedCategories: ["Beverages", "Snacks"],
    requirements: "chips, soft drink, biscuits"
  })),

  // KANGRA CENTRAL (Mixed, isolated specific demands)
  Models.createRetailerProfile({
    id: `RET_KNG_1`,
    location: locKangra,
    demandedCategories: ["Spices", "Household"],
    unmetNeeds: { categories: [], other: "detergent shortage" },
    requirements: "masala, cumin, turmeric"
  }),
  Models.createRetailerProfile({
    id: `RET_KNG_2`,
    location: locKangra,
    demandedCategories: ["Household"],
    requirements: "detergent and soap"
  }),
  
  // EDGE CASES (Missing location, missing categories)
  Models.createRetailerProfile({
    id: `RET_EDGE_1`,
    location: null,
    demandedCategories: ["Dairy"],
    requirements: "paneer"
  }),
  Models.createRetailerProfile({
    id: `RET_EDGE_2`,
    location: { area: "", district: "" },
    unmetNeeds: "I need milk"
  }),
  Models.createRetailerProfile({
    id: `RET_EDGE_3`,
    // Completely empty to ensure no crashes
  })
];
