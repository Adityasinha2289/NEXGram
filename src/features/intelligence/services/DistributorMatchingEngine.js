import { Normalization } from '../utils/normalization';

/**
 * DISTRIBUTOR MATCHING ENGINE
 * 
 * A deterministic business intelligence service.
 * Cross-references a generated Developer Pack against Distributor Catalogues
 * to answer: "WHO can realistically fulfill this order?"
 */

export const DistributorMatchingEngine = {
  
  /**
   * Matches a Developer Pack to the best capable distributors.
   * 
   * @param {Object} developerPack - The payload output by DeveloperPackEngine
   * @param {Array} distributorCatalogues - Array of distributor profiles containing products
   * @param {Array} distributors - Fallback metadata for distributors (if segregated from catalogues)
   * @param {Object} options - Config options (limit, allowPartialFulfilment)
   * @returns {Object} Deterministic fulfillment payload.
   */
  match: (developerPack, distributorCatalogues = [], distributors = [], options = {}) => {
    
    // Safety check
    if (!developerPack || !developerPack.products || developerPack.products.length === 0) {
      return {
        retailerId: developerPack?.retailerId,
        generatedAt: new Date().toISOString(),
        packId: developerPack?.id || 'unknown',
        singleSupplierFulfilment: false,
        bestMatch: null,
        alternatives: [],
        unmatchedProducts: [],
        reasons: ["Developer Pack is empty or invalid."]
      };
    }

    const retailerLocation = developerPack.retailerLocation || null; // If passed implicitly
    const packProducts = developerPack.products;

    // We will build a profile for each distributor evaluating their fulfillment capacity
    const distributorMatches = new Map();

    // Setup base models for distributors
    distributorCatalogues.forEach(dist => {
      distributorMatches.set(dist.id, {
        distributorId: dist.id,
        distributorName: dist.businessName,
        location: dist.location,
        productsFulfilled: [],
        productsUnmatched: [], // Products in the pack they cannot fulfill
        totalAmount: 0,
        scoreComponents: {
          productMatches: 0,
          stockHealth: 0,
          moqFriction: 0,
          locationFit: 0
        },
        matchScore: 0,
        reasons: []
      });
    });

    // 1. Evaluate Every Product against Every Distributor
    packProducts.forEach(packItem => {
      const normPackName = Normalization.normalizeText(packItem.name);
      
      distributorMatches.forEach(matchData => {
        const distCat = distributorCatalogues.find(d => d.id === matchData.distributorId);
        
        // Find matching product in this distributor's catalogue
        // Strict mapping: Must match exact Name/ID. (No Category Fallbacks allowed here)
        const matchedCatalogItem = (distCat.products || []).find(p => 
          Normalization.normalizeText(p.name) === normPackName ||
          (p.id && packItem.productId && p.id === packItem.productId)
        );

        if (!matchedCatalogItem) {
          matchData.productsUnmatched.push({
            ...packItem,
            reason: "Yeh product inke catalogue mein available nahi hai."
          });
          return;
        }

        // Evaluate Stock constraints
        let stockStatus = matchedCatalogItem.stockStatus;
        if (!stockStatus && matchedCatalogItem.availableStock !== undefined) {
          stockStatus = Normalization.deriveStockStatus(matchedCatalogItem.availableStock);
        }

        if (stockStatus === 'Out of Stock' || (matchedCatalogItem.availableStock === 0 && !matchedCatalogItem.stockStatus)) {
          matchData.productsUnmatched.push({
            ...packItem,
            reason: "Yeh product currently Out of Stock hai."
          });
          return;
        }

        // Evaluate MOQ vs Requested Quantity
        const requestedQty = packItem.suggestedQuantity || 1;
        const moq = matchedCatalogItem.minimumOrderQuantity || 1;
        let fulfilmentQuantity = requestedQty;
        let matchStatus = 'Available';
        let moqFriction = false;
        let reasons = ["Aapke requirement ke hisaab se product available hai."];

        if (requestedQty < moq) {
          // The pack requested less than the distributor is willing to sell.
          fulfilmentQuantity = moq;
          matchStatus = 'MOQ Adjusted';
          moqFriction = true;
          reasons = [`Aapka suggested quantity (${requestedQty}) inke minimum order (${moq}) se kam hai, quantity adjust ki gayi hai.`];
        }

        const price = matchedCatalogItem.price || packItem.price || 100; // Safe fallback
        const estimatedLineTotal = fulfilmentQuantity * price;

        matchData.productsFulfilled.push({
          productId: matchedCatalogItem.id,
          name: packItem.name,
          category: packItem.category,
          requestedQuantity: requestedQty,
          fulfilmentQuantity,
          availableStock: matchedCatalogItem.availableStock,
          minimumOrderQuantity: moq,
          price,
          estimatedLineTotal,
          matchStatus,
          reasons
        });

        matchData.totalAmount += estimatedLineTotal;
        
        // Accumulate internal score data
        matchData.scoreComponents.productMatches += 30; // Base score for having the item
        if (stockStatus === 'Available') matchData.scoreComponents.stockHealth += 20;
        else if (stockStatus === 'Low Stock') matchData.scoreComponents.stockHealth += 10;
        
        if (moqFriction) matchData.scoreComponents.moqFriction -= 10; // Penalize forcing retailer to buy more
      });
    });

    // 2. Compute Geographic Fit & Final Match Score
    const scoredMatches = Array.from(distributorMatches.values()).map(match => {
      // If they fulfill nothing, drop them entirely
      if (match.productsFulfilled.length === 0) {
        if (match.distributorId === 'dist_unknown') console.log("GHOST WAS DROPPED: 0 fulfilled", match.productsUnmatched);
        return { ...match, fulfilmentStatus: 'Not Fulfillable', matchScore: 0 };
      }

      // Calculate fulfillment percentage
      const percentFulfilled = match.productsFulfilled.length / packProducts.length;
      
      // Calculate Location Fit (Using mock data logic since explicit location mapping is basic in MVP)
      let locationFitScore = 0;
      let locationReason = "Service area unknown.";
      
      if (retailerLocation) {
        const retArea = Normalization.normalizeText(retailerLocation.area);
        const retDist = Normalization.normalizeText(retailerLocation.district);
        const distArea = Normalization.normalizeText(match.location?.area);
        const distDist = Normalization.normalizeText(match.location?.district);

        if (retArea && distArea === retArea) {
          locationFitScore = 20;
          locationReason = "Yeh distributor exactly aapke area mein hai.";
        } else if (retDist && distDist === retDist) {
          locationFitScore = 10;
          locationReason = "Yeh distributor aapke district mein service karta hai.";
        } else if (distDist) {
          locationFitScore = 5;
          locationReason = "Service area boundaries assume local delivery.";
        } else {
          locationFitScore = 0;
          locationReason = "Location explicitly bahar hai.";
        }
      } else {
        // If retailer location wasn't provided, give a neutral soft score so it doesn't fail purely on missing metadata
        locationFitScore = 10;
      }

      match.scoreComponents.locationFit = locationFitScore;

      // Base formula:
      // Product Match percentage weights up to 30.
      // Stock Health weights up to 20.
      // Location weights up to 20.
      
      // Normalizing the product-level aggregations
      const normalizedProductScore = (match.scoreComponents.productMatches / (packProducts.length * 30)) * 40; 
      const normalizedStockScore = (match.scoreComponents.stockHealth / (packProducts.length * 20)) * 20;

      let finalScore = normalizedProductScore + normalizedStockScore + locationFitScore + match.scoreComponents.moqFriction;
      
      // Floor at 0, Ceil at 100
      finalScore = Math.max(0, Math.min(100, Math.round(finalScore)));

      let fulfilmentStatus = 'Partial';
      if (percentFulfilled === 1) fulfilmentStatus = 'Full';

      if (fulfilmentStatus === 'Full') match.reasons.push("Aapke saare pack products yahan available hain.");
      else match.reasons.push(`Aapke ${match.productsFulfilled.length} products available hain.`);
      
      if (locationFitScore >= 10) match.reasons.push(locationReason);

      return {
        ...match,
        fulfilmentStatus,
        matchScore: finalScore
      };
    });

    // 3. Filter and Rank Results
    const validMatches = scoredMatches.filter(m => m.fulfilmentStatus !== 'Not Fulfillable');
    
    // Sort logic
    validMatches.sort((a, b) => {
      // 1. Prefer Full fulfillment over Partial
      if (a.fulfilmentStatus === 'Full' && b.fulfilmentStatus !== 'Full') return -1;
      if (b.fulfilmentStatus === 'Full' && a.fulfilmentStatus !== 'Full') return 1;
      
      // 2. Highest Score
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      
      // 3. Most products fulfilled (for Partials)
      if (b.productsFulfilled.length !== a.productsFulfilled.length) return b.productsFulfilled.length - a.productsFulfilled.length;
      
      // 4. Price suitability (lowest total price for same amount of products)
      return a.totalAmount - b.totalAmount;
    });

    // 4. Construct Final Output Schema
    if (validMatches.length === 0) {
      return {
        retailerId: developerPack.retailerId,
        generatedAt: new Date().toISOString(),
        packId: developerPack.id || 'unknown',
        singleSupplierFulfilment: false,
        bestMatch: null,
        alternatives: [],
        unmatchedProducts: packProducts,
        reasons: ["Koi bhi local distributor is pack ko realistically fulfill nahi kar sakta."]
      };
    }

    const bestMatch = validMatches[0];
    const alternatives = validMatches.slice(1, (options.limit || 5));
    
    // Unmatched globally (items that NO valid alternative can supply either - strictly speaking for the Best Match context)
    const globallyUnmatched = bestMatch.productsUnmatched;

    return {
      retailerId: developerPack.retailerId,
      generatedAt: new Date().toISOString(),
      packId: developerPack.id || 'unknown',
      singleSupplierFulfilment: bestMatch.fulfilmentStatus === 'Full',
      bestMatch: {
        distributorId: bestMatch.distributorId,
        distributorName: bestMatch.distributorName,
        matchScore: bestMatch.matchScore,
        fulfilmentStatus: bestMatch.fulfilmentStatus,
        products: bestMatch.productsFulfilled,
        productsFulfilled: bestMatch.productsFulfilled.length,
        productsUnmatched: bestMatch.productsUnmatched.length,
        totalAmount: bestMatch.totalAmount,
        reasons: bestMatch.reasons
      },
      alternatives: alternatives.map(alt => ({
        distributorId: alt.distributorId,
        distributorName: alt.distributorName,
        matchScore: alt.matchScore,
        fulfilmentStatus: alt.fulfilmentStatus,
        productsFulfilled: alt.productsFulfilled.length,
        productsUnmatched: alt.productsUnmatched.length,
        totalAmount: alt.totalAmount,
        reasons: alt.reasons
      })),
      unmatchedProducts: globallyUnmatched.map(u => ({ name: u.name, category: u.category, reason: u.reason }))
    };
  }
};
