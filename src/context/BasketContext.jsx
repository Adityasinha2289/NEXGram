import { useState, useEffect, useMemo, useCallback } from 'react';
import { BasketContext } from './BasketContextCore';

const STORAGE_KEY = 'nexgram_retailer_basket';

export function BasketProvider({ children }) {
  const [basket, setBasket] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.warn('Failed to parse basket from localStorage', err);
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(basket));
  }, [basket]);

  const addItem = useCallback((product, distributorId, distributorName) => {
    setBasket((prev) => {
      const next = { ...prev };
      if (!next[distributorId]) {
        next[distributorId] = { distributorName, items: {} };
      }
      
      const currentItems = { ...next[distributorId].items };
      
      if (!currentItems[product.id]) {
        currentItems[product.id] = {
          product,
          // The MOQ is a floor the server enforces, so it is never rounded down
          // to match stock: Math.min() here produced lines the API rejected with
          // "below MOQ", and NaN whenever a caller had no stock figure to pass.
          quantity: Math.max(1, Number(product.minimumOrderQuantity) || 1),
        };
      }
      
      next[distributorId] = {
        ...next[distributorId],
        items: currentItems,
      };
      
      return next;
    });
  }, []);

  const updateQuantity = useCallback((productId, quantity, distributorId) => {
    setBasket((prev) => {
      if (!prev[distributorId] || !prev[distributorId].items[productId]) return prev;
      
      const next = { ...prev };
      const currentItems = { ...next[distributorId].items };
      
      currentItems[productId] = {
        ...currentItems[productId],
        quantity,
      };
      
      next[distributorId] = {
        ...next[distributorId],
        items: currentItems,
      };
      
      return next;
    });
  }, []);

  const removeItem = useCallback((productId, distributorId) => {
    setBasket((prev) => {
      if (!prev[distributorId] || !prev[distributorId].items[productId]) return prev;
      
      const next = { ...prev };
      const currentItems = { ...next[distributorId].items };
      
      delete currentItems[productId];
      
      if (Object.keys(currentItems).length === 0) {
        delete next[distributorId];
      } else {
        next[distributorId] = {
          ...next[distributorId],
          items: currentItems,
        };
      }
      
      return next;
    });
  }, []);

  const clearBasket = useCallback((distributorId = null) => {
    if (distributorId) {
      setBasket((prev) => {
        const next = { ...prev };
        delete next[distributorId];
        return next;
      });
    } else {
      setBasket({});
    }
  }, []);

  /**
   * How many of one product are already in this supplier's basket.
   *
   * Reads (distributorId, productId) in that order: the basket is keyed by
   * supplier first because an order is per-supplier on the server.
   */
  const getQuantity = useCallback((distributorId, productId) => (
    basket[distributorId]?.items?.[productId]?.quantity || 0
  ), [basket]);

  const getDistributorDraft = useCallback((distributorId) => {
    if (!basket[distributorId]) return {};
    const draft = {};
    Object.values(basket[distributorId].items).forEach(item => {
      draft[item.product.id] = item.quantity;
    });
    return draft;
  }, [basket]);

  const value = useMemo(() => ({
    basket,
    addItem,
    updateQuantity,
    removeItem,
    clearBasket,
    getQuantity,
    getDistributorDraft,
  }), [basket, addItem, updateQuantity, removeItem, clearBasket, getQuantity, getDistributorDraft]);

  return (
    <BasketContext.Provider value={value}>
      {children}
    </BasketContext.Provider>
  );
}
