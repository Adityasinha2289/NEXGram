import { useCallback, useEffect, useMemo, useState } from 'react';
import { intelligenceApi } from '../../../../services/api/intelligenceApi';

/**
 * The retailer's budget-aware stock plan.
 *
 * The plan is computed on the server. Running it in the browser would mean
 * shipping every nearby shop's unmet needs and budget to the client just to
 * calculate against them, which is a privacy leak dressed up as a feature.
 *
 * Local edits (removing a line, adding one back) stay in component state: the
 * plan is a suggestion the shopkeeper adjusts before ordering, not a record.
 */
export function useDeveloperPack() {
  const [pack, setPack] = useState(null);
  const [removedIds, setRemovedIds] = useState([]);
  const [extraItems, setExtraItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setPack(await intelligenceApi.getDeveloperPack());
      setRemovedIds([]);
      setExtraItems([]);
    } catch (err) {
      setError(err.message || 'Pack load nahi hua');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const packItems = useMemo(() => {
    const suggested = (pack?.items || []).filter(item => !removedIds.includes(item.id));
    return [...suggested, ...extraItems];
  }, [pack, removedIds, extraItems]);

  const totalEstimatedPrice = useMemo(
    () => packItems.reduce((sum, item) => sum + (item.lineTotal ?? item.price ?? 0), 0),
    [packItems],
  );

  const budget = pack?.budget || { min: 0, max: null };

  const budgetStatus = useMemo(() => {
    if (budget.max && totalEstimatedPrice > budget.max) return 'Over budget';
    if (budget.min && totalEstimatedPrice < budget.min) return 'Under budget';
    return 'Budget ke andar';
  }, [totalEstimatedPrice, budget]);

  const removeProduct = (id) => {
    setExtraItems(prev => prev.filter(item => item.id !== id));
    setRemovedIds(prev => (prev.includes(id) ? prev : [...prev, id]));
  };

  const addProduct = (product) => {
    if (removedIds.includes(product.id)) {
      setRemovedIds(prev => prev.filter(id => id !== product.id));
      return;
    }
    if (!packItems.find(item => item.id === product.id)) {
      setExtraItems(prev => [...prev, product]);
    }
  };

  return {
    packItems,
    totalEstimatedPrice,
    budgetStatus,
    budget,
    skipped: pack?.skipped || [],
    distributorMatches: pack?.distributorMatches || [],
    isLoading,
    error,
    removeProduct,
    addProduct,
    regeneratePack: load,
  };
}
