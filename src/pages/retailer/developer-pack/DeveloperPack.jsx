import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, PackageOpen, Plus, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { List } from '../../../components/ui/List';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Section } from '../../../components/ui/Section';
import { Skeleton, SkeletonList } from '../../../components/ui/Skeleton';

import { useDeveloperPack } from './hooks/useDeveloperPack';
import { BusinessContextCard } from './components/BusinessContextCard';
import { PackProductRow } from './components/PackProductRow';
import { PackSummary } from './components/PackSummary';
import { PackProductSelector } from './components/PackProductSelector';
import { PackOrderAction } from './components/PackOrderAction';

export function DeveloperPack() {
  const navigate = useNavigate();
  const {
    packItems,
    totalEstimatedPrice,
    budget,
    budgetStatus,
    removeProduct,
    addProduct,
    regeneratePack,
    isLoading,
    error,
  } = useDeveloperPack();

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-[60%] max-w-[340px]" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <SkeletonList rows={3} />
      </div>
    );
  }

  if (error) return <ErrorState description={error} onRetry={regeneratePack} />;

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        eyebrow="Developer pack"
        title="Aapke liye suggested stock"
        description="Aapke business profile, budget aur area ki demand se banaya gaya plan. Har product ke neeche uski wajah likhi hai."
      />

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start lg:gap-7">
        <div className="flex min-w-0 flex-col gap-6">
          <Section title="Yeh plan kis par bana hai">
            <BusinessContextCard />
          </Section>

          <Section
            title="Pack ke products"
            action={
              <div className="flex flex-shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => regeneratePack()}>
                  Dobara banao
                </Button>
                <Button variant="outline" size="sm" icon={Plus} onClick={() => setIsSelectorOpen(true)}>
                  Add
                </Button>
              </div>
            }
          >
            {packItems.length === 0 ? (
              <EmptyState
                icon={PackageOpen}
                title="Pack abhi khaali hai"
                description="Aap khud products add karke apna pack bana sakte hain, ya plan dobara generate karein."
                actionLabel="Products add karein"
                onAction={() => setIsSelectorOpen(true)}
              />
            ) : (
              <List>
                {packItems.map((product) => (
                  <PackProductRow key={product.id} product={product} onRemove={removeProduct} />
                ))}
              </List>
            )}
          </Section>
        </div>

        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-[84px]">
          <PackOrderAction packItems={packItems} onOrdered={regeneratePack} />

          <PackSummary
            packItems={packItems}
            totalEstimatedPrice={totalEstimatedPrice}
            budget={budget}
            budgetStatus={budgetStatus}
          />

          <Button
            variant="outline"
            fullWidth
            icon={ArrowRight}
            onClick={() => navigate('/retailer/distributors')}
          >
            Nearby distributors dekho
          </Button>
        </aside>
      </div>

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
