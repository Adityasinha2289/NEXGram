import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { DISTRIBUTOR_CATALOGUES_MOCK } from '../../../data/distributorDiscoveryMock';
import { CatalogueProductCard } from './components/CatalogueProductCard';

export function Catalogue() {
  const { distributorId } = useParams();
  const navigate = useNavigate();
  const [packItems, setPackItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
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

  const catalogueData = DISTRIBUTOR_CATALOGUES_MOCK[distributorId];

  if (!catalogueData) {
    return (
      <div className="py-12">
        <EmptyState 
          title="Catalogue Not Found" 
          description="Is distributor ka catalogue available nahi hai." 
          actionLabel="Go Back"
          onAction={() => navigate(-1)}
        />
      </div>
    );
  }

  const handleAddToPack = (product) => {
    const newPack = [...packItems, product];
    setPackItems(newPack);
    localStorage.setItem('nexgram_retailer_developer_pack', JSON.stringify(newPack));
    // Provide lightweight feedback (could use a toast system here if available, but for now state updates the UI)
  };

  const filteredProducts = catalogueData.products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5 pb-6 animate-fade-in relative">
      
      {/* Header */}
      <header className="flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-surface-muted text-text-muted transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-text-primary leading-tight">{catalogueData.distributorName}</h2>
          <p className="text-sm text-text-muted mt-0.5">Products jo yeh distributor supply karta hai.</p>
        </div>
      </header>

      {/* Floating Pack Summary */}
      {packItems.length > 0 && (
        <div className="bg-primary text-text-inverse px-4 py-2 rounded-lg shadow-md flex justify-between items-center cursor-pointer hover:bg-primary-dark transition-colors" onClick={() => navigate('/retailer/developer-pack')}>
          <span className="text-sm font-medium">Developer Pack: {packItems.length} items</span>
          <span className="text-xs font-bold uppercase tracking-wider">Pack Dekho &rarr;</span>
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
