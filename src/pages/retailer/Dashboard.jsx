import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Boxes,
  Layers,
  MapPin,
  Megaphone,
  Mic,
  RotateCcw,
  Store,
  Truck,
} from 'lucide-react';
import { ActionGrid, ActionTile } from '../../components/ui/ActionGrid';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { List, ListRow, RowChevron } from '../../components/ui/List';
import { Meta, PageHeader } from '../../components/ui/PageHeader';
import { Section, SectionLink } from '../../components/ui/Section';
import { SkeletonDashboard } from '../../components/ui/Skeleton';
import { Stat, StatGroup } from '../../components/ui/Stat';
import { useDashboard } from '../../hooks/useDashboard';

const formatRupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

/**
 * How strongly to say a demand level.
 *
 * The list under this used to hang two colour chips off every row, and with
 * live data five of the eight chips said the same thing — a wall of identical
 * orange that carried no information and dominated the screen. The level is a
 * word now, tinted rather than boxed, and "Low" is not an alarm so it stays in
 * the body colour.
 */
const DEMAND_TONE = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export function RetailerDashboard() {
  const navigate = useNavigate();
  const { data, isLoading, error, reload } = useDashboard('retailer');

  if (isLoading) return <SkeletonDashboard />;
  if (error) return <ErrorState description={error} onRetry={reload} />;
  if (!data) return null;

  const {
    businessName,
    location,
    snapshot,
    developerPack,
    recommendedProducts,
    reorderItems,
    nearbyDistributors,
  } = data;

  const displayLocation = [location.area, location.district].filter(Boolean).join(', ');
  const budget = developerPack.budget;

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        eyebrow="Mera business"
        title={`Namaste, ${businessName}`}
        description="Aaj kya karna banta hai — aapke area ki demand aur apne stock ke hisaab se."
        // The demand label used to sit here too, three inches above the Demand
        // reading that already carries it.
        meta={displayLocation && <Meta icon={MapPin}>{displayLocation}</Meta>}
      />

      {/*
       * The readings and the daily controls, above everything else.
       *
       * Both of these used to sit in the right-hand column, which on a phone is
       * rendered last — so a shopkeeper opening the app on the device they
       * actually own had to scroll past four sections to find out how their
       * business was doing, and past all of them to reach the sell button they
       * press twenty times a day.
       */}
      <StatGroup>
        <Stat
          label="Health"
          value={snapshot.health}
          caption={snapshot.healthLabel}
          tone={snapshot.health === 'Achha' ? 'positive' : 'caution'}
        />
        <Stat label="Demand" value={snapshot.demand} caption={snapshot.demandLabel} />
        <Stat
          label="Mauke"
          value={snapshot.opportunity}
          caption={snapshot.opportunityLabel}
          tone="brand"
        />
      </StatGroup>

      <ActionGrid>
        <ActionTile
          accent
          icon={Mic}
          label="Bol kar bechein"
          caption="“do packet doodh” — stock khud kam hoga"
          onClick={() => navigate('/retailer/voice-sale')}
        />
        <ActionTile
          icon={Boxes}
          label="Mera stock"
          caption="Shelf, expiry aur daam"
          onClick={() => navigate('/retailer/inventory')}
        />
        <ActionTile
          icon={Megaphone}
          label="Demand batayein"
          caption="Customer ko na mile to signal bhejein"
          onClick={() => navigate('/retailer/report-demand')}
        />
      </ActionGrid>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:items-start lg:gap-7">
        <div className="flex min-w-0 flex-col gap-6">
          {/*
           * The one elevated element on the page. Everything else is flat, so
           * the shadow here means "start with this" rather than "I am a card".
           */}
          <Card elevated clip>
            <div className="border-b border-border bg-primary-subtle px-4 py-4 sm:px-5">
              <p className="eyebrow">Aaj ka suggestion</p>
              <h3 className="mt-1 text-lg font-bold leading-tight text-text-primary">
                {developerPack.title}
              </h3>
              <p className="mt-1 max-w-[54ch] text-sm leading-snug text-text-muted">
                {developerPack.description
                  || 'Aapke business aur area ki demand ke hisaab se banaya gaya pack.'}
              </p>
            </div>

            {developerPack.items.length === 0 ? (
              <div className="px-4 py-6 text-center sm:px-5">
                <p className="mx-auto max-w-[42ch] text-sm leading-relaxed text-text-muted">
                  Abhi aapke area mein koi local supplier available nahi hai. Profile poora
                  karke dobara dekhein.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate('/retailer/profile/edit')}
                >
                  Profile poora karein
                </Button>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-border">
                  {developerPack.items.map((item) => (
                    <li key={item.id} className="px-4 py-3 sm:px-5">
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="min-w-0 truncate text-sm font-semibold text-text-primary">
                          {item.name}
                        </p>
                        <span className="num flex-shrink-0 text-sm font-semibold text-text-primary">
                          {formatRupees(item.lineTotal ?? 0)}
                        </span>
                      </div>
                      <p className="num mt-0.5 text-2xs text-text-muted">
                        {item.suggestedQuantity} &times; {item.variant || item.unit}
                        {item.distributorName ? ` · ${item.distributorName}` : ''}
                        {/* Why the quantity is lower than the demand would
                            suggest. The payload has carried this all along and
                            the row threw it away, which made the number look
                            arbitrary. */}
                        {item.stockCapped && (
                          <span className="text-warning"> · supplier ke stock tak</span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="eyebrow">Estimated total</p>
                    <p className="num text-xl font-bold leading-tight text-text-primary">
                      {formatRupees(developerPack.estimatedTotal)}
                    </p>
                    {budget && (
                      <p className="num mt-0.5 text-2xs text-text-muted">
                        {`Aapka budget ${formatRupees(budget.min)}–${formatRupees(budget.max)}`}
                      </p>
                    )}
                  </div>
                  <Button
                    className="flex-shrink-0"
                    icon={ArrowRight}
                    onClick={() => navigate('/retailer/developer-pack')}
                  >
                    Pack dekho
                  </Button>
                </div>
              </>
            )}
          </Card>

          <Section
            title="Aapke area ke liye"
            description="Aas-paas ki dukaanon ki demand aur local availability ke signals."
          >
            {recommendedProducts.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="Abhi koi signal nahi"
                description="Aapke area se abhi itna demand data nahi aaya ki hum kuch recommend kar sakein."
              />
            ) : (
              <List>
                {recommendedProducts.map((product) => (
                  <ListRow key={product.id} onClick={() => navigate('/retailer/distributors')}>
                    <div className="min-w-0 flex-1">
                      <p className="eyebrow">{product.category}</p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
                        {product.name}
                      </p>
                      {/* Each fact in its own element, separated by a dot the
                          screen reader is spared. */}
                      <p className="num mt-1 flex flex-wrap items-center gap-x-1.5 text-2xs text-text-muted">
                        <span
                          className={`font-semibold ${DEMAND_TONE[product.demandBadge] || 'text-text-secondary'}`}
                        >
                          {`${product.demand} demand`}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {`${product.retailers} retailer signal${product.retailers === 1 ? '' : 's'}`}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {product.suppliers === 0
                            ? 'koi local supplier nahi'
                            : `${product.suppliers} local supplier`}
                        </span>
                      </p>
                    </div>
                    <RowChevron />
                  </ListRow>
                ))}
              </List>
            )}
          </Section>

          <Section
            title="Dobara order"
            description="Jo products aap pehle le chuke hain."
            action={
              reorderItems.length > 0 && (
                <SectionLink onClick={() => navigate('/retailer/reorder')}>Sab dekho</SectionLink>
              )
            }
          >
            {reorderItems.length === 0 ? (
              <EmptyState
                icon={RotateCcw}
                title="Abhi tak koi order nahi"
                description="Pehla order karne ke baad yahaan ek tap mein dobara order kar payenge."
              />
            ) : (
              <List>
                {reorderItems.map((item) => (
                  <ListRow key={item.id} onClick={() => navigate('/retailer/reorder')}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">{item.name}</p>
                      <p className="mt-0.5 text-2xs text-text-muted">
                        Pichhli baar {item.lastOrdered}
                      </p>
                    </div>
                    <RowChevron />
                  </ListRow>
                ))}
              </List>
            )}
          </Section>
        </div>

        <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-[84px]">
          <Section
            title="Aas-paas ke distributors"
            action={
              nearbyDistributors.length > 0 && (
                <SectionLink onClick={() => navigate('/retailer/distributors')}>Sab</SectionLink>
              )
            }
          >
            {nearbyDistributors.length === 0 ? (
              <EmptyState
                icon={Store}
                title="Koi distributor nahi"
                description="Aapke district mein abhi koi registered distributor nahi hai."
              />
            ) : (
              <List>
                {nearbyDistributors.map((dist) => (
                  <ListRow
                    key={dist.id}
                    onClick={() => navigate(`/retailer/distributors/${dist.id}`)}
                  >
                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-primary-light text-primary">
                      <Store size={15} strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">{dist.name}</p>
                      <p className="mt-0.5 truncate text-2xs text-text-muted">{dist.categories}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-2xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} /> {dist.distance}
                        </span>
                        <span className="flex items-center gap-1">
                          <Truck size={11} /> {dist.delivery}
                        </span>
                      </p>
                    </div>
                    <RowChevron />
                  </ListRow>
                ))}
              </List>
            )}
          </Section>
        </aside>
      </div>
    </div>
  );
}
