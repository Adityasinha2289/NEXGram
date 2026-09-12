import { useNavigate } from 'react-router-dom';
import { PackageOpen, MapPin, TrendingUp, HeartPulse, Sparkles, Store, Clock, ArrowRight, Truck } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useDashboard } from '../../hooks/useDashboard';

const formatRupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

export function RetailerDashboard() {
  const navigate = useNavigate();
  const { data, isLoading, error, reload } = useDashboard('retailer');

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState description={error} onRetry={reload} />;
  if (!data) return null;

  const {
    businessName,
    location,
    snapshot: businessSnapshot,
    developerPack,
    recommendedProducts,
    reorderItems,
    nearbyDistributors,
  } = data;

  const displayLocation = [location.area, location.district].filter(Boolean).join(', ') || 'Aapka Area';

  return (
    <div className="flex flex-col gap-6 pb-6 animate-fade-in">
      
      {/* 1. HEADER / GREETING */}
      <header>
        <h2 className="text-2xl font-bold text-text-primary leading-tight">Namaste, {businessName}</h2>
        <p className="text-text-muted mt-1 text-sm">Aapke business ke liye aaj kya useful hai?</p>
        <div className="flex items-center gap-1 text-sm font-medium text-primary mt-2">
          <MapPin size={16} />
          <span>{displayLocation}</span>
        </div>
      </header>

      {/* 2. DEVELOPER PACK — PRIMARY ACTION (Hero Card) */}
      <section>
        <Card className="bg-primary/5 border-primary/20 overflow-hidden relative shadow-md">
          {/* Decorative background element */}
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <CardContent className="p-5 flex flex-col gap-4 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-xl text-text-primary flex items-center gap-2">
                  <Sparkles size={20} className="text-primary" />
                  Your Developer Pack
                </h3>
                <p className="text-sm text-text-muted mt-1 leading-snug">Aapke business aur current requirements ke hisaab se products ka suggested pack.</p>
              </div>
            </div>

            <div className="bg-surface border border-border/50 rounded-lg p-3">
              <p className="font-bold text-sm text-text-primary mb-2 border-b border-border/50 pb-2">{developerPack.title}</p>
              {developerPack.items.length === 0 ? (
                <p className="text-sm text-text-muted">
                  Abhi aapke area mein koi local supplier available nahi hai. Profile complete karke dobara dekhein.
                </p>
              ) : (
                <>
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {developerPack.items.map(item => (
                      <li key={item.id} className="flex justify-between text-text-primary">
                        <span>{item.name} <span className="text-text-muted">{item.variant}</span></span>
                        <span className="font-medium text-text-muted">{item.suggestedQuantity} &times; {item.variant || item.unit}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 pt-2 border-t border-border/50 flex justify-between items-center font-bold">
                    <span className="text-sm text-text-muted">Estimated Total:</span>
                    <span className="text-primary">{formatRupees(developerPack.estimatedTotal)}</span>
                  </div>
                </>
              )}
            </div>

            <Button fullWidth onClick={() => navigate('/retailer/developer-pack')} className="shadow-sm">
              Pack Dekho
            </Button>
            <p className="text-[10px] text-center text-text-muted mt-[-4px]">Based on your business profile & current requirements</p>
          </CardContent>
        </Card>
      </section>

      {/* 3. REPORT UNMET DEMAND - the loop's entry point */}
      <section>
        <Card className="border-secondary/30 bg-secondary-light">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-bold text-md text-text-primary leading-tight">Kuch nahi mila customer ko?</h3>
              <p className="text-sm text-text-secondary mt-0.5 leading-snug">
                Batayein, aur aapke area ke distributors tak signal pahunche.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="flex-shrink-0"
              onClick={() => navigate('/retailer/report-demand')}
            >
              Batayein
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* 4. RECOMMENDED FOR YOUR AREA */}
      <section>
        <div className="mb-3">
          <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
            Recommended for Your Area
          </h3>
          <p className="text-sm text-text-muted">Nearby retailers ki demand aur local availability ke signals.</p>
        </div>
        
        <div className="flex flex-col gap-3">
          {recommendedProducts.length === 0 && (
            <EmptyState
              title="Abhi koi signal nahi"
              description="Aapke area se abhi tak itna demand data nahi aaya ki hum recommend kar sakein."
            />
          )}
          {recommendedProducts.map(product => (
            <Card key={product.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-xs text-text-muted uppercase font-bold tracking-wider mb-0.5">{product.category}</p>
                  <h4 className="font-bold text-md text-text-primary leading-tight">{product.name}</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant={product.demandBadge} className="text-[10px]">Demand {product.demand}</Badge>
                    <Badge variant={product.availabilityBadge} className="text-[10px]">Supply {product.availability}</Badge>
                  </div>
                  <p className="text-[11px] text-text-muted mt-1.5">
                    {product.retailers} retailer signal{product.retailers === 1 ? '' : 's'} &middot;{' '}
                    {product.suppliers === 0 ? 'koi local supplier nahi' : `${product.suppliers} local supplier`}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/retailer/distributors')} className="flex-shrink-0">
                  Details Dekho
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. QUICK REORDER */}
      <section>
        <div className="mb-3 flex justify-between items-end">
          <div>
            <h3 className="font-bold text-lg text-text-primary">Quick Reorder</h3>
            <p className="text-sm text-text-muted">Jo products aap pehle le chuke hain.</p>
          </div>
          <Button variant="ghost" size="sm" icon={ArrowRight} className="px-0 text-primary" onClick={() => navigate('/retailer/reorder')}>
            Sab Dekho
          </Button>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {reorderItems.length === 0 && (
            <p className="text-sm text-text-muted">Abhi tak koi order nahi hua.</p>
          )}
          {reorderItems.map(item => (
            <Card key={item.id} className="min-w-[160px] flex-shrink-0">
              <CardContent className="p-3 flex flex-col gap-2">
                <PackageOpen size={20} className="text-text-muted" />
                <h4 className="font-bold text-sm text-text-primary truncate">{item.name}</h4>
                <div className="flex items-center gap-1 text-[10px] text-text-muted">
                  <Clock size={12} />
                  <span>{item.lastOrdered}</span>
                </div>
                <Button variant="secondary" size="sm" fullWidth className="mt-1 h-8 text-xs" onClick={() => navigate('/retailer/reorder')}>
                  Dobara Order
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 5. NEARBY DISTRIBUTORS */}
      <section>
        <div className="mb-3">
          <h3 className="font-bold text-lg text-text-primary">Nearby Distributors</h3>
          <p className="text-sm text-text-muted">Aapke area mein available suppliers.</p>
        </div>
        
        <div className="flex flex-col gap-3">
          {nearbyDistributors.length === 0 && (
            <p className="text-sm text-text-muted">Aapke district mein abhi koi registered distributor nahi hai.</p>
          )}
          {nearbyDistributors.map(dist => (
            <Card key={dist.id}>
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                    <Store size={20} className="text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-md text-text-primary leading-tight">{dist.name}</h4>
                    <p className="text-xs text-text-muted mt-0.5">{dist.categories}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] font-medium text-text-primary">
                      <span className="flex items-center gap-1"><MapPin size={12} className="text-text-muted" /> {dist.distance}</span>
                      <span className="flex items-center gap-1"><Truck size={12} className="text-text-muted" /> {dist.delivery}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" fullWidth onClick={() => navigate('/retailer/distributors')}>
                  Catalogue Dekho
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 6. BUSINESS SNAPSHOT */}
      <section className="mt-2 border-t border-border pt-6">
        <h3 className="font-bold text-lg text-text-primary mb-3">Business Snapshot</h3>
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-surface border-border">
            <CardContent className="p-3 flex flex-col items-center text-center justify-center h-full gap-1">
              <HeartPulse className="text-success mb-1" size={18} />
              <p className="text-[10px] uppercase font-bold text-text-muted tracking-wider leading-tight">Health</p>
              <p className="text-md font-bold text-text-primary leading-none mt-0.5">{businessSnapshot.health}</p>
              <p className="text-[9px] text-text-muted leading-tight mt-1">{businessSnapshot.healthLabel}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-surface border-border">
            <CardContent className="p-3 flex flex-col items-center text-center justify-center h-full gap-1">
              <TrendingUp className="text-primary mb-1" size={18} />
              <p className="text-[10px] uppercase font-bold text-text-muted tracking-wider leading-tight">Demand</p>
              <p className="text-md font-bold text-text-primary leading-none mt-0.5">{businessSnapshot.demand}</p>
              <p className="text-[9px] text-text-muted leading-tight mt-1">{businessSnapshot.demandLabel}</p>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardContent className="p-3 flex flex-col items-center text-center justify-center h-full gap-1">
              <PackageOpen className="text-secondary mb-1" size={18} />
              <p className="text-[10px] uppercase font-bold text-text-muted tracking-wider leading-tight">Opportunity</p>
              <p className="text-md font-bold text-text-primary leading-none mt-0.5">{businessSnapshot.opportunity}</p>
              <p className="text-[9px] text-text-muted leading-tight mt-1">{businessSnapshot.opportunityLabel}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 7. SIMPLE NEXT ACTIONS */}
      <section className="mt-2 pb-6">
        <h3 className="font-bold text-lg text-text-primary mb-3">Aaj Kya Karein?</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/retailer/developer-pack')}>
            Pack Dekho
          </Button>
          <Button variant="outline" size="sm" className="bg-surface" onClick={() => navigate('/retailer/distributors')}>
            Products Dekho
          </Button>
          <Button variant="outline" size="sm" className="bg-surface" onClick={() => navigate('/retailer/reorder')}>
            Dobara Order Karo
          </Button>
          <Button variant="outline" size="sm" className="bg-surface" onClick={() => navigate('/retailer/report-demand')}>
            Kya Nahi Mila?
          </Button>
          <Button variant="outline" size="sm" className="bg-surface" onClick={() => navigate('/retailer/schemes')}>
            Sarkari Schemes
          </Button>
        </div>
      </section>

    </div>
  );
}
