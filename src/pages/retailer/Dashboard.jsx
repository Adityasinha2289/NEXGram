import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Landmark,
  Layers,
  MapPin,
  Megaphone,
  RotateCcw,
  Search,
  Store,
  Truck,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
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

const SHORTCUTS = [
  { to: '/retailer/market', icon: Search, label: 'Kya milta hai?', caption: 'Local stock aur daam' },
  { to: '/retailer/reorder', icon: RotateCcw, label: 'Dobara order', caption: 'Pichhli baar jo liya' },
  { to: '/retailer/schemes', icon: Landmark, label: 'Sarkari schemes', caption: 'Aapke profile se match' },
];

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

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        eyebrow="Mera business"
        title={`Namaste, ${businessName}`}
        description="Aapke area ki demand aur stock ke hisaab se, aaj kya karna banta hai."
        meta={
          <>
            {displayLocation && <Meta icon={MapPin}>{displayLocation}</Meta>}
            <Meta icon={Activity}>{snapshot.demandLabel}</Meta>
          </>
        }
      />

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
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">
                          {item.name}
                        </p>
                        <p className="num mt-0.5 text-2xs text-text-muted">
                          {item.suggestedQuantity} &times; {item.variant || item.unit}
                          {item.distributorName ? ` · ${item.distributorName}` : ''}
                        </p>
                      </div>
                      <span className="num flex-shrink-0 text-sm font-semibold text-text-primary">
                        {formatRupees(item.lineTotal ?? 0)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between gap-4 border-t border-border bg-surface-muted px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="eyebrow">Estimated total</p>
                    <p className="num text-xl font-bold leading-tight text-text-primary">
                      {formatRupees(developerPack.estimatedTotal)}
                    </p>
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

          {/* The entry point to the whole demand → opportunity loop. */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-secondary/25 bg-secondary-subtle px-4 py-3.5">
            <div className="flex min-w-0 items-start gap-3">
              <Megaphone size={18} className="mt-0.5 flex-shrink-0 text-secondary" strokeWidth={2} />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-tight text-text-primary">
                  Customer ko kuch nahi mila?
                </h3>
                <p className="mt-0.5 text-sm leading-snug text-text-secondary">
                  Batayein — signal seedha aapke area ke distributors tak jayega.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="flex-shrink-0"
              onClick={() => navigate('/retailer/report-demand')}
            >
              Batayein
            </Button>
          </div>

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
                      <p className="num mt-1 text-2xs text-text-muted">
                        {product.retailers} retailer signal{product.retailers === 1 ? '' : 's'}
                        {' · '}
                        {product.suppliers === 0
                          ? 'koi local supplier nahi'
                          : `${product.suppliers} local supplier`}
                      </p>
                    </div>
                    <div className="hidden flex-shrink-0 items-center gap-1.5 sm:flex">
                      <Badge variant={product.demandBadge} dot>Demand {product.demand}</Badge>
                      <Badge variant={product.availabilityBadge} dot>
                        Supply {product.availability}
                      </Badge>
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
                    <span className="flex-shrink-0 text-sm font-semibold text-primary">
                      Dobara order
                    </span>
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

          <Section title="Shortcuts">
            <List>
              {SHORTCUTS.map((item) => (
                <ListRow key={item.to} onClick={() => navigate(item.to)}>
                  <item.icon size={16} className="flex-shrink-0 text-text-muted" strokeWidth={2} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">{item.label}</p>
                    <p className="truncate text-2xs text-text-muted">{item.caption}</p>
                  </div>
                  <RowChevron />
                </ListRow>
              ))}
            </List>
          </Section>
        </aside>
      </div>
    </div>
  );
}
