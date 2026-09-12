import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Landmark,
  MapPin,
  Package,
  PlusCircle,
  Target,
  Truck,
  Users,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { List, ListRow, RowChevron } from '../../components/ui/List';
import { Meta, PageHeader } from '../../components/ui/PageHeader';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { Section, SectionLink } from '../../components/ui/Section';
import { SkeletonDashboard } from '../../components/ui/Skeleton';
import { Stat, StatGroup } from '../../components/ui/Stat';
import { useDashboard } from '../../hooks/useDashboard';

const TONE_BY_VARIANT = {
  success: 'positive',
  primary: 'brand',
  warning: 'caution',
  danger: 'negative',
};

export function DistributorDashboard() {
  const navigate = useNavigate();
  const { data, isLoading, error, reload } = useDashboard('distributor');

  if (isLoading) return <SkeletonDashboard />;
  if (error) return <ErrorState description={error} onRetry={reload} />;
  if (!data) return null;

  const { businessName, location, snapshot, demandGaps, retailerDemand, orders, catalogue } = data;
  const displayLocation = [location.area, location.district].filter(Boolean).join(', ');

  // The bars below are shares of the largest category, not of the total: with
  // one dominant category every other bar would round to nothing.
  const busiestCategory = Math.max(1, ...retailerDemand.map((item) => item.count));
  const needsAttention = orders.pending + orders.ready;

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        eyebrow="Mera business"
        title={`Namaste, ${businessName}`}
        description="Aapke area mein kis cheez ki demand hai aur koi supply nahi kar raha — sab ek jagah."
        meta={
          <>
            {displayLocation && <Meta icon={MapPin}>{displayLocation}</Meta>}
            <Meta icon={Users}>{snapshot.retailersLooking} retailers demand bhej rahe hain</Meta>
          </>
        }
        action={
          <Button icon={PlusCircle} onClick={() => navigate('/distributor/catalogue')}>
            Product add karo
          </Button>
        }
      />

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:items-start lg:gap-7">
        <div className="flex min-w-0 flex-col gap-6">
          <Section
            title="Local demand gaps"
            description="Jo aapke area ke retailers maang rahe hain aur abhi koi supply nahi kar pa raha."
            action={
              demandGaps.length > 0 && (
                <SectionLink onClick={() => navigate('/distributor/opportunities')}>
                  Sab dekho
                </SectionLink>
              )
            }
          >
            {demandGaps.length === 0 ? (
              <EmptyState
                icon={Target}
                title="Abhi koi signal nahi"
                description="Aapke area ke retailers ne abhi tak koi unmet demand report nahi ki. Signal aate hi yahaan dikhega."
              />
            ) : (
              <List>
                {demandGaps.map((gap) => (
                  <ListRow
                    key={gap.id}
                    className="items-start gap-4"
                    onClick={() => navigate('/distributor/opportunities')}
                  >
                    <div className="flex-shrink-0 pt-0.5">
                      <ScoreRing
                        score={gap.score}
                        tier={gap.opportunity}
                        confidence={gap.confidence}
                        size="sm"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* A category-level gap has no product, so the engine
                          labels it with the category — printing that twice
                          reads like a rendering fault. */}
                      {gap.category !== gap.product && <p className="eyebrow">{gap.category}</p>}
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold leading-tight text-text-primary">
                          {gap.product}
                        </h4>
                        <Badge variant={gap.badgeVariant} dot>{gap.opportunity}</Badge>
                      </div>

                      {/* The score never appears without the evidence under it. */}
                      <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                        <div>
                          <dt className="eyebrow">Retailers</dt>
                          <dd className="num text-sm font-semibold text-text-primary">
                            {gap.retailers}
                          </dd>
                        </div>
                        <div>
                          <dt className="eyebrow">Demand</dt>
                          <dd className="text-sm font-semibold text-text-primary">{gap.demand}</dd>
                        </div>
                        <div>
                          <dt className="eyebrow">Local supply</dt>
                          <dd className="text-sm font-semibold text-text-primary">{gap.supply}</dd>
                        </div>
                      </dl>
                    </div>

                    <RowChevron />
                  </ListRow>
                ))}
              </List>
            )}
          </Section>

          <Section
            title="Retailer demand, category ke hisaab se"
            description="Aapke district mein kis category ke liye sabse zyada dukaanein poochh rahi hain."
          >
            {retailerDemand.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Koi demand signal nahi"
                description="Is area se abhi tak koi demand signal nahi aaya."
              />
            ) : (
              <List>
                {retailerDemand.map((item) => (
                  <ListRow key={item.id} onClick={() => navigate('/distributor/opportunities')}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {item.category}
                        </p>
                        <p className="num flex-shrink-0 text-sm font-semibold text-text-primary">
                          {item.count}
                          <span className="ml-1 text-2xs font-normal text-text-muted">
                            retailer{item.count === 1 ? '' : 's'}
                          </span>
                        </p>
                      </div>
                      {/* A bar rather than a second number: the comparison
                          between categories is the point, not the count. */}
                      <div
                        className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
                        role="img"
                        aria-label={`${item.count} retailers`}
                      >
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(6, (item.count / busiestCategory) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <RowChevron />
                  </ListRow>
                ))}
              </List>
            )}
          </Section>
        </div>

        <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-[84px]">
          <StatGroup>
            <Stat
              label="Top score"
              value={snapshot.opportunityScore}
              caption={snapshot.opportunityLabel}
              tone={TONE_BY_VARIANT[snapshot.opportunityVariant] || 'default'}
            />
            <Stat
              label="Retailers"
              value={snapshot.retailersLooking}
              caption={snapshot.retailersLabel}
            />
            <Stat
              label="Products"
              value={catalogue.totalProducts}
              caption={`${catalogue.totalCategories} categories`}
            />
          </StatGroup>

          <Section
            title="Orders"
            action={
              <SectionLink onClick={() => navigate('/distributor/orders')}>Dekho</SectionLink>
            }
          >
            <List>
              <ListRow onClick={() => navigate('/distributor/orders')}>
                <AlertCircle size={16} className="flex-shrink-0 text-warning" strokeWidth={2} />
                <span className="flex-1 text-sm text-text-secondary">Pending</span>
                <span className="num text-sm font-semibold text-text-primary">{orders.pending}</span>
              </ListRow>
              <ListRow onClick={() => navigate('/distributor/orders')}>
                <Truck size={16} className="flex-shrink-0 text-primary" strokeWidth={2} />
                <span className="flex-1 text-sm text-text-secondary">Delivery ke liye ready</span>
                <span className="num text-sm font-semibold text-text-primary">{orders.ready}</span>
              </ListRow>
              <ListRow onClick={() => navigate('/distributor/orders')}>
                <CheckCircle2 size={16} className="flex-shrink-0 text-text-muted" strokeWidth={2} />
                <span className="flex-1 text-sm text-text-secondary">Recently complete</span>
                <span className="num text-sm font-semibold text-text-primary">
                  {orders.completed}
                </span>
              </ListRow>
            </List>
            {needsAttention > 0 && (
              <p className="text-2xs text-text-muted">
                {needsAttention} order{needsAttention === 1 ? '' : 's'} aapke action ka intezaar
                kar rahe hain.
              </p>
            )}
          </Section>

          <Section title="Shortcuts">
            <List>
              <ListRow onClick={() => navigate('/distributor/catalogue')}>
                <Package size={16} className="flex-shrink-0 text-text-muted" strokeWidth={2} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">Catalogue manage karo</p>
                  <p className="num truncate text-2xs text-text-muted">
                    {catalogue.totalProducts} products · {catalogue.totalCategories} categories
                  </p>
                </div>
                <RowChevron />
              </ListRow>
              <ListRow onClick={() => navigate('/distributor/opportunities')}>
                <Target size={16} className="flex-shrink-0 text-text-muted" strokeWidth={2} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">Saari opportunities</p>
                  <p className="truncate text-2xs text-text-muted">Score aur evidence ke saath</p>
                </div>
                <RowChevron />
              </ListRow>
              <ListRow onClick={() => navigate('/distributor/schemes')}>
                <Landmark size={16} className="flex-shrink-0 text-text-muted" strokeWidth={2} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">Sarkari schemes</p>
                  <p className="truncate text-2xs text-text-muted">Aapke profile se match</p>
                </div>
                <RowChevron />
              </ListRow>
            </List>
          </Section>
        </aside>
      </div>
    </div>
  );
}
