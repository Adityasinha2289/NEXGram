import { DemandEngine } from './DemandEngine.js';
import { SupplyGapEngine } from './SupplyGapEngine.js';
import { DEMAND_TEST_MOCK } from '../../../data/demandTestMock.js';
import { SUPPLY_GAP_CATALOGUES_MOCK } from '../../../data/supplyGapTestMock.js';

console.log("=========================================");
console.log("      SUPPLY GAP ENGINE AUDIT            ");
console.log("=========================================");

// 1. Generate Demand Signals
console.log("[STAGE 1] Generating Demand Signals...");
const demandSignals = DemandEngine.analyze(DEMAND_TEST_MOCK);
console.log(`=> Demand Engine generated ${demandSignals.categorySignals.length} Categories and ${demandSignals.productSignals.length} Products.`);

// 2. Generate Gap Signals
console.log("\n[STAGE 2] Calculating Supply Gaps...");
const gapOutput = SupplyGapEngine.analyze(demandSignals, SUPPLY_GAP_CATALOGUES_MOCK);
console.log(`=> Supply Gap Engine generated ${gapOutput.categoryGaps.length} Category Gaps and ${gapOutput.productGaps.length} Product Gaps.`);

// 3. Specific Assertion: Palampur Paneer
console.log("\n[TEST 1] Verifying Palampur Market Paneer Gap:");
const palampurPaneerGap = gapOutput.productGaps.find(g => g.area === 'Palampur Market' && g.product === 'Paneer');

if (palampurPaneerGap) {
  console.log(`  Gap Level: ${palampurPaneerGap.gapLevel}`);
  console.log(`  Gap Score: ${palampurPaneerGap.gapScore}`);
  console.log(`  Retailers Looking: ${palampurPaneerGap.retailersLooking}`);
  console.log(`  Distributors Serving Area: ${palampurPaneerGap.distributorsServing}`);
  console.log(`  Distributors Supplying Product: ${palampurPaneerGap.distributorsSupplying}`);
  console.log(`  Available Suppliers: ${palampurPaneerGap.availableSuppliers}`);
  console.log(`  Low Stock Suppliers: ${palampurPaneerGap.lowStockSuppliers}`);
  console.log(`  Explanation: ${palampurPaneerGap.reason.summary}`);

  // We expect "dist_verma" to be deduplicated (2 records for dist_verma, 1 for dist_sharma => 2 unique serving Palampur)
  // dist_verma is Out of Stock for Paneer. dist_sharma has Low Stock for Paneer.
  // So: supplying = 2, available = 0, lowStock = 1, outOfStock = 1.
  if (palampurPaneerGap.gapLevel === 'High' && palampurPaneerGap.lowStockSuppliers === 1) {
    console.log("  => SUCCESS: Palampur Paneer accurately identified as High Gap with Limited Supply.");
  } else {
    console.error("  => FAILED: Palampur Paneer gap not scoring correctly.");
  }
} else {
  console.error("  => FAILED: Palampur Paneer gap not found.");
}

// 4. Specific Assertion: Kangra Masala
console.log("\n[TEST 2] Verifying Kangra Masala Gap:");
const kangraMasalaGap = gapOutput.productGaps.find(g => g.area === 'Kangra Central' && g.product === 'Masala');
if (kangraMasalaGap) {
  console.log(`  Gap Level: ${kangraMasalaGap.gapLevel}`);
  console.log(`  Retailers Looking: ${kangraMasalaGap.retailersLooking}`);
  console.log(`  Suppliers Available: ${kangraMasalaGap.availableSuppliers}`);
  // Retailers looking is 1 (Low Demand). Supplier available is 1 (Limited Supply). Low + Limited = Medium Gap.
  if (kangraMasalaGap.gapLevel === 'Medium') {
    console.log("  => SUCCESS: Kangra Masala accurately identified as Medium Gap.");
  } else {
    console.error(`  => FAILED: Expected Medium, got ${kangraMasalaGap.gapLevel}.`);
  }
} else {
  console.error("  => FAILED: Kangra Masala gap not found.");
}

// 5. Deduplication & Missing Location Check
console.log("\n[TEST 3] Edge Cases:");
const hasUnknownLocationSupplier = SUPPLY_GAP_CATALOGUES_MOCK.some(c => !c.location);
if (hasUnknownLocationSupplier) {
  // 'Ghost Distributors' is unknown location, it should not falsely increment Palampur Paneer serving counts.
  if (palampurPaneerGap && palampurPaneerGap.distributorsServing === 2) {
    console.log("  => SUCCESS: Unknown location suppliers did not falsely map to local areas.");
  } else {
    console.error("  => FAILED: Unknown location supplier polluted local area mapping.");
  }
}

// 6. Compare Score Relativity
console.log("\n[TEST 4] Score Relativity:");
if (palampurPaneerGap && kangraMasalaGap) {
  if (palampurPaneerGap.gapScore > kangraMasalaGap.gapScore) {
    console.log(`  => SUCCESS: High Demand + Low Stock (${palampurPaneerGap.gapScore}) outscores Low Demand + Available (${kangraMasalaGap.gapScore}).`);
  } else {
    console.error("  => FAILED: Score relativity is incorrect.");
  }
}

console.log("\n=========================================");
console.log("      AUDIT COMPLETE                     ");
console.log("=========================================");
