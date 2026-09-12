import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Package, Store, TrendingUp, Users } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Meta, PageHeader } from '../../../components/ui/PageHeader';
import { ScoreRing } from '../../../components/ui/ScoreRing';
import { Section } from '../../../components/ui/Section';
import { Skeleton, SkeletonText } from '../../../components/ui/Skeleton';
import { Stat, StatGroup } from '../../../components/ui/Stat';
import { fetchApi } from '../../../services/api/client';
import { useApiResource } from '../../../hooks/useApiResource';

// Mirrors DEMAND_WEIGHT in the scoring engine, so the demand component reads as
// a fraction of its maximum rather than as a bare number.
const DEMAND_WEIGHT = 45;

export function OpportunityDetail() {
  const { opportunityId } = useParams();
  const navigate = useNavigate();

  const fetcher = useCallback(
    () => fetchApi(`/intelligence/opportunities/${opportunityId}`),
    [opportunityId],
  );
  const { data: opportunity, isLoading, error, reload } = useApiResource(fetcher);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-2/3 max-w-[360px]" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <SkeletonText lines={4} />
      </div>
    );
  }

  if (error) return <ErrorState description={error} onRetry={reload} />;

  if (!opportunity) {
    return (
      <EmptyState
        title="Opportunity nahi mili"
        description="Yeh data available nahi hai. Ho sakta hai gap band ho gaya ho."
        actionLabel="Wapas jayein"
        onAction={() => navigate(-1)}
      />
    );
  }

  const breakdown = opportunity.evidence?.breakdown || [];
  const canAdd = Boolean(opportunity.defaultVariantId);

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        eyebrow={opportunity.category !== opportunity.name ? opportunity.category : undefined}
        title={opportunity.name}
        meta={opportunity.area && <Meta icon={MapPin}>{opportunity.area}</Meta>}
      />

      {/* The headline claim, with its confidence attached. A score is never
          shown on its own. */}
      <Card elevated className="flex-row items-start gap-5 p-5">
        <ScoreRing
          score={opportunity.score}
          tier={opportunity.tier}
          confidence={opportunity.confidence}
          size="lg"
          showLabel={false}
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold leading-none text-text-primary">
              {opportunity.tier} opportunity
            </h3>
            <Badge variant={opportunity.tierVariant} dot>
              {Math.round(opportunity.score)}/100
            </Badge>
          </div>
          <p className="num mt-2 text-2xs text-text-muted">
            <span className="font-semibold text-text-secondary">
              {opportunity.confidence} confidence
            </span>
            {' · '}
            {opportunity.retailerCount} retailer signal
            {opportunity.retailerCount === 1 ? '' : 's'}
          </p>
          <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-text-secondary">
            {opportunity.evidence?.summary || 'Local demand ke basis par detect hua gap.'}
          </p>
        </div>
      </Card>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start lg:gap-7">
        {/* The product's core promise: no number without the arithmetic. */}
        {breakdown.length > 0 && (
          <Section
            title="Yeh score kaise bana"
            description="Har component apne maximum ke saath, aur uske peechhe ka data."
          >
            <div className="panel divide-y divide-border">
              {breakdown.map((part) => (
                <div key={part.label} className="flex flex-col gap-1.5 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-text-primary">{part.label}</span>
                    <span className="num flex-shrink-0 text-text-muted">
                      {Math.round(part.points)} / {Math.round(part.max)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, (part.points / part.max) * 100)}%` }}
                    />
                  </div>
                  <p className="text-2xs leading-snug text-text-muted">{part.detail}</p>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-3 bg-surface-muted px-4 py-3">
                <span className="text-sm font-semibold text-text-primary">Total</span>
                <span className="num text-sm font-bold text-primary">
                  {Math.round(opportunity.score)} / 100
                </span>
              </div>
            </div>
          </Section>
        )}

        <Section title="Market">
          <StatGroup>
            <Stat
              label="Demand"
              icon={TrendingUp}
              value={Math.round(opportunity.components?.demand ?? 0)}
              caption={`${DEMAND_WEIGHT} mein se`}
            />
            <Stat
              label="Retailers"
              icon={Users}
              value={opportunity.retailerCount}
              caption="Maang rahe hain"
            />
            <Stat
              label="Aaj supply"
              icon={Package}
              value={`${opportunity.availableSupplierCount}/${opportunity.supplierCount}`}
              caption="Listings jo fulfil kar sakti hain"
              tone={opportunity.availableSupplierCount === 0 ? 'positive' : 'default'}
            />
          </StatGroup>

          {/* A sentence, not a figure — so it is set as one rather than being
              forced into a slot built for a number. */}
          {opportunity.evidence?.competition && (
            <p className="flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2.5 text-sm leading-snug text-text-secondary">
              <Store size={15} className="mt-0.5 flex-shrink-0 text-text-muted" strokeWidth={2} />
              {opportunity.evidence.competition}
            </p>
          )}
        </Section>
      </div>

      {/*
       * Sticky rather than fixed. Fixed meant a hard-coded 1024px width and a
       * hard-coded offset for the phone's bottom bar, neither of which survived
       * the sidebar layout; sticky inherits the page column for free.
       */}
      <div className="sticky bottom-[calc(var(--bottom-nav-height)+12px)] z-10 md:bottom-4">
        <div className="panel flex gap-3 p-3 shadow-lg">
          <Button
            fullWidth
            icon={Package}
            disabled={!canAdd}
            onClick={() => navigate('/distributor/catalogue', {
              state: {
                prefill: {
                  variantId: opportunity.defaultVariantId,
                  label: `${opportunity.name} ${opportunity.defaultVariantName || ''}`.trim(),
                  category: opportunity.category,
                  availableStock: opportunity.recommendedInitialStock,
                },
              },
            })}
          >
            {canAdd
              ? `Catalogue mein add karo — ${opportunity.recommendedInitialStock} units suggested`
              : 'Category-level signal — koi specific product nahi'}
          </Button>
        </div>
      </div>
    </div>
  );
}
