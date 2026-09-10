import { DemandEngine } from './DemandEngine.js';
import { DEMAND_TEST_MOCK } from '../../../data/demandTestMock.js';

console.log("=========================================");
console.log("      DEMAND ENGINE AUDIT SCRIPT         ");
console.log("=========================================");

// 1. Run against the full deterministic mock
const results = DemandEngine.analyze(DEMAND_TEST_MOCK);

console.log("\n[TEST 1] Processing Full Mock Dataset...");
console.log(`Input Retailers: ${DEMAND_TEST_MOCK.length}`);
console.log(`Generated Category Signals: ${results.categorySignals.length}`);
console.log(`Generated Product Signals: ${results.productSignals.length}`);

// Find Palampur Dairy signal
const palampurDairy = results.categorySignals.find(s => s.area === 'Palampur Market' && s.category === 'Dairy');
console.log("\n[TEST 2] Verifying Palampur Market Dairy Signal:");
if (palampurDairy) {
  console.log(`  Level: ${palampurDairy.demandLevel}`);
  console.log(`  Strength: ${palampurDairy.signalStrength}`);
  console.log(`  Retailers: ${palampurDairy.retailerCount}`);
  console.log(`  Source Breakdown: `, palampurDairy.sourceBreakdown);
  if (palampurDairy.demandLevel === 'High') {
    console.log("  => SUCCESS: Palampur Dairy accurately identified as High demand.");
  } else {
    console.error("  => FAILED: Palampur Dairy not High.");
  }
} else {
  console.error("  => FAILED: Palampur Dairy signal not found.");
}

// Find Palampur Paneer signal
const palampurPaneer = results.productSignals.find(s => s.area === 'Palampur Market' && s.product === 'Paneer');
console.log("\n[TEST 3] Verifying Palampur Market Paneer Signal:");
if (palampurPaneer) {
  console.log(`  Level: ${palampurPaneer.demandLevel}`);
  console.log(`  Strength: ${palampurPaneer.signalStrength}`);
  console.log(`  Retailers: ${palampurPaneer.retailerCount}`);
  if (palampurPaneer.demandLevel === 'High') {
    console.log("  => SUCCESS: Paneer extraction successful.");
  } else {
    console.error("  => FAILED: Paneer extraction not scoring high.");
  }
} else {
  console.error("  => FAILED: Paneer extraction failed.");
}

// Verify Edge Cases
console.log("\n[TEST 4] Edge Cases & Fault Tolerance:");

const emptyResults = DemandEngine.analyze([]);
if (emptyResults.categorySignals.length === 0 && emptyResults.productSignals.length === 0) {
  console.log("  => SUCCESS: Handled empty array without crashing.");
} else {
  console.error("  => FAILED: Empty array handled incorrectly.");
}

const unknownResults = results.productSignals.find(s => s.area === 'unknown' && s.product === 'Paneer');
if (unknownResults) {
  console.log("  => SUCCESS: Handled missing location without crashing.");
} else {
  console.error("  => FAILED: Missing location signal not tracked.");
}

console.log("\n=========================================");
console.log("      AUDIT COMPLETE                     ");
console.log("=========================================");
