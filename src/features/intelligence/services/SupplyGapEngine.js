import { Normalization } from '../utils/normalization';

/**
 * SUPPLY GAP ENGINE
 * 
 * A deterministic business intelligence service.
 * Compares DemandSignals against DistributorCatalogues to calculate Supply Gap metrics.
 */

export const SupplyGapEngine = {
  /**
   * Calculates supply gaps by matching demand against local distributor supply.
   * 
   * @param {Object} demandOutput - { categorySignals, productSignals } from DemandEngine
   * @param {Array} distributorCatalogues - Array of distributor profiles with embedded .products[]
   * @param {Object} options - Reserved for future configurations.
   * @returns {Object} { categoryGaps, productGaps }
   */
  analyze: (demandOutput, distributorCatalogues = [], options = {}) => {
    if (!demandOutput) return { categoryGaps: [], productGaps: [] };

    const { categorySignals = [], productSignals = [] } = demandOutput;

    // Deduplicate distributors by ID (in case the same mock appears twice)
    const uniqueCatalogues = Array.from(new Map(
      (distributorCatalogues || []).map(cat => [cat.distributorId || cat.id, cat])
    ).values());

    // Helper: Determine if a distributor serves a demand location
    const isLocalSupply = (distributor, demandArea, demandDistrict) => {
      if (!distributor || !distributor.location) return false;
      
      const distArea = Normalization.normalizeText(distributor.location.area);
      const distDistrict = Normalization.normalizeText(distributor.location.district);
      const targetArea = Normalization.normalizeText(demandArea);
      const targetDistrict = Normalization.normalizeText(demandDistrict);

      // We cannot falsely count unknown locations as local
      if (!targetDistrict && !targetArea) return false;

      // Exact match
      if (targetArea && distArea === targetArea) return true;
      // District fallback match
      if (!targetArea && targetDistrict && distDistrict === targetDistrict) return true;
      
      return false;
    };

    // Helper: Analyze a specific signal against catalogues
    const computeGap = (signal) => {
      const isProduct = signal.product !== undefined;
      const targetName = Normalization.normalizeText(isProduct ? signal.product : signal.category);
      
      let distributorsServing = 0;
      const supplyingDistributors = new Set();
      let availableSuppliers = 0;
      let lowStockSuppliers = 0;
      let outOfStockSuppliers = 0;

      uniqueCatalogues.forEach(distributor => {
        if (!isLocalSupply(distributor, signal.area, signal.district)) return;
        
        distributorsServing += 1;

        // Check catalogue
        const products = Array.isArray(distributor.products) ? distributor.products : [];
        
        // Find best match in catalogue
        let hasItem = false;
        let bestStatus = 'Out of Stock';

        for (const prod of products) {
          const matchTarget = Normalization.normalizeText(isProduct ? prod.name : prod.category);
          
          if (matchTarget === targetName) {
            hasItem = true;
            
            // Determine stock condition
            let status = prod.stockStatus;
            if (!status && prod.availableStock !== undefined) {
              status = Normalization.deriveStockStatus(prod.availableStock);
            }

            // Keep the best status if multiple duplicate products exist in one catalogue
            if (status === 'Available') {
              bestStatus = 'Available';
              break; // Best possible condition
            } else if (status === 'Low Stock' && bestStatus === 'Out of Stock') {
              bestStatus = 'Low Stock';
            }
          }
        }

        if (hasItem) {
          supplyingDistributors.add(distributor.distributorId || distributor.id);
          if (bestStatus === 'Available') availableSuppliers++;
          else if (bestStatus === 'Low Stock') lowStockSuppliers++;
          else outOfStockSuppliers++;
        }
      });

      const distributorsSupplying = supplyingDistributors.size;

      // Determine Supply Level
      let supplyLevel = 'Unavailable';
      if (availableSuppliers >= 4) supplyLevel = 'Strong';
      else if (availableSuppliers >= 2) supplyLevel = 'Adequate';
      else if (availableSuppliers === 1 || lowStockSuppliers > 0) supplyLevel = 'Limited';
      
      if (distributorsSupplying === 0) supplyLevel = 'Unavailable';

      // Determine Gap Level
      let gapLevel = 'None';
      const dLevel = signal.demandLevel;
      
      if ((dLevel === 'High' || dLevel === 'Medium') && (supplyLevel === 'Unavailable' || supplyLevel === 'Limited')) {
        gapLevel = 'High';
      } else if ((dLevel === 'Medium' && supplyLevel === 'Adequate') || (dLevel === 'Low' && supplyLevel === 'Limited')) {
        gapLevel = 'Medium';
      } else if ((dLevel === 'Low' && supplyLevel !== 'Unavailable') || (dLevel === 'High' && supplyLevel === 'Strong')) {
        gapLevel = 'Low';
      }

      // Determine Gap Score (0-100)
      const baseDemandScore = signal.signalStrength * 1.5;
      const supplyPenalty = (availableSuppliers * 15) + (lowStockSuppliers * 5);
      const rawScore = baseDemandScore - supplyPenalty;
      const gapScore = Math.max(0, Math.min(100, Math.round(rawScore)));

      // Deterministic Explainability
      let supplyExplanation = `${distributorsSupplying} distributor${distributorsSupplying !== 1 ? 's' : ''} supplying`;
      if (distributorsSupplying === 0) supplyExplanation = '0 distributors supplying';
      
      let summaryText = 'Demand is low and supply covers the area.';
      if (gapLevel === 'High') summaryText = 'Demand is strong but local supply is limited or completely unavailable.';
      if (gapLevel === 'Medium') summaryText = 'Moderate demand is somewhat served, leaving a minor supply gap.';
      if (gapLevel === 'Low') summaryText = 'Demand is either very weak, or local suppliers already dominate this market.';
      if (gapLevel === 'None') summaryText = 'No significant demand detected.';

      return {
        id: `gap_${signal.id}`,
        product: signal.product,
        category: signal.category,
        area: signal.area,
        district: signal.district,
        retailersLooking: signal.retailerCount,
        distributorsServing,
        distributorsSupplying,
        availableSuppliers,
        lowStockSuppliers,
        outOfStockSuppliers,
        supplyLevel,
        gapLevel,
        gapScore,
        reason: {
          demand: `${signal.retailerCount} retailer${signal.retailerCount !== 1 ? 's' : ''} looking`,
          supply: supplyExplanation,
          availability: supplyLevel,
          summary: summaryText
        }
      };
    };

    // Calculate all gaps
    const categoryGaps = categorySignals.map(computeGap).sort((a, b) => b.gapScore - a.gapScore);
    const productGaps = productSignals.map(computeGap).sort((a, b) => b.gapScore - a.gapScore);

    return { categoryGaps, productGaps };
  }
};
