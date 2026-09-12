import { useState, useEffect, useCallback, useMemo } from 'react';
import { distributorsApi } from '../../../../services/api/distributorsApi';
import { intelligenceApi } from '../../../../services/api/intelligenceApi';
import { useAuth } from '../../../../context/AuthContext';

export function useCatalogue() {
  const { currentUser } = useAuth();
  const distributorId = currentUser?.profile_id;
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchCatalogue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // In a real app we would pass pagination params, but for now we fetch a page
      const response = await distributorsApi.getDistributorCatalogue(distributorId, {
        search: searchQuery || undefined,
        // Category filtering might need backend support if we want to filter by category ID, 
        // but for now we'll fetch and filter if selectedCategory is set and backend doesn't support it directly,
        // or just rely on search. The API doesn't have category filter for catalogue yet.
        page_size: 100
      });
      
      // If we have a selected category, filter client side for now since backend API doesn't support category_id filtering yet.
      // Alternatively we can add category_id to the API. Let's filter client side for simplicity in this phase.
      let fetchedItems = response.items;
      if (selectedCategory !== 'All') {
        fetchedItems = fetchedItems.filter(item => item.category_slug === selectedCategory.toLowerCase());
      }
      
      // Map API schema to UI expectations
      const mappedProducts = fetchedItems.map(item => ({
        id: item.id,
        name: `${item.product_name} (${item.variant_name})`,
        category: item.category_slug ? item.category_slug.charAt(0).toUpperCase() + item.category_slug.slice(1) : 'Uncategorized',
        unit: 'unit', // backend doesn't return unit directly in the flattened schema, we could join it, but mocking for now
        price: item.selling_price,
        minimumOrderQuantity: item.minimum_order_quantity,
        availableStock: item.available_stock,
        stockStatus: item.stock_status,
        deliveryTime: item.delivery_time || 'N/A'
      }));

      setProducts(mappedProducts);
      setTotalCount(response.total);
    } catch (err) {
      console.error("Failed to fetch catalogue:", err);
      setError(err.message || 'Failed to load catalogue');
    } finally {
      setIsLoading(false);
    }
  }, [distributorId, searchQuery, selectedCategory]);

  useEffect(() => {
    fetchCatalogue();
  }, [fetchCatalogue]);

  // Derived state
  const categories = useMemo(() => {
    // Ideally categories come from the backend, but we derive from current fetched for now to match UI behavior
    const cats = new Set(products.map(p => p.category));
    return ['All', ...Array.from(cats)].sort();
  }, [products]);

  const summary = useMemo(() => {
    return {
      totalProducts: totalCount,
      totalCategories: new Set(products.map(p => p.category)).size,
      lowestMOQ: products.length > 0 ? Math.min(...products.map(p => p.minimumOrderQuantity * p.price)) : 0
    };
  }, [products, totalCount]);

  /**
   * Stock changes move the local supply picture, which re-scores every gap in
   * this distributor's area - including the one that prompted the change. The
   * refresh is best-effort: the catalogue write has already committed, and the
   * pipeline is idempotent, so a failure here only delays the recompute.
   */
  const refreshIntelligence = async () => {
    try {
      await intelligenceApi.refresh();
    } catch (err) {
      console.warn('Intelligence refresh failed; scores update on the next run.', err);
    }
  };

  const addProduct = async (product) => {
    await distributorsApi.addCatalogueItem(product);
    await fetchCatalogue();
    await refreshIntelligence();
  };

  const updateProduct = async (id, updatedFields) => {
    await distributorsApi.updateCatalogueItem(id, updatedFields);
    await fetchCatalogue();
    await refreshIntelligence();
  };

  const removeProduct = async (id) => {
    await distributorsApi.removeCatalogueItem(id);
    await fetchCatalogue();
    await refreshIntelligence();
  };

  return {
    products,
    allProductsCount: totalCount,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    summary,
    isLoading,
    error,
    addProduct,
    updateProduct,
    removeProduct
  };
}
