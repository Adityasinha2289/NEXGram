import { useCallback, useMemo, useState } from 'react';
import { distributorsApi } from '../../../../services/api/distributorsApi';
import { intelligenceApi } from '../../../../services/api/intelligenceApi';
import { useApiResource } from '../../../../hooks/useApiResource';
import { useAuth } from '../../../../context/useAuth';

const titleCase = (slug) => (slug
  ? slug.charAt(0).toUpperCase() + slug.slice(1)
  : 'Uncategorized');

/** The API speaks snake_case; every row in this screen wants camelCase. */
const toRow = (item) => ({
  id: item.id,
  name: `${item.product_name} (${item.variant_name})`,
  category: titleCase(item.category_slug),
  unit: 'unit',
  price: item.selling_price,
  minimumOrderQuantity: item.minimum_order_quantity,
  availableStock: item.available_stock,
  stockStatus: item.stock_status,
  deliveryTime: item.delivery_time || 'N/A',
});

/**
 * The signed-in distributor's own catalogue.
 *
 * The fetch used to be written twice — once in a useCallback for post-write
 * reloads and once inlined in an effect for search — and the two had already
 * diverged: the effect never raised the loading flag, so re-searching left the
 * previous rows on screen with nothing to say a request was in flight. Loading,
 * error and stale-response handling now come from useApiResource, the same hook
 * every other screen in the app loads through.
 */
export function useCatalogue() {
  const { currentUser } = useAuth();
  const distributorId = currentUser?.profile_id;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetcher = useCallback(
    () => distributorsApi.getDistributorCatalogue(distributorId, {
      search: searchQuery || undefined,
      page_size: 100,
    }),
    [distributorId, searchQuery],
  );

  // Disabled until the profile resolves: requesting /distributors/undefined
  // 404s, and the screen would report "catalogue load nahi hui" for a race.
  const { data, isLoading, error, reload } = useApiResource(fetcher, {
    enabled: Boolean(distributorId),
    initialData: { items: [], total: 0 },
  });

  const allItems = useMemo(() => (data?.items || []).map(toRow), [data]);

  // Category is filtered client-side because the endpoint has no category
  // parameter and the page already holds the whole catalogue.
  const products = useMemo(() => (
    selectedCategory === 'All'
      ? allItems
      : allItems.filter((item) => item.category === selectedCategory)
  ), [allItems, selectedCategory]);

  const categories = useMemo(
    () => ['All', ...new Set(allItems.map((p) => p.category))].sort(),
    [allItems],
  );

  const summary = useMemo(() => ({
    // Counts what is on screen: using the server's unfiltered total made this
    // stat disagree with the rows underneath it as soon as a filter ran.
    totalProducts: products.length,
    totalCategories: new Set(products.map((p) => p.category)).size,
    lowestMOQ: products.length > 0
      ? Math.min(...products.map((p) => p.minimumOrderQuantity * p.price))
      : 0,
  }), [products]);

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
    await reload();
    await refreshIntelligence();
  };

  const updateProduct = async (id, updatedFields) => {
    await distributorsApi.updateCatalogueItem(id, updatedFields);
    await reload();
    await refreshIntelligence();
  };

  const removeProduct = async (id) => {
    await distributorsApi.removeCatalogueItem(id);
    await reload();
    await refreshIntelligence();
  };

  return {
    products,
    allProductsCount: data?.total ?? 0,
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
    removeProduct,
  };
}
