import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, PackageOpen } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';

import { useDeveloperPack } from './hooks/useDeveloperPack';
import { BusinessContextCard } from './components/BusinessContextCard';
import { PackProductCard } from './components/PackProductCard';
import { PackSummary } from './components/PackSummary';
import { PackProductSelector } from './components/PackProductSelector';

export function DeveloperPack() {
  const navigate = useNavigate();
  const { 
    packItems, 
    totalEstimatedPrice, 
    budget, 
    budgetStatus, 
    removeProduct, 
    addProduct,
    regeneratePack
  } = useDeveloperPack();

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 pb-24 animate-fade-in relative">
      
      {/* 1. PAGE HEADER */}
      <header>
        <h2 className="text-2xl font-bold text-text-primary leading-tight">Your Developer Pack</h2>
        <p className="text-sm text-text-muted mt-1">Aapke business, requirements aur area ke hisaab se suggested products.</p>
        <p className="text-[10px] uppercase font-bold text-primary tracking-wider mt-2">Based on your business profile & current requirements</p>
      </header>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        
        {/* LEFT COLUMN: Context & Products */}
        <div className="w-full md:flex-[3] flex flex-col gap-6">
          
          {/* 2. RETAILER CONTEXT */}
          <BusinessContextCard />

          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-text-primary">Products in Pack</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-text-muted"
                  onClick={() => regeneratePack()}
                >
                  Pack Dobara Banao
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  icon={Plus} 
                  className="text-primary pr-0"
                  onClick={() => setIsSelectorOpen(true)}
                >
                  Add Product
                </Button>
              </div>
            </div>

            {/* 4. PRODUCT LIST */}
            {packItems.length === 0 ? (
              <div className="py-6 border border-dashed border-border rounded-xl">
                <EmptyState 
                  icon={PackageOpen}
                  title="Pack abhi empty hai" 
                  description="Aap products add karke apna pack bana sakte hain." 
                  actionLabel="Products Add Karo"
                  onAction={() => setIsSelectorOpen(true)}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {packItems.map(product => (
                  <PackProductCard 
                    key={product.id} 
                    product={product} 
                    onRemove={removeProduct} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Summary & Primary CTA (Sticky on Desktop) */}
        <div className="w-full md:flex-[2] md:sticky md:top-6 flex flex-col gap-4">
          <PackSummary 
            packItems={packItems}
            totalEstimatedPrice={totalEstimatedPrice}
            budget={budget}
            budgetStatus={budgetStatus}
          />
          
          <Button 
            fullWidth 
            size="lg" 
            icon={ArrowRight} 
            className="shadow-sm mt-2"
            onClick={() => navigate('/retailer/distributors')}
          >
            Nearby Distributors Dekho
          </Button>
          <p className="text-xs text-center text-text-muted -mt-2">Is pack ke products supply karne wale distributors dekhiye.</p>
        </div>

      </div>

      {/* Floating Add CTA for Mobile */}
      {packItems.length > 0 && (
        <div className="fixed bottom-24 right-4 md:hidden z-10">
          <button 
            onClick={() => setIsSelectorOpen(true)}
            className="w-14 h-14 bg-surface text-primary border border-border rounded-full shadow-lg flex items-center justify-center hover:bg-surface-muted transition-colors"
            aria-label="Add Product"
          >
            <Plus size={24} />
          </button>
        </div>
      )}

      {/* 6. ADD PRODUCTS MODAL */}
      {isSelectorOpen && (
        <PackProductSelector 
          currentPackItems={packItems}
          onAdd={(product) => {
            addProduct(product);
            setIsSelectorOpen(false);
          }}
          onCancel={() => setIsSelectorOpen(false)}
        />
      )}

    </div>
  );
}
