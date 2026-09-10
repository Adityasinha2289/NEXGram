/**
 * DEMAND ENGINE
 * 
 * A deterministic business intelligence service.
 * Synthesizes raw RetailerProfiles into geographical product and category DemandSignals.
 */

const PRODUCT_DICTIONARY = {
  'Dairy': ['paneer', 'milk', 'butter', 'curd', 'ghee'],
  'Staples': ['atta', 'rice', 'dal', 'sugar', 'salt'],
  'Beverages': ['water', 'juice', 'soft drink', 'cold drink'],
  'Snacks': ['biscuits', 'namkeen', 'chips', 'snacks'],
  'Spices': ['masala', 'turmeric', 'chilli', 'cumin'],
  'Household': ['detergent', 'soap', 'cleaner']
};

const SCORING_WEIGHTS = {
  EXPLICIT_UNMET_NEED: 3,
  PRODUCT_REQUIREMENT: 2,
  REQUESTED_CATEGORY: 1
};

export const DemandEngine = {
  
  /**
   * Main analysis function.
   * Processes an array of retailer profiles and returns normalized demand signals.
   * 
   * @param {Array} retailers - Array of RetailerProfile objects.
   * @param {Object} options - Reserved for future configurations.
   * @returns {Object} { categorySignals, productSignals }
   */
  analyze: (retailers = [], options = {}) => {
    if (!Array.isArray(retailers)) return { categorySignals: [], productSignals: [] };

    const categoryMap = new Map(); // Key: 'location|Category'
    const productMap = new Map();  // Key: 'location|Product'

    // Helper to extract location grouping key
    const getLocationKey = (location) => {
      if (!location) return 'unknown';
      const area = location.area?.trim();
      const district = location.district?.trim();
      
      if (area && district) return `${area}, ${district}`;
      if (area) return area;
      if (district) return district;
      return 'unknown';
    };

    // Helper to mutate map
    const addSignal = (map, locationKey, itemType, itemName, retailerId, weight, source, parentCategory = null) => {
      const key = `${locationKey}|${itemName}`;
      
      if (!map.has(key)) {
        map.set(key, {
          locationKey,
          type: itemType, // 'category' or 'product'
          name: itemName,
          category: parentCategory || (itemType === 'category' ? itemName : undefined),
          retailerSet: new Set(),
          signalStrength: 0,
          sourceBreakdown: {
            requestedCategory: 0,
            unmetNeed: 0,
            requirementMention: 0
          }
        });
      }

      const entry = map.get(key);
      
      // Accumulate total signal strength from all mentions
      entry.signalStrength += weight;
      entry.sourceBreakdown[source] += 1;
      
      // Deduplication: Add to set (ensures 1 retailer counts as exactly 1 "retailerCount")
      if (retailerId) {
        entry.retailerSet.add(retailerId);
      }
    };

    // Process each retailer
    retailers.forEach(retailer => {
      // Tolerate missing or malformed data
      const id = retailer.id;
      const locationKey = getLocationKey(retailer.location);
      const demandedCats = Array.isArray(retailer.demandedCategories) ? retailer.demandedCategories : [];
      
      // Handle unmetNeeds format safely
      let unmetCategories = [];
      let unmetOther = '';
      if (typeof retailer.unmetNeeds === 'object' && retailer.unmetNeeds !== null) {
        unmetCategories = Array.isArray(retailer.unmetNeeds.categories) ? retailer.unmetNeeds.categories : [];
        unmetOther = retailer.unmetNeeds.other || '';
      } else if (typeof retailer.unmetNeeds === 'string') {
        unmetOther = retailer.unmetNeeds;
      }
      
      const requirementsText = (retailer.requirements || '').toLowerCase();
      const unmetOtherText = unmetOther.toLowerCase();

      // 1. Process Demanded Categories (Weight 1)
      demandedCats.forEach(cat => {
        addSignal(categoryMap, locationKey, 'category', cat, id, SCORING_WEIGHTS.REQUESTED_CATEGORY, 'requestedCategory');
      });

      // 2. Process Unmet Need Categories (Weight 3)
      unmetCategories.forEach(cat => {
        addSignal(categoryMap, locationKey, 'category', cat, id, SCORING_WEIGHTS.EXPLICIT_UNMET_NEED, 'unmetNeed');
      });

      // 3. Extract Explicit Products from Text Requirements & Unmet 'Other' (Weight 2 for requirements, 3 for unmet)
      Object.entries(PRODUCT_DICTIONARY).forEach(([category, keywords]) => {
        keywords.forEach(keyword => {
          // Check in requirements
          if (requirementsText.includes(keyword)) {
            // Capitalize product keyword
            const productName = keyword.charAt(0).toUpperCase() + keyword.slice(1);
            addSignal(productMap, locationKey, 'product', productName, id, SCORING_WEIGHTS.PRODUCT_REQUIREMENT, 'requirementMention', category);
            // Implicitly add to category
            addSignal(categoryMap, locationKey, 'category', category, id, SCORING_WEIGHTS.PRODUCT_REQUIREMENT, 'requirementMention');
          }
          // Check in unmet needs text
          if (unmetOtherText.includes(keyword)) {
            const productName = keyword.charAt(0).toUpperCase() + keyword.slice(1);
            addSignal(productMap, locationKey, 'product', productName, id, SCORING_WEIGHTS.EXPLICIT_UNMET_NEED, 'unmetNeed', category);
            addSignal(categoryMap, locationKey, 'category', category, id, SCORING_WEIGHTS.EXPLICIT_UNMET_NEED, 'unmetNeed');
          }
        });
      });
    });

    // Helper to determine demand level based on thresholds
    const getDemandLevel = (signalStrength, retailerCount) => {
      if (signalStrength >= 10 || retailerCount >= 5) return 'High';
      if (signalStrength >= 4 || retailerCount >= 2) return 'Medium';
      return 'Low';
    };

    // Helper to finalize mapped signals
    const finalizeSignals = (map) => {
      return Array.from(map.values()).map(entry => {
        const retailerCount = entry.retailerSet.size;
        
        let area = '';
        let district = '';
        
        if (entry.locationKey !== 'unknown') {
          const parts = entry.locationKey.split(', ');
          if (parts.length === 2) {
            area = parts[0];
            district = parts[1];
          } else {
            // In a real app we'd need better tracking of what the single string is
            district = parts[0]; 
          }
        }

        return {
          id: `demand_${entry.name.toLowerCase().replace(/ /g, '_')}_${entry.locationKey.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          area: area || entry.locationKey,
          district: district,
          [entry.type]: entry.name,
          category: entry.category,
          retailerCount,
          demandLevel: getDemandLevel(entry.signalStrength, retailerCount),
          signalStrength: entry.signalStrength,
          sourceBreakdown: entry.sourceBreakdown
        };
      }).sort((a, b) => b.signalStrength - a.signalStrength); // Highest demand first
    };

    return {
      categorySignals: finalizeSignals(categoryMap),
      productSignals: finalizeSignals(productMap)
    };
  }
};
