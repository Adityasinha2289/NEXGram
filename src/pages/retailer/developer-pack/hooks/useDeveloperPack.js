import { useState, useEffect, useMemo } from 'react';
import { DEVELOPER_PACK_MOCK } from '../../../../data/retailerMock';
import { DemandEngine } from '../../../../features/intelligence/services/DemandEngine';
import { SupplyGapEngine } from '../../../../features/intelligence/services/SupplyGapEngine';
import { DeveloperPackEngine } from '../../../../features/intelligence/services/DeveloperPackEngine';
import { DEMAND_TEST_MOCK } from '../../../../data/demandTestMock';
import { SUPPLY_GAP_CATALOGUES_MOCK } from '../../../../data/supplyGapTestMock';

export function useDeveloperPack() {
  const [packItems, setPackItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [budget, setBudget] = useState(DEVELOPER_PACK_MOCK.budget);

  // Expose an explicit regenerate function
  const regeneratePack = () => {
    try {
      const savedProfile = localStorage.getItem('nexgram_retailer_onboarding');
      let profile = {};
      if (savedProfile) {
        profile = JSON.parse(savedProfile);
      }

      // Chain the deterministic intelligence pipeline
      const demandSignals = DemandEngine.analyze(DEMAND_TEST_MOCK);
      const gapSignals = SupplyGapEngine.analyze(demandSignals, SUPPLY_GAP_CATALOGUES_MOCK);
      const generatedData = DeveloperPackEngine.generate(
        profile,
        demandSignals.productSignals,
        demandSignals.categorySignals,
        gapSignals.productGaps,
        SUPPLY_GAP_CATALOGUES_MOCK,
        { limit: 5 }
      );

      if (generatedData && generatedData.products && generatedData.products.length > 0) {
        setPackItems(generatedData.products);
        setBudget({ min: generatedData.summary.budgetMin || 0, max: generatedData.summary.budgetMax || Infinity });
        localStorage.setItem('nexgram_retailer_developer_pack', JSON.stringify(generatedData.products));
        return true;
      } else {
        console.warn("Developer Pack Engine returned empty. Falling back to mock.");
        setPackItems(DEVELOPER_PACK_MOCK.initialProducts);
        setBudget(DEVELOPER_PACK_MOCK.budget);
        return false;
      }
    } catch (e) {
      console.error("Failed to run Developer Pack Engine", e);
      setPackItems(DEVELOPER_PACK_MOCK.initialProducts);
      setBudget(DEVELOPER_PACK_MOCK.budget);
      return false;
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexgram_retailer_developer_pack');
      if (saved) {
        setPackItems(JSON.parse(saved));
      } else {
        // Run engine on first load if no saved pack
        regeneratePack();
      }
    } catch (e) {
      console.error("Failed to load developer pack", e);
      setPackItems(DEVELOPER_PACK_MOCK.initialProducts);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('nexgram_retailer_developer_pack', JSON.stringify(packItems));
    }
  }, [packItems, isLoaded]);

  const totalEstimatedPrice = useMemo(() => {
    return packItems.reduce((total, item) => total + item.price, 0);
  }, [packItems]);

  const budgetStatus = useMemo(() => {
    if (totalEstimatedPrice > DEVELOPER_PACK_MOCK.budget.max) return 'Over budget';
    if (totalEstimatedPrice < DEVELOPER_PACK_MOCK.budget.min) return 'Under budget';
    return 'Budget ke andar';
  }, [totalEstimatedPrice]);

  const removeProduct = (id) => {
    setPackItems(prev => prev.filter(item => item.id !== id));
  };

  const addProduct = (product) => {
    if (!packItems.find(p => p.id === product.id)) {
      setPackItems(prev => [...prev, product]);
    }
  };

  return {
    packItems,
    totalEstimatedPrice,
    budgetStatus,
    budget: DEVELOPER_PACK_MOCK.budget,
    removeProduct,
    addProduct,
    regeneratePack
  };
}
