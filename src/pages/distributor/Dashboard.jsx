import { useNavigate } from 'react-router-dom';
import { MapPin, PlusCircle, Target, Users } from 'lucide-react';
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

  const {
    businessName,
    location,
    snapshot,
    demandGaps,
    retailerDemand,
    orders,
    catalogue,
    opportunityCount,
  } = data;
  const displayLocation = [location.area, location.district].filter(Boolean).join(', ');

  // The bars below are shares of the largest category, not of the total: with
  // one dominant category every other bar would round to nothing.
  const busiestCategory = Math.max(1, ...retailerDemand.map((item) => item.count));

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        eyebrow="Mera business"
        title={`Namaste, ${businessName}`}
        description="Aapke area mein kis cheez ki demand hai aur koi supply nahi kar raha — sab ek jagah."
        // The retailer count used to sit here as well, directly above the
        // Retailers reading that already carries it.
        meta={displayLocation && <Meta icon={MapPin}>{displayLocation}</Meta>}
        action={
          <Button icon={PlusCircle} onClick={() => navigate('/distributor/catalogue')}>
            Product add karo
          </Button>
        }
      />

      {/* Moved out of the right-hand column, which a phone renders last: the
          readings were at the bottom of the scroll on the device most of these
          users open the app on. */}
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
          caption={`${catalogue.totalCategories} categor${catalogue.totalCategories === 1 ? 'y' : 'ies'}`}
        />
      </StatGroup>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:items-start lg:gap-7">
        <div className="flex min-w-0 flex-col gap-6">
          <Section
            title="Local demand gaps"
            description="Jo aapke area ke retailers maang rahe hain aur abhi koi supply nahi kar pa raha."
            action={
              demandGaps.length > 0 && (
                <SectionLink onClick={() => navigate('/distributor/opportunities')}>
                  {/* The payload has always carried the full count; the link
                      used to say "Sab dekho" without saying how many. */}
                  {opportunityCount ? `Sab ${opportunityCount}` : 'Sab dekho'}
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
                      {/*
                       * A gap can be about one product or about a whole
                       * category, and a category-level one arrives with its
                       * product field set to the category name. The eyebrow
                       * used to be hidden in that case, which left two
                       * category-level Dairy signals rendering as two rows both
                       * titled "Dairy" with nothing to tell them apart — it
                       * read as a duplicate rather than two real signals.
                       */}
                      <p className="eyebrow">
                        {gap.category === gap.product ? 'Poori category' : gap.category}
                      </p>
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
          {/*
           * Orders, as three readings rather than three rows.
           *
           * This was a list of three tappable rows that all went to the same
           * page, followed by a sentence restating two of the numbers. It is
           * one instrument panel and one link now.
           *
           * The "Shortcuts" block that used to sit below it is gone: its three
           * rows — catalogue, opportunities, schemes — are all in the sidebar
           * nav two inches to the left, so it was navigation drawn twice.
           */}
          <Section
            title="Orders"
            action={
              <SectionLink onClick={() => navigate('/distributor/orders')}>Dekho</SectionLink>
            }
          >
            <StatGroup>
              <Stat
                label="Pending"
                value={orders.pending}
                tone={orders.pending > 0 ? 'caution' : 'default'}
              />
              <Stat
                label="Ready"
                value={orders.ready}
                tone={orders.ready > 0 ? 'brand' : 'default'}
              />
              <Stat label="Complete" value={orders.completed} />
            </StatGroup>
          </Section>
        </aside>
      </div>
    </div>
  );
}
