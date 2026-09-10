import { Normalization } from '../utils/normalization';

/**
 * DEVELOPER PACK ENGINE
 * 
 * A deterministic business intelligence service.
 * Cross-references Retailer Profile, local Demand Signals, Supply Gaps, and Catalogues
 * to generate a personalized, budget-constrained Developer Pack.
 */

export const DeveloperPackEngine = {

  /**
   * Safe budget parser for ranges like "₹10,000 – ₹25,000" or raw numbers.
   */
  parseBudget: (budgetString) => {
    if (!budgetString) return { min: 0, max: Infinity, valid: false };
    if (typeof budgetString === 'number') return { min: 0, max: budgetString, valid: true };

    const cleanStr = budgetString.toString().replace(/[\u2013\u2014]/g, '-').replace(/[^0-9\-]/g, '');
    const parts = cleanStr.split('-');
    
    let min = 0;
    let max = Infinity;

    if (parts.length === 2 && parts[0] && parts[1]) {
      min = parseInt(parts[0], 10);
      max = parseInt(parts[1], 10);
    } else if (parts.length > 0 && parts[0]) {
      max = parseInt(parts[0], 10);
      min = Math.floor(max * 0.5); // Fallback assumption for min if only 1 number given
    }

    if (isNaN(min)) min = 0;
    if (isNaN(max) || max === 0) max = Infinity;

    // Fix inverted ranges safely
    if (min > max && max !== Infinity) {
      const temp = min;
      min = max;
      max = temp;
    }

    return { min, max, valid: max !== Infinity };
  },

  /**
   * Generates a personalized Developer Pack.
   * 
   * @param {Object} retailer - The retailer profile object
   * @param {Array} productSignals - Array from DemandEngine
   * @param {Array} categorySignals - Array from DemandEngine 
   * @param {Array} productGaps - Array from SupplyGapEngine
   * @param {Array} distributorCatalogues - Array of mock distributor profiles
   * @param {Object} options - Config options
   */
  generate: (retailer = {}, productSignals = [], categorySignals = [], productGaps = [], distributorCatalogues = [], options = {}) => {
    
    // 1. Safe parsing of inputs
    const budget = DeveloperPackEngine.parseBudget(retailer.investmentBudget);
    
    // Extract Retailer explicit demands for string matching
    const reqText = Normalization.normalizeText(retailer.requirements || '');
    let unmetText = '';
    let unmetCats = [];
    if (typeof retailer.unmetNeeds === 'string') unmetText = Normalization.normalizeText(retailer.unmetNeeds);
    else if (retailer.unmetNeeds && typeof retailer.unmetNeeds === 'object') {
      unmetText = Normalization.normalizeText(retailer.unmetNeeds.other || '');
      unmetCats = (retailer.unmetNeeds.categories || []).map(Normalization.normalizeText);
    }
    const demCats = (retailer.demandedCategories || []).map(Normalization.normalizeText);
    const busType = Normalization.normalizeText(retailer.businessType || '');

    const retArea = Normalization.normalizeText(retailer.location?.area);
    const retDistrict = Normalization.normalizeText(retailer.location?.district);

    // 2. Discover all locally available products from all local distributors
    const candidateProductsMap = new Map(); // Key: normalized product name

    distributorCatalogues.forEach(dist => {
      // Very basic local filter (same district at least, or exact area)
      const distArea = Normalization.normalizeText(dist.location?.area);
      const distDistrict = Normalization.normalizeText(dist.location?.district);
      
      const isLocal = (!retDistrict && !retArea) || // If retailer location unknown, assume global for MVP mock
                      (retArea && distArea === retArea) || 
                      (retDistrict && distDistrict === retDistrict) ||
                      (distArea && !retDistrict); // Soft fallback
                      
      if (!isLocal) return;

      (dist.products || []).forEach(prod => {
        const normName = Normalization.normalizeText(prod.name);
        if (!normName) return;

        // Skip genuinely Out of Stock unless it's the only option later (we handle this via status weighting)
        let status = prod.stockStatus;
        if (!status && prod.availableStock !== undefined) {
          status = Normalization.deriveStockStatus(prod.availableStock);
        }

        if (!candidateProductsMap.has(normName)) {
          candidateProductsMap.set(normName, {
            name: prod.name,
            category: prod.category,
            normName,
            normCategory: Normalization.normalizeText(prod.category),
            options: [] // To store which distributors sell it
          });
        }
        
        candidateProductsMap.get(normName).options.push({
          ...prod,
          distributorId: dist.id,
          distributorName: dist.businessName,
          status
        });
      });
    });

    const candidates = Array.from(candidateProductsMap.values());

    // 3. Score Candidates Deterministically
    const scoredCandidates = candidates.map(candidate => {
      let score = 0;
      let reasonFlags = [];

      // A. Explicit Requirement Match (Strongest Signal)
      if (reqText.includes(candidate.normName) || unmetText.includes(candidate.normName)) {
        score += 40;
        reasonFlags.push(`Aapke explicitly requested requirement (${candidate.name}) ke hisaab se.`);
      }

      // B. Category Match
      const matchesDemandedCat = demCats.includes(candidate.normCategory);
      const matchesUnmetCat = unmetCats.includes(candidate.normCategory);
      if (matchesDemandedCat || matchesUnmetCat) {
        score += 20;
        if (reasonFlags.length === 0) reasonFlags.push(`Aapke selected ${candidate.category} category ke saath match karta hai.`);
      }

      // C. Business Type Match
      if (busType && (candidate.normCategory.includes(busType) || busType.includes(candidate.normCategory))) {
        score += 10;
        if (reasonFlags.length === 0) reasonFlags.push(`Aapke business type (${retailer.businessType}) ke liye commonly required product hai.`);
      }

      // D. Local Demand Signal (via DemandEngine Output)
      const localDemand = productSignals.find(s => Normalization.normalizeText(s.product) === candidate.normName && Normalization.normalizeText(s.area) === retArea);
      if (localDemand) {
        score += Math.min(20, localDemand.signalStrength); // Max 20 points
        if (localDemand.demandLevel === 'High' && reasonFlags.length === 0) {
          reasonFlags.push(`Aapke area mein ${candidate.name} ki demand strong hai.`);
        }
      }

      // E. Best Supply/Availability Option evaluation
      // Sort options to find the best distributor for this product
      candidate.options.sort((a, b) => {
        // Prefer Available over Low Stock over Out of Stock
        const getStatusWeight = (st) => st === 'Available' ? 3 : (st === 'Low Stock' ? 2 : 1);
        if (getStatusWeight(b.status) !== getStatusWeight(a.status)) return getStatusWeight(b.status) - getStatusWeight(a.status);
        // Prefer lower price
        if (a.price !== b.price) return a.price - b.price;
        // Prefer lower MOQ
        return (a.minimumOrderQuantity || 1) - (b.minimumOrderQuantity || 1);
      });

      const bestOption = candidate.options[0];
      
      // F. Supply Viability Penalty/Bonus
      if (bestOption.status === 'Available') {
        score += 10;
      } else if (bestOption.status === 'Out of Stock') {
        score -= 30; // Heavy penalty
      }

      // Default reason fallback
      if (reasonFlags.length === 0) {
        reasonFlags.push(`Local market trends ke basis par suggested.`);
      }

      return {
        ...candidate,
        bestOption,
        score,
        reason: reasonFlags[0] // Pick strongest reason
      };
    });

    // 4. Sort by score descending
    // Tie-breaker: If scores are equal, prefer Available over others, then Price.
    scoredCandidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.bestOption.status === 'Available' && b.bestOption.status !== 'Available') return -1;
      if (a.bestOption.status !== 'Available' && b.bestOption.status === 'Available') return 1;
      return a.bestOption.price - b.bestOption.price;
    });

    // 5. Select Products & Clip to Budget
    const finalProducts = [];
    let estimatedTotal = 0;
    
    // We want 3-5 products max
    const maxProducts = options.limit || 5;

    for (const item of scoredCandidates) {
      if (finalProducts.length >= maxProducts) break;
      if (item.score <= 0) continue; // Skip completely irrelevant or out of stock penalized items
      
      const opt = item.bestOption;
      if (opt.status === 'Out of Stock') continue; // Hard skip

      // Deterministic Quantity Heuristic
      const moq = opt.minimumOrderQuantity || 1;
      const suggestedQuantity = Math.max(moq, 10); // Standardize to at least 10 or MOQ, whichever is higher
      const price = opt.price || 100; // Fallback price for MVP mocks lacking it
      const lineTotal = suggestedQuantity * price;

      // Check Budget Clipping
      // If adding this line exceeds the Max budget, skip this product
      if (budget.valid && (estimatedTotal + lineTotal) > budget.max) {
        continue;
      }

      estimatedTotal += lineTotal;

      finalProducts.push({
        id: `dp_gen_${opt.id}_${Date.now()}_${Math.floor(Math.random()*1000)}`, // UI requires unique ID per row
        productId: opt.id,
        name: item.name,
        category: item.category,
        unit: opt.unit || 'units',
        suggestedQuantity,
        price: price, // unit price
        estimatedLineTotal: lineTotal,
        minimumOrderQuantity: moq,
        availability: opt.status,
        distributorOptions: item.options.length,
        recommendationScore: Math.min(100, item.score),
        reason: item.reason
      });
    }

    // 6. Generate Summary and Output Schema
    let budgetStatusMessage = 'Budget ke andar';
    if (budget.valid) {
      if (estimatedTotal > budget.max) budgetStatusMessage = 'Over budget';
      else if (estimatedTotal < budget.min) budgetStatusMessage = 'Under budget';
    } else {
      budgetStatusMessage = 'Budget not specified';
    }

    // Empty Pack safe fallback
    if (finalProducts.length === 0) {
      return {
        retailerId: retailer.id,
        generatedAt: new Date().toISOString(),
        products: [],
        summary: {
          productCount: 0,
          estimatedTotal: 0,
          budgetMin: budget.min,
          budgetMax: budget.max === Infinity ? null : budget.max,
          budgetStatus: budgetStatusMessage
        },
        explanation: "Abhi aapke requirements aur budget ke hisaab se suitable local products nahi mile."
      };
    }

    return {
      retailerId: retailer.id,
      generatedAt: new Date().toISOString(),
      products: finalProducts,
      summary: {
        productCount: finalProducts.length,
        estimatedTotal,
        budgetMin: budget.min,
        budgetMax: budget.max === Infinity ? null : budget.max,
        budgetStatus: budgetStatusMessage
      }
    };
  }
};
