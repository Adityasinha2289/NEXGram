import { useCallback, useMemo, useState } from 'react';
import { intelligenceApi } from '../../../../services/api/intelligenceApi';
import { useApiResource } from '../../../../hooks/useApiResource';

/**
 * The retailer's budget-aware stock plan.
 *
 * The plan is computed on the server. Running it in the browser would mean
 * shipping every nearby shop's unmet needs and budget to the client just to
 * calculate against them, which is a privacy leak dressed up as a feature.
 *
 * Local edits (removing a line, adding one back) stay in component state: the
 * plan is a suggestion the shopkeeper adjusts before ordering, not a record.
 *
 * The fetch used to be written twice - a useCallback for "regenerate" and a
 * separate inlined copy for the first load - and the inlined one neither reset
 * the error nor cleared those local edits, so a regenerate after a failure left
 * a stale error sitting above a fresh plan. Loading it through useApiResource,
 * as every other screen does, makes that one path.
 */
export function useDeveloperPack() {
  const [removedIds, setRemovedIds] = useState([]);
  const [extraItems, setExtraItems] = useState([]);

  const fetcher = useCallback(() => intelligenceApi.getDeveloperPack(), []);

  // A new plan supersedes the edits made against the previous one.
  const onSuccess = useCallback(() => {
    setRemovedIds([]);
    setExtraItems([]);
  }, []);

  const { data: pack, isLoading, error, reload } = useApiResource(fetcher, { onSuccess });

  const packItems = useMemo(() => {
    const suggested = (pack?.items || []).filter((item) => !removedIds.includes(item.id));
    return [...suggested, ...extraItems];
  }, [pack, removedIds, extraItems]);

  const totalEstimatedPrice = useMemo(
    () => packItems.reduce((sum, item) => sum + (item.lineTotal ?? item.price ?? 0), 0),
    [packItems],
  );

  const budget = useMemo(() => pack?.budget || { min: 0, max: null }, [pack]);

  const budgetStatus = useMemo(() => {
    if (budget.max && totalEstimatedPrice > budget.max) return 'Over budget';
    if (budget.min && totalEstimatedPrice < budget.min) return 'Under budget';
    return 'Budget ke andar';
  }, [totalEstimatedPrice, budget.min, budget.max]);

  const removeProduct = (id) => {
    setExtraItems((prev) => prev.filter((item) => item.id !== id));
    setRemovedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const addProduct = (product) => {
    if (removedIds.includes(product.id)) {
      setRemovedIds((prev) => prev.filter((id) => id !== product.id));
      return;
    }
    if (!packItems.find((item) => item.id === product.id)) {
      setExtraItems((prev) => [...prev, product]);
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
    regeneratePack: reload,
  };
}
