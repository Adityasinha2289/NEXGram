import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
    isLoading,
    error,
    addProduct,
    updateProduct,
    removeProduct
  } = useCatalogue();

  const location = useLocation();
  const consumedPrefill = useRef(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [prefill, setPrefill] = useState(null);

  // Arriving from an opportunity: open the form already pointed at the product
  // the distributor was just told about, with the suggested opening stock.
  useEffect(() => {
    const incoming = location.state?.prefill;
    if (!incoming || consumedPrefill.current) return;
    consumedPrefill.current = true;
    setPrefill(incoming);
    setEditingProduct(null);
    setIsFormOpen(true);
    // Drop it from history directly rather than via navigate(): a router
    // navigation here re-runs this effect and closes the form we just opened.
    window.history.replaceState({ ...window.history.state, usr: null }, '');
  }, [location.state]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setPrefill(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
    setPrefill(null);
  };

  // Let the form surface its own failure: closing on a rejected save would
  // discard the user's input and quietly pretend it worked.
  const handleSubmitForm = async (formData) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, formData);
    } else {
      await addProduct(formData);
    }
    handleCloseForm();
  };

  const handleRemove = async (id) => {
    if (!window.confirm("Is product ko catalogue se remove karna hai?")) return;
    try {
      await removeProduct(id);
    } catch (err) {
      console.error('Failed to remove catalogue item:', err);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (error) {
    return <div className="p-12"><EmptyState title="Error Loading Catalogue" description={error} /></div>;
  }

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

      {/* Modal Form */}
      {isFormOpen && (
        <ProductForm 
          prefill={prefill}
          initialData={editingProduct} 
          onSubmit={handleSubmitForm} 
          onCancel={handleCloseForm} 
        />
      )}
    </div>
  );
}
