import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PackageOpen, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { List } from '../../../components/ui/List';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { Stat, StatGroup } from '../../../components/ui/Stat';

import { useCatalogue } from './hooks/useCatalogue';
import { ProductRow } from './components/ProductRow';
import { ProductForm } from './components/ProductForm';
import { CatalogueFilters } from './components/CatalogueFilters';

const rupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

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
    removeProduct,
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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <SkeletonList rows={5} />
      </div>
    );
  }

  if (error) return <ErrorState title="Catalogue load nahi hui" description={error} />;

  return (
    <div className="flex animate-fade-in flex-col gap-5">
      <PageHeader
        eyebrow="Stock"
        title="Meri catalogue"
        description="Jo products aap supply karte hain, unka daam aur stock yahaan se manage karein."
        action={
          <Button icon={Plus} onClick={handleOpenAdd}>
            Product add karo
          </Button>
        }
      />

      {allProductsCount === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="Catalogue abhi khaali hai"
          description="Apne products add karke retailers ko dikhana shuru karein. Jo aapke area mein maanga ja raha hai, woh Signals mein dikhta hai."
          actionLabel="Pehla product add karein"
          onAction={handleOpenAdd}
        />
      ) : (
        <>
          <StatGroup>
            <Stat label="Products" value={summary.totalProducts} />
            <Stat label="Categories" value={summary.totalCategories} />
            {/*
             * This is minimum quantity times price — the cheapest first order a
             * retailer can place with you, not an MOQ. It was labelled "Start
             * MOQ" and printed with a rupee sign in front of a pack count.
             */}
            <Stat
              label="Min order"
              value={rupees(summary.lowestMOQ)}
              caption="MOQ × price, sabse sasta"
            />
          </StatGroup>

          <CatalogueFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />

          {products.length === 0 ? (
            <EmptyState
              title="Is naam ka koi product nahi mila"
              description="Search ya category badal kar dekhiye."
              actionLabel="Filter hatayein"
              onAction={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
            />
          ) : (
            <List>
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onEdit={handleOpenEdit}
                  onRemove={removeProduct}
                />
              ))}
            </List>
          )}
        </>
      )}

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
