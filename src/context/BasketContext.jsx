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
          quantity: Math.min(product.minimumOrderQuantity, product.availableStock),
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
    getDistributorDraft,
  }), [basket, addItem, updateQuantity, removeItem, clearBasket, getDistributorDraft]);

  return (
    <BasketContext.Provider value={value}>
      {children}
    </BasketContext.Provider>
  );
}
