import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Loader2 } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { CatalogueProductCard } from './components/CatalogueProductCard';
import { distributorsApi } from '../../../services/api/distributorsApi';
import { ordersApi } from '../../../services/api/ordersApi';

export function Catalogue() {
  const { distributorId } = useParams();
  const navigate = useNavigate();
  
  const [packItems, setPackItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [distributorData, setDistributorData] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrdering, setIsOrdering] = useState(false);
  const [error, setError] = useState(null);
  
  // Load Developer Pack
  useEffect(() => {
    try {
      const savedPack = localStorage.getItem('nexgram_retailer_developer_pack');
      if (savedPack) {
        setPackItems(JSON.parse(savedPack));
      }
    } catch (e) {
      console.error('Failed to parse developer pack', e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const distInfo = await distributorsApi.getDistributor(distributorId);
      setDistributorData(distInfo);
      
      const catResponse = await distributorsApi.getDistributorCatalogue(distributorId, {
        page_size: 100
      });
      
      const mappedProducts = catResponse.items.map(item => ({
        id: item.id,
        name: `${item.product_name} (${item.variant_name})`,
        category: item.category_slug ? item.category_slug.charAt(0).toUpperCase() + item.category_slug.slice(1) : 'Uncategorized',
        unit: 'unit',
        price: item.selling_price,
        minimumOrderQuantity: item.minimum_order_quantity,
        stockStatus: item.stock_status,
        deliveryTime: item.delivery_time || 'N/A'
      }));

      setProducts(mappedProducts);
    } catch (err) {
      console.error("Failed to fetch distributor catalogue:", err);
      setError("Catalogue load karne mein error.");
    } finally {
      setIsLoading(false);
    }
  }, [distributorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddToPack = (product) => {
    const newPack = [...packItems, product];
    setPackItems(newPack);
    localStorage.setItem('nexgram_retailer_developer_pack', JSON.stringify(newPack));
  };

  const handleCreateOrder = async () => {
    try {
      setIsOrdering(true);
      const items = packItems.map(p => ({
        catalogue_item_id: p.id,
        quantity: p.minimumOrderQuantity || 1
      }));

      const payload = {
        distributor_id: distributorId,
        items: items,
        notes: "Order from Developer Pack"
      };

      const res = await ordersApi.createOrder(payload);
      
      // Clear pack
      localStorage.removeItem('nexgram_retailer_developer_pack');
      setPackItems([]);
      
      // Navigate to order
      navigate(`/retailer/orders/${res.id}`);
      
    } catch (err) {
      console.error("Order creation failed", err);
      alert("Order banane mein problem aayi: " + (err.message || "Unknown error"));
    } finally {
      setIsOrdering(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (error || !distributorData) {
    return (
      <div className="py-12">
        <EmptyState 
          title="Catalogue Not Found" 
          description={error || "Is distributor ka catalogue available nahi hai."}
          actionLabel="Go Back"
          onAction={() => navigate(-1)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-24 h-full relative">
      
      {/* Header */}
      <header className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-surface-hover text-text-secondary transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-text-primary leading-tight">{distributorData.business_name} Catalogue</h2>
          <p className="text-sm text-text-muted mt-1">Select items to order</p>
        </div>
      </header>

      {/* Floating Pack Summary */}
      {packItems.length > 0 && (
        <div 
          className="bg-primary text-text-inverse px-4 py-2 rounded-lg shadow-md flex justify-between items-center cursor-pointer hover:bg-primary-dark transition-colors" 
          onClick={handleCreateOrder}
        >
          <span className="text-sm font-medium">Developer Pack: {packItems.length} items</span>
          {isOrdering ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <span className="text-xs font-bold uppercase tracking-wider">Place Order &rarr;</span>
          )}
        </div>
      )}

      {/* Search */}
      <div className="mt-2">
        <Input
          placeholder="Product ya category search karein..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={Search}
        />
      </div>

      {/* Product List */}
      <div className="mt-2">
        {filteredProducts.length === 0 ? (
          <div className="py-10">
            <EmptyState 
              icon={Search}
              title="Koi product nahi mila" 
              description="Apna search badal ke try karein." 
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <CatalogueProductCard 
                key={product.id} 
                product={product}
                isAlreadyInPack={packItems.some(item => item.id === product.id)}
                onAddToPack={handleAddToPack}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
