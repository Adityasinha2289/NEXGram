import { DemandEngine } from './DemandEngine.js';
import { SupplyGapEngine } from './SupplyGapEngine.js';
import { OpportunityEngine } from './OpportunityEngine.js';
import { DEMAND_TEST_MOCK } from '../../../data/demandTestMock.js';
import { SUPPLY_GAP_CATALOGUES_MOCK } from '../../../data/supplyGapTestMock.js';

console.log("=========================================");
console.log("      OPPORTUNITY ENGINE AUDIT           ");
console.log("=========================================");

// 1. Generate Baseline Signals
const demandSignals = DemandEngine.analyze(DEMAND_TEST_MOCK);
const gapOutput = SupplyGapEngine.analyze(demandSignals, SUPPLY_GAP_CATALOGUES_MOCK);

// 2. Generate Global Opportunities
console.log("\n[STAGE 1] Calculating Global Opportunities...");
const opportunities = OpportunityEngine.analyze(gapOutput.productGaps, gapOutput.categoryGaps, SUPPLY_GAP_CATALOGUES_MOCK);
console.log(`=> Generated ${opportunities.length} global opportunities.`);

// 3. Test Business Priority (Paneer vs Masala)
// In our mock: Paneer has 6 looking, 1 supplying (low stock). Masala has 1 looking, 1 supplying (available).
console.log("\n[TEST 1] Verifying Score Priorities (Paneer vs Masala):");
const paneerOpp = opportunities.find(o => o.product === 'Paneer' && o.area === 'Palampur Market');
const masalaOpp = opportunities.find(o => o.product === 'Masala' && o.area === 'Kangra Central');

if (paneerOpp && masalaOpp) {
  console.log(`  Paneer Score: ${paneerOpp.opportunityScore} | Level: ${paneerOpp.opportunityLevel} | Fit: ${paneerOpp.fit.level}`);
  console.log(`  Masala Score: ${masalaOpp.opportunityScore} | Level: ${masalaOpp.opportunityLevel} | Fit: ${masalaOpp.fit.level}`);
  
  if (paneerOpp.opportunityScore > masalaOpp.opportunityScore) {
    console.log("  => SUCCESS: High Demand + Low Supply accurately outscores Low Demand + High Supply.");
  } else {
    console.error("  => FAILED: Priority sorting heuristic is broken.");
  }
} else {
  console.error("  => FAILED: Missing baseline opportunities.");
}

// 4. Test Distributor-Specific Match (Sharma Distributors)
// Sharma operates in Palampur and sells Dairy. Should be "High" fit for Palampur Paneer.
console.log("\n[TEST 2] Verifying Distributor Fit Logic (Sharma Distributors):");
const sharmaOpportunities = OpportunityEngine.analyze(
  gapOutput.productGaps, 
  gapOutput.categoryGaps, 
  SUPPLY_GAP_CATALOGUES_MOCK, 
  { distributorId: 'dist_sharma' }
);

const sharmaPaneerFit = sharmaOpportunities.find(o => o.product === 'Paneer' && o.area === 'Palampur Market');
const sharmaMasalaFit = sharmaOpportunities.find(o => o.product === 'Masala' && o.area === 'Kangra Central');

if (sharmaPaneerFit) {
  console.log(`  Palampur Paneer Fit: ${sharmaPaneerFit.fit.level} | Explanation: ${sharmaPaneerFit.fit.explanation}`);
  if (sharmaPaneerFit.fit.level === 'High') {
    console.log("  => SUCCESS: Properly flagged Dairy product in native area as High Fit.");
  } else {
    console.error("  => FAILED: Distributor fit mapping is incorrect.");
  }
} else {
  console.error("  => FAILED: Missing Palampur Paneer opportunity for Sharma.");
}

if (sharmaMasalaFit) {
  console.log(`  Kangra Masala Fit: ${sharmaMasalaFit.fit.level} | Explanation: ${sharmaMasalaFit.fit.explanation}`);
  if (sharmaMasalaFit.fit.level === 'Low') {
    console.log("  => SUCCESS: Properly flagged mismatched category in the same district as Low Fit.");
  } else {
    console.error("  => FAILED: Included mis-matched category opportunity with incorrect fit level.");
  }
} else {
  console.error("  => FAILED: Missing Kangra opportunity (it shares the Kangra district and should be a Low fit).");
}

// 5. Test Filtering & Ranking
console.log("\n[TEST 3] Ranking & Limits:");
const top3 = OpportunityEngine.analyze(gapOutput.productGaps, gapOutput.categoryGaps, SUPPLY_GAP_CATALOGUES_MOCK, { limit: 3 });
console.log(`  Requested Top 3. Received: ${top3.length}`);
if (top3.length === 3) {
  console.log(`  #1 Opportunity: ${top3[0].product || top3[0].category} in ${top3[0].area} (Score: ${top3[0].opportunityScore})`);
  console.log(`  #2 Opportunity: ${top3[1].product || top3[1].category} in ${top3[1].area} (Score: ${top3[1].opportunityScore})`);
  console.log(`  #3 Opportunity: ${top3[2].product || top3[2].category} in ${top3[2].area} (Score: ${top3[2].opportunityScore})`);
  
  if (top3[0].opportunityScore >= top3[1].opportunityScore) {
    console.log("  => SUCCESS: Deterministic descending sort verified.");
  } else {
    console.error("  => FAILED: Array is not sorted by score.");
  }
}

// 6. Test Explainability Payload
console.log("\n[TEST 4] Explainability Generator:");
if (paneerOpp) {
  console.log(`  Generated Reason:`);
  console.log(`  - Demand: ${paneerOpp.reason.demand}`);
  console.log(`  - Supply: ${paneerOpp.reason.supply}`);
  console.log(`  - Summary: ${paneerOpp.reason.summary}`);
  if (paneerOpp.reason.demand.includes('retailer') && paneerOpp.reason.supply.includes('distributor')) {
    console.log("  => SUCCESS: Human-readable templates generated.");
  } else {
    console.error("  => FAILED: Human-readable templates broken.");
  }
}

console.log("\n=========================================");
console.log("      AUDIT COMPLETE                     ");
console.log("=========================================");
