import { Normalization } from '../utils/normalization';

/**
 * OPPORTUNITY ENGINE
 * 
 * A deterministic business intelligence service.
 * Ranks product and category gaps into commercially viable local opportunities.
 */

export const OpportunityEngine = {
  
  /**
   * Analyzes supply gaps to produce ranked opportunities.
   * 
   * @param {Array} productGaps - Output from SupplyGapEngine.productGaps
   * @param {Array} categoryGaps - Output from SupplyGapEngine.categoryGaps
   * @param {Array} distributors - Array of all known distributors (for fit calculations)
   * @param {Object} options - { distributorId, limit, ...filters }
   * @returns {Array} Ranked array of normalized opportunity objects.
   */
  analyze: (productGaps = [], categoryGaps = [], distributors = [], options = {}) => {
    const opportunities = [];
    
    // Attempt to locate target distributor if analyzing for a specific business
    let targetDistributor = null;
    if (options.distributorId) {
      targetDistributor = distributors.find(d => (d.id || d.distributorId) === options.distributorId);
    }

    // Helper: Determine Competition Level
    const getCompetitionLevel = (supplierCount) => {
      if (supplierCount === 0) return 'Very Low';
      if (supplierCount === 1) return 'Low';
      if (supplierCount >= 4) return 'High';
      return 'Medium'; // 2-3
    };

    // Helper: Determine Distributor Fit
    const evaluateDistributorFit = (distributor, gap) => {
      if (!distributor) return { level: 'Global', explanation: '' };

      // 1. Location match
      const distArea = Normalization.normalizeText(distributor.location?.area);
      const distDistrict = Normalization.normalizeText(distributor.location?.district);
      const gapArea = Normalization.normalizeText(gap.area);
      const gapDistrict = Normalization.normalizeText(gap.district);

      let locationFit = false;
      let locationLevel = 'unknown'; // area, district, none
      
      if (distArea && distArea === gapArea) {
        locationFit = true;
        locationLevel = 'area';
      } else if (!gapArea && distDistrict === gapDistrict) {
        locationFit = true;
        locationLevel = 'district';
      } else if (distDistrict === gapDistrict) {
        // Technically serves district, maybe not explicitly area, but serviceRadius mock applies
        locationFit = true;
        locationLevel = 'serviceRadius';
      }

      if (!locationFit) return { level: 'Not Suitable', explanation: 'Location mismatch.' };

      // 2. Category match
      const gapCat = Normalization.normalizeText(gap.category);
      const operatesInCat = (distributor.productCategories || []).some(
        c => Normalization.normalizeText(c) === gapCat
      ) || Normalization.normalizeText(distributor.businessCategory) === gapCat;

      if (!operatesInCat) {
        return { level: 'Low', explanation: 'Weak match: In your service area but outside your primary categories.' };
      }

      if (locationLevel === 'area') {
        return { level: 'High', explanation: 'Strong match: Operates in your primary area and matches your product categories.' };
      }
      
      return { level: 'Medium', explanation: 'Moderate match: Relevant to your service area and category.' };
    };

    // Process a single gap
    const processGap = (gap, isProduct) => {
      // 1. Evaluate specific distributor constraints
      let fit = { level: 'Global', explanation: '' };
      if (targetDistributor) {
        fit = evaluateDistributorFit(targetDistributor, gap);
        // Exclude strictly mis-matched locations for specific distributor queries
        if (fit.level === 'Not Suitable') return null;
      }

      // 2. Derive Competition
      const compLevel = getCompetitionLevel(gap.distributorsSupplying);

      // 3. Compute Opportunity Score (0-100)
      // Base score is inherited from the Supply Gap Score
      let baseScore = gap.gapScore || 0; 
      
      // Bonus: +2 per retailer looking (up to +20)
      const volumeBonus = Math.min(20, (gap.retailersLooking || 0) * 2);
      
      // Competition Adjustments
      let compAdjustment = 0;
      if (compLevel === 'Very Low') compAdjustment = +10;
      else if (compLevel === 'Low') compAdjustment = +5;
      else if (compLevel === 'High') compAdjustment = -10;
      
      let rawScore = baseScore + volumeBonus + compAdjustment;
      let opportunityScore = Math.max(0, Math.min(100, Math.round(rawScore)));

      // 4. Derive Opportunity Level
      let oppLevel = 'Low';
      if (opportunityScore >= 80) oppLevel = 'Strong';
      else if (opportunityScore >= 65) oppLevel = 'Good';
      else if (opportunityScore >= 45) oppLevel = 'Moderate';

      // 5. Stock Recommendation Heuristic
      let initialStockRecommendation = null;
      if (isProduct) {
        initialStockRecommendation = {
          suggestedQuantity: Math.max(10, gap.retailersLooking * 5),
          unit: "units", // Default MVP heuristic fallback
          basis: "Based on local retailer demand velocity."
        };
      }

      // 6. Natural Language Explainability Templates
      const demandText = `${gap.retailersLooking} retailer${gap.retailersLooking !== 1 ? 's are' : ' is'} looking for ${isProduct ? gap.product : gap.category}.`;
      const supplyText = gap.distributorsSupplying === 0 
        ? `No local distributors currently supply it.` 
        : `Only ${gap.distributorsSupplying} local distributor${gap.distributorsSupplying !== 1 ? 's' : ''} currently suppl${gap.distributorsSupplying !== 1 ? 'y' : 'ies'} it.`;
      
      let summaryText = 'Moderate opportunity in the market.';
      if (oppLevel === 'Strong') summaryText = 'High demand with limited supply creates a strong commercial opportunity.';
      else if (oppLevel === 'Low') summaryText = 'Market may already be saturated or demand is too weak.';

      return {
        id: `opp_${gap.id}`,
        product: gap.product,
        category: gap.category,
        area: gap.area,
        district: gap.district,
        isProductOpportunity: isProduct,
        
        demand: {
          retailersLooking: gap.retailersLooking,
          demandLevel: gap.demandLevel // Passed down historically from DemandEngine if mapped, though not strictly on gap object natively, we rely on retailersLooking
        },
        supply: {
          distributorsSupplying: gap.distributorsSupplying,
          availableSuppliers: gap.availableSuppliers,
          supplyLevel: gap.supplyLevel
        },
        competition: {
          level: compLevel,
          supplierCount: gap.distributorsSupplying
        },
        
        opportunityLevel: oppLevel,
        opportunityScore: opportunityScore,
        potentialRetailers: gap.retailersLooking,
        initialStockRecommendation,
        
        fit,
        reason: {
          demand: demandText,
          supply: supplyText,
          competition: `Local competition is ${compLevel.toLowerCase()}.`,
          fit: fit.explanation,
          summary: summaryText
        }
      };
    };

    // 1. Process all product gaps
    productGaps.forEach(gap => {
      const opp = processGap(gap, true);
      if (opp) opportunities.push(opp);
    });

    // 2. Process category gaps (deduplicating if a product gap already covers it substantially)
    categoryGaps.forEach(gap => {
      // If we already have 2+ product opportunities for this category in this area, 
      // the category opportunity is somewhat redundant but still useful for high-level views.
      const opp = processGap(gap, false);
      if (opp) opportunities.push(opp);
    });

    // 3. Optional Generic Filtering
    let filteredOpps = opportunities;
    if (options.area) {
      filteredOpps = filteredOpps.filter(o => Normalization.normalizeText(o.area) === Normalization.normalizeText(options.area));
    }
    if (options.district && !options.area) {
      filteredOpps = filteredOpps.filter(o => Normalization.normalizeText(o.district) === Normalization.normalizeText(options.district));
    }
    if (options.category) {
      filteredOpps = filteredOpps.filter(o => Normalization.normalizeText(o.category) === Normalization.normalizeText(options.category));
    }

    // 4. Deterministic Ranking
    filteredOpps.sort((a, b) => {
      // Primary: Score
      if (b.opportunityScore !== a.opportunityScore) return b.opportunityScore - a.opportunityScore;
      // Secondary: Demand Volume
      if (b.potentialRetailers !== a.potentialRetailers) return b.potentialRetailers - a.potentialRetailers;
      // Tertiary: Lower competition
      if (a.competition.supplierCount !== b.competition.supplierCount) return a.competition.supplierCount - b.competition.supplierCount;
      // Quaternary: Product level > Category level
      if (a.isProductOpportunity && !b.isProductOpportunity) return -1;
      if (!a.isProductOpportunity && b.isProductOpportunity) return 1;
      return 0;
    });

    // 5. Apply limits
    if (options.limit && options.limit > 0) {
      return filteredOpps.slice(0, options.limit);
    }

    return filteredOpps;
  }
};
