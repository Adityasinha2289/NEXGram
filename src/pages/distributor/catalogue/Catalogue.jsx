import { useState } from 'react';
import { PackageOpen, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';

import { useCatalogue } from './hooks/useCatalogue';
import { ProductCard } from './components/ProductCard';
import { ProductForm } from './components/ProductForm';
import { CatalogueFilters } from './components/CatalogueFilters';

export function Catalogue() {
  const {
    products,
    allProductsCount,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    summary,
    addProduct,
    updateProduct,
    removeProduct
  } = useCatalogue();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleSubmitForm = (formData) => {
    if (editingProduct) {
      updateProduct(editingProduct.id, formData);
    } else {
      addProduct(formData);
    }
    handleCloseForm();
  };

  const handleRemove = (id) => {
    const confirmDelete = window.confirm("Is product ko catalogue se remove karna hai?");
    if (confirmDelete) {
      removeProduct(id);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-24 h-full relative">
      
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Meri Catalogue</h2>
          <p className="text-sm text-text-muted mt-1">Jo products aap supply karte ho unhe yahan manage karein.</p>
        </div>
        <Button onClick={handleOpenAdd} size="sm" icon={Plus} className="flex-shrink-0 hidden sm:flex">
          Product Add Karo
        </Button>
      </header>

      {/* Summary */}
      {allProductsCount > 0 && (
        <div className="flex items-center gap-4 py-2 border-y border-border">
          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-primary">{summary.totalProducts}</p>
            <p className="text-xs text-text-muted">Products</p>
          </div>
          <div className="w-px h-8 bg-border"></div>
          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-text-primary">{summary.totalCategories}</p>
            <p className="text-xs text-text-muted">Categories</p>
          </div>
          <div className="w-px h-8 bg-border"></div>
          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-text-primary">₹{summary.lowestMOQ}</p>
            <p className="text-xs text-text-muted">Start MOQ</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {allProductsCount === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState 
            icon={PackageOpen}
            title="Abhi catalogue empty hai" 
            description="Apne products add karke retailers ko dikhana shuru karein." 
            actionLabel="+ Product Add Karo"
            onAction={handleOpenAdd}
          />
        </div>
      ) : (
        <>
          {/* Filters */}
          <CatalogueFilters 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />

          {/* List */}
          {products.length === 0 ? (
            <div className="mt-8">
              <EmptyState 
                title="Is naam ka koi product nahi mila." 
                actionLabel="Search Clear Karo"
                onAction={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onEdit={handleOpenEdit}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Floating Action Button for Mobile Add */}
      {allProductsCount > 0 && (
        <div className="fixed bottom-24 right-4 sm:hidden z-10">
          <button 
            onClick={handleOpenAdd}
            className="w-14 h-14 bg-primary text-text-inverse rounded-full shadow-lg flex items-center justify-center hover:bg-primary-dark transition-colors"
            aria-label="Add Product"
          >
            <Plus size={24} />
          </button>
        </div>
      )}

      {/* Modal Form */}
      {isFormOpen && (
        <ProductForm 
          initialData={editingProduct} 
          onSubmit={handleSubmitForm} 
          onCancel={handleCloseForm} 
        />
      )}
    </div>
  );
}
