import { DemandEngine } from './DemandEngine.js';
import { SupplyGapEngine } from './SupplyGapEngine.js';
import { DeveloperPackEngine } from './DeveloperPackEngine.js';
import { DEMAND_TEST_MOCK } from '../../../data/demandTestMock.js';
import { SUPPLY_GAP_CATALOGUES_MOCK } from '../../../data/supplyGapTestMock.js';
import { Models } from '../../../data/models.js';

console.log("=========================================");
console.log("      DEVELOPER PACK ENGINE AUDIT        ");
console.log("=========================================");

// 1. Setup Base Intelligence
const demandSignals = DemandEngine.analyze(DEMAND_TEST_MOCK);
const gapSignals = SupplyGapEngine.analyze(demandSignals, SUPPLY_GAP_CATALOGUES_MOCK);

const MOCK_CATALOGUES = SUPPLY_GAP_CATALOGUES_MOCK;

// Helper to create a test retailer
const createRetailer = (overrides = {}) => {
  return Models.createRetailerProfile({
    id: "test_retailer",
    businessName: "Test Kirana",
    businessType: "Grocery",
    location: {
      area: "Palampur Market",
      district: "Kangra"
    },
    ...overrides
  });
};

// TEST 1: Explicit Requirement Scoring (Paneer vs Atta)
console.log("\n[TEST 1] Explicit Requirement Prioritization:");
const ret1 = createRetailer({
  requirements: "We urgently need Paneer.",
  demandedCategories: ["Staples"], // Give Atta a baseline score
  investmentBudget: "50000" // High budget
});

const pack1 = DeveloperPackEngine.generate(ret1, demandSignals.productSignals, demandSignals.categorySignals, gapSignals.productGaps, MOCK_CATALOGUES);

const paneerItem = pack1.products.find(p => p.name === 'Paneer');
const milkItem = pack1.products.find(p => p.name === 'Milk');

if (paneerItem && milkItem) {
  console.log(`  Paneer Score: ${paneerItem.recommendationScore} | Reason: ${paneerItem.reason}`);
  console.log(`  Milk Score: ${milkItem.recommendationScore} | Reason: ${milkItem.reason}`);
  if (paneerItem.recommendationScore > milkItem.recommendationScore) {
    console.log("  => SUCCESS: Explicit requirement outscores generic local demand.");
  } else {
    console.error("  => FAILED: Generic local demand outscored explicit requirement.");
  }
} else {
  console.error("  => FAILED: Missing baseline products in pack.");
  console.log("PACK 1 CONTENTS:", pack1.products.map(p => p.name));
}

// TEST 2: Budget Clipping
console.log("\n[TEST 2] Budget Clipping Limits:");
const ret2 = createRetailer({
  requirements: "Paneer, Atta, Sugar, Salt, Masala, Tea, Biscuits",
  investmentBudget: "2000" // Very low budget
});

// Since MOQ for Paneer is 5kg, and Price is 320, line total is 1600.
// Atta is 320/kg, MOQ 10 = 3200. It should be skipped.
const pack2 = DeveloperPackEngine.generate(ret2, demandSignals.productSignals, demandSignals.categorySignals, gapSignals.productGaps, MOCK_CATALOGUES);

console.log(`  Retailer Budget Max: ${pack2.summary.budgetMax}`);
console.log(`  Generated Pack Total: ${pack2.summary.estimatedTotal}`);
console.log(`  Pack Product Count: ${pack2.products.length}`);
if (pack2.summary.estimatedTotal <= pack2.summary.budgetMax) {
  console.log("  => SUCCESS: Engine successfully clipped recommendations to fit within max budget.");
} else {
  console.error("  => FAILED: Engine exceeded max budget.");
}

// TEST 3: Budget Parsing Edge Cases
console.log("\n[TEST 3] Safe Budget Parsing:");
const parses = [
  DeveloperPackEngine.parseBudget("₹10,000 – ₹25,000").max === 25000,
  DeveloperPackEngine.parseBudget("5000").max === 5000,
  DeveloperPackEngine.parseBudget(null).valid === false,
  DeveloperPackEngine.parseBudget("Unknown").valid === false,
  DeveloperPackEngine.parseBudget("10000-5000").max === 10000 // Inverted safe fix
];
if (parses.every(v => v === true)) {
  console.log("  => SUCCESS: All budget strings parsed safely.");
} else {
  console.error("  => FAILED: Budget parser broke on edge cases.");
}

// TEST 4: Empty / Irrelevant Fallback
console.log("\n[TEST 4] Empty/Irrelevant Fallback:");
const ret3 = createRetailer({
  location: { area: "Mumbai", district: "Mumbai" }, // Mismatched location
  investmentBudget: "100" // Budget too small to buy anything
});
const pack3 = DeveloperPackEngine.generate(ret3, demandSignals.productSignals, demandSignals.categorySignals, gapSignals.productGaps, MOCK_CATALOGUES);

console.log(`  Returned Products: ${pack3.products.length}`);
if (pack3.products.length === 0) {
  console.log("  => SUCCESS: Engine safely returned 0 products instead of forcing invalid recommendations.");
} else {
  console.error("  => FAILED: Engine forced invalid recommendations.");
}

console.log("\n=========================================");
console.log("      AUDIT COMPLETE                     ");
console.log("=========================================");
