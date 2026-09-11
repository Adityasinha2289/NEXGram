import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Target, Users, MapPin, PackageOpen, ListOrdered, ArrowRight, PlusCircle, TrendingUp, AlertCircle, CheckCircle2, Truck } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DISTRIBUTOR_DASHBOARD_MOCK } from '../../data/distributorMock';
import { useCatalogue } from './catalogue/hooks/useCatalogue';
import { DemandEngine } from '../../features/intelligence/services/DemandEngine';
import { SupplyGapEngine } from '../../features/intelligence/services/SupplyGapEngine';
import { OpportunityEngine } from '../../features/intelligence/services/OpportunityEngine';
import { DEMAND_TEST_MOCK } from '../../data/demandTestMock';
import { SUPPLY_GAP_CATALOGUES_MOCK } from '../../data/supplyGapTestMock';
import { useAuth } from '../../context/AuthContext';

export function DistributorDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { businessName, location, snapshot, demandGaps, retailerDemand, orders } = DISTRIBUTOR_DASHBOARD_MOCK;
  const { summary: catalogueSummary } = useCatalogue();

  // Use profile data if available
  const displayBusinessName = profile?.profile_data?.businessName || profile?.name || businessName;
  const displayLocation = profile?.profile_data?.location?.district && profile?.profile_data?.location?.area
    ? `${profile.profile_data.location.area}, ${profile.profile_data.location.district}`
    : `${location.area}, ${location.district}`;

  useEffect(() => {
    // DEV INTEGRATION: Log Opportunity Engine outputs
    const demandSignals = DemandEngine.analyze(DEMAND_TEST_MOCK);
    const gapSignals = SupplyGapEngine.analyze(demandSignals, SUPPLY_GAP_CATALOGUES_MOCK);
    const oppSignals = OpportunityEngine.analyze(gapSignals.productGaps, gapSignals.categoryGaps, SUPPLY_GAP_CATALOGUES_MOCK, { limit: 3 });
    console.log("[DEV INTELLIGENCE] Top 3 Opportunities:", oppSignals);
  }, []);

  return (
    <div className="flex flex-col gap-6 pb-6 animate-fade-in">
      {/* 1. HEADER / GREETING */}
      <header>
        <h2 className="text-2xl font-bold text-text-primary leading-tight">Namaste, {displayBusinessName}</h2>
        <p className="text-text-muted mt-1 text-sm">Apne area mein naye business opportunities dekhiye.</p>
        <div className="flex items-center gap-1 text-sm font-medium text-primary mt-2">
          <MapPin size={16} />
          <span>Serving: {displayLocation}</span>
        </div>
      </header>

      {/* 2. BUSINESS SNAPSHOT */}
      <section className="grid grid-cols-3 gap-3">
        <Card className="bg-surface border-border">
          <CardContent className="p-3 flex flex-col items-center text-center justify-center h-full gap-1">
            <Target className="text-success mb-1" size={20} />
            <p className="text-lg font-bold text-text-primary leading-none">{snapshot.opportunityScore}</p>
            <p className="text-[10px] uppercase font-bold text-text-muted tracking-wider leading-tight">Opportunity</p>
            <p className="text-[10px] text-success leading-tight mt-1">{snapshot.opportunityLabel}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-surface border-border">
          <CardContent className="p-3 flex flex-col items-center text-center justify-center h-full gap-1">
            <Users className="text-primary mb-1" size={20} />
            <p className="text-lg font-bold text-text-primary leading-none">{snapshot.retailersLooking}</p>
            <p className="text-[10px] uppercase font-bold text-text-muted tracking-wider leading-tight">Retailers</p>
            <p className="text-[10px] text-text-muted leading-tight mt-1">{snapshot.retailersLabel}</p>
          </CardContent>
        </Card>

        <Card className="bg-surface border-border">
          <CardContent className="p-3 flex flex-col items-center text-center justify-center h-full gap-1">
            <PackageOpen className="text-secondary mb-1" size={20} />
            <p className="text-lg font-bold text-text-primary leading-none">{catalogueSummary.totalProducts}</p>
            <p className="text-[10px] uppercase font-bold text-text-muted tracking-wider leading-tight">Products</p>
            <p className="text-[10px] text-text-muted leading-tight mt-1">{catalogueSummary.totalCategories} categories</p>
          </CardContent>
        </Card>
      </section>

      {/* 8. QUICK ACTIONS */}
      <section>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button 
            variant="secondary" 
            size="sm" 
            icon={PlusCircle} 
            className="flex-shrink-0 whitespace-nowrap shadow-sm"
            onClick={() => navigate('/distributor/catalogue')}
          >
            Product Add Karo
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            icon={TrendingUp} 
            className="flex-shrink-0 whitespace-nowrap bg-surface"
            onClick={() => navigate('/distributor/opportunities')}
          >
            Opportunity Dekho
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            icon={ListOrdered} 
            className="flex-shrink-0 whitespace-nowrap bg-surface"
            onClick={() => navigate('/distributor/orders')}
          >
            Orders Dekho
          </Button>
        </div>
      </section>

      {/* 3. LOCAL DEMAND GAPS */}
      <section className="bg-surface-muted -mx-4 px-4 py-6 border-y border-border">
        <div className="mb-4">
          <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
            Local Demand Gaps <TrendingUp size={18} className="text-primary" />
          </h3>
          <p className="text-sm text-text-muted">Retailers ke current requirements ke basis par</p>
        </div>
        
        <div className="flex flex-col gap-4">
          {demandGaps.map(gap => (
            <Card key={gap.id} className="border-l-4" style={{ borderLeftColor: `var(--color-${gap.badgeVariant})` }}>
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-text-muted uppercase font-bold tracking-wider mb-0.5">{gap.category}</p>
                    <h4 className="font-bold text-md text-text-primary leading-tight">{gap.product}</h4>
                  </div>
                  <Badge variant={gap.badgeVariant}>{gap.opportunity} Opportunity</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm bg-surface-muted p-2 rounded-md">
                  <div>
                    <span className="text-text-muted text-xs block">Demand</span>
                    <span className="font-semibold text-text-primary">{gap.demand}</span>
                  </div>
                  <div>
                    <span className="text-text-muted text-xs block">Retailers Looking</span>
                    <span className="font-semibold text-text-primary">{gap.retailers}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-text-muted text-xs block">Local Supply</span>
                    <span className="font-semibold text-text-primary">{gap.supply}</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  fullWidth 
                  className="mt-1"
                  onClick={() => navigate('/distributor/opportunities')}
                >
                  Opportunity Dekho
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 4. OPPORTUNITY CTA */}
        <Button 
          variant="ghost" 
          fullWidth 
          icon={ArrowRight} 
          className="mt-4 text-primary"
          onClick={() => navigate('/distributor/opportunities')}
        >
          Saari Opportunities Dekho
        </Button>
      </section>

      {/* 5. RETAILER DEMAND SECTION */}
      <section>
        <h3 className="font-bold text-lg text-text-primary mb-3">Retailer Demand</h3>
        <Card>
          <CardContent className="p-0">
            <ul className="flex flex-col divide-y divide-border">
              {retailerDemand.map((item) => (
                <li key={item.id} className="flex items-center justify-between p-4 hover:bg-surface-muted transition-colors cursor-pointer" onClick={() => navigate('/distributor/opportunities')}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-light rounded-lg">
                      <Users size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-text-primary">{item.count} retailers need</p>
                      <p className="text-sm text-text-muted">{item.category} products</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-text-muted" />
                </li>
              ))}
            </ul>
            <div className="p-3 border-t border-border">
              <Button variant="ghost" size="sm" fullWidth onClick={() => navigate('/distributor/opportunities')}>
                Demand Dekho
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 6. CATALOGUE READINESS */}
        <section>
          <h3 className="font-bold text-lg text-text-primary mb-3">Catalogue Status</h3>
          <Card className="h-full">
            <CardContent className="p-4 flex flex-col justify-between h-full gap-4">
              <div className="flex items-start gap-3">
                <PackageOpen size={24} className="text-secondary flex-shrink-0" />
                <div>
                  <p className="font-bold text-text-primary">{catalogueSummary.totalProducts} products listed</p>
                  <p className="text-sm text-text-muted">{catalogueSummary.totalCategories} categories covered</p>
                </div>
              </div>
              <Button variant="outline" size="sm" fullWidth onClick={() => navigate('/distributor/catalogue')}>
                Catalogue Manage Karo
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* 7. ORDERS NEEDING ATTENTION */}
        <section>
          <h3 className="font-bold text-lg text-text-primary mb-3">Orders Need Attention</h3>
          <Card className="h-full">
            <CardContent className="p-4 flex flex-col justify-between h-full gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-text-primary">
                  <AlertCircle size={16} className="text-warning" />
                  <span className="font-bold">{orders.pending} pending</span> orders
                </div>
                <div className="flex items-center gap-2 text-sm text-text-primary">
                  <Truck size={16} className="text-primary" />
                  <span className="font-bold">{orders.ready} ready</span> for delivery
                </div>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <CheckCircle2 size={16} />
                  <span>{orders.completed} recently completed</span>
                </div>
              </div>
              <Button variant="outline" size="sm" fullWidth onClick={() => navigate('/distributor/orders')}>
                Orders Dekho
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>

    </div>
  );
}
