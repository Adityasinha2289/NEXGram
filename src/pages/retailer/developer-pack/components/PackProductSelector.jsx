import { X, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '../../../../components/ui/Input';
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner';
import { intelligenceApi } from '../../../../services/api/intelligenceApi';

export function PackProductSelector({ onAdd, onCancel, currentPackItems }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Only what a supplier near this shop can actually deliver.
  useEffect(() => {
    let cancelled = false;
    intelligenceApi.getDeveloperPackOptions()
      .then(items => { if (!cancelled) setOptions(items); })
      .catch(() => { if (!cancelled) setOptions([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const currentIds = currentPackItems.map(item => item.id);
  const addableProducts = options.filter(p => !currentIds.includes(p.id));
  
  // Apply search filter
  const filteredProducts = addableProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center animate-fade-in pointer-events-none">
      <div 
        className="absolute inset-0 bg-black/40 pointer-events-auto" 
        onClick={onCancel}
      />
      
      <div className="bg-surface w-full max-w-md h-[80vh] sm:h-[600px] rounded-t-2xl sm:rounded-2xl flex flex-col pointer-events-auto shadow-lg relative z-10 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface flex-shrink-0">
          <h2 className="font-bold text-lg text-text-primary">Products Add Karein</h2>
          <button onClick={onCancel} className="p-2 text-text-muted hover:bg-surface-muted rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border/50 bg-surface flex-shrink-0">
          <Input 
            icon={Search}
            placeholder="Search products ya categories..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {isLoading ? (
            <LoadingSpinner />
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              {addableProducts.length === 0 
                ? "Saare available products pack mein hain!" 
                : "Koi result nahi mila."}
            </div>
          ) : (
            filteredProducts.map(product => (
              <div key={product.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface">
                <div className="flex-1 mr-3">
                  <p className="eyebrow">{product.category}</p>
                  <p className="font-bold text-sm text-text-primary">{product.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {product.variant} &middot; ₹{product.price}/pack &middot; MOQ {product.minimumOrderQuantity} &middot; {product.distributorName}
                  </p>
                </div>
                <button 
                  onClick={() => onAdd(product)}
                  className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 hover:bg-primary hover:text-text-inverse transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
