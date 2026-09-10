import { DemandEngine } from './DemandEngine.js';
import { SupplyGapEngine } from './SupplyGapEngine.js';
import { DeveloperPackEngine } from './DeveloperPackEngine.js';
import { DistributorMatchingEngine } from './DistributorMatchingEngine.js';
import { DEMAND_TEST_MOCK } from '../../../data/demandTestMock.js';
import { SUPPLY_GAP_CATALOGUES_MOCK } from '../../../data/supplyGapTestMock.js';
import { Models } from '../../../data/models.js';

console.log("=========================================");
console.log("    DISTRIBUTOR MATCHING ENGINE AUDIT    ");
console.log("=========================================");

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

// 1. Setup Base Intelligence
const demandSignals = DemandEngine.analyze(DEMAND_TEST_MOCK);
const gapSignals = SupplyGapEngine.analyze(demandSignals, MOCK_CATALOGUES);

const ret1 = createRetailer({
  requirements: "Paneer, Milk",
  demandedCategories: ["Dairy"],
  investmentBudget: "50000"
});
const pack1 = DeveloperPackEngine.generate(ret1, demandSignals.productSignals, demandSignals.categorySignals, gapSignals.productGaps, MOCK_CATALOGUES, { limit: 2 });

// TESTS 1-10: Pipeline evaluation
console.log("\n[TESTS] Evaluating Matching Engine...");
const matchResult = DistributorMatchingEngine.match(pack1, MOCK_CATALOGUES, []);

if (!matchResult || !matchResult.bestMatch) {
  console.error("  => FAILED: Engine returned no matches.");
} else {
  console.log(`  Best Match: ${matchResult.bestMatch.distributorName}`);
  console.log(`  Match Score: ${matchResult.bestMatch.matchScore}`);
  console.log(`  Fulfilment: ${matchResult.bestMatch.fulfilmentStatus}`);
  console.log(`  Single Supplier: ${matchResult.singleSupplierFulfilment}`);

  console.log(`  Pack contains: ${pack1.products.map(p => p.name).join(', ')}`);

  // Test 1: Exact product match & Test 8: Complete pack
  if (matchResult.bestMatch.fulfilmentStatus === 'Full') {
    console.log("  => SUCCESS (Test 1, 8): Exact products matched and full fulfillment achieved.");
  } else {
    console.error(`  => FAILED: Expected Full fulfilment for Paneer + Milk from Sharma Distributors. Status: ${matchResult.bestMatch.fulfilmentStatus}`);
  }

  // Test 2: Category false positive prevention
  const allMatches = [matchResult.bestMatch, ...matchResult.alternatives];
  const vermaMatches = allMatches.filter(m => m && m.distributorId === 'dist_verma');
  const validVerma = vermaMatches.find(v => v.productsFulfilled > 0);
  
  if (validVerma && validVerma.fulfilmentStatus === 'Partial' && validVerma.productsFulfilled === 1) {
    console.log("  => SUCCESS (Test 2, 9, 10): Verma is Partial because Paneer is OOS. No category false-positive substitution.");
  } else {
    console.error(`  => FAILED: Category false positive or Out-Of-Stock error. (Verma status: ${validVerma?.fulfilmentStatus}, Fulfilled: ${validVerma?.productsFulfilled})`);
  }

  // Test 5: Location ranking
  const ghostAlt = allMatches.find(a => a && a.distributorId === 'dist_unknown');
  if (ghostAlt && matchResult.bestMatch.matchScore > ghostAlt.matchScore) {
    console.log("  => SUCCESS (Test 5, 6): Location boundaries heavily penalized unknown service areas.");
  } else {
    console.error(`  => FAILED: Location boundaries ignored. (Ghost score: ${ghostAlt?.matchScore}, Best score: ${matchResult.bestMatch.matchScore})`);
    console.log("ALL MATCHES:", allMatches.map(m => m?.distributorId));
  }
}

// Test 11: Duplicate Catalogue Handling
console.log("\n[TEST 11] Duplicate Catalogue Safety:");
const allVermaMatches = [matchResult.bestMatch, ...matchResult.alternatives].filter(m => m && m.distributorId === 'dist_verma');
if (allVermaMatches.length === 1) {
  console.log("  => SUCCESS: Empty duplicate catalogue gracefully ignored.");
} else {
  console.error(`  => FAILED: Duplicate or empty catalogues leaked into matches. Found ${allVermaMatches.length} Verma matches.`);
}

// Test 12: Empty Inputs
console.log("\n[TEST 12] Empty Input Safety:");
const emptyMatch = DistributorMatchingEngine.match({ products: [] }, MOCK_CATALOGUES, []);
if (!emptyMatch.bestMatch && emptyMatch.unmatchedProducts.length === 0) {
  console.log("  => SUCCESS: Empty pack handled without crashing.");
} else {
  console.error("  => FAILED: Empty pack crashed or returned ghost data.");
}

// Test 13: Determinism
console.log("\n[TEST 13] Determinism Verification:");
const rerun = DistributorMatchingEngine.match(pack1, MOCK_CATALOGUES, []);
if (rerun.bestMatch?.distributorId === matchResult.bestMatch?.distributorId && rerun.bestMatch?.matchScore === matchResult.bestMatch?.matchScore) {
  console.log("  => SUCCESS: Engine output is purely deterministic.");
} else {
  console.error("  => FAILED: Rerun produced different results.");
}

console.log("\n=========================================");
console.log("      AUDIT COMPLETE                     ");
console.log("=========================================");
