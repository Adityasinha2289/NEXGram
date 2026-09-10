import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Store, Package, Zap } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { OPPORTUNITIES_MOCK } from '../../../data/opportunitiesMock';

export function OpportunityDetail() {
  const { opportunityId } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);

  useEffect(() => {
    const found = OPPORTUNITIES_MOCK.find(o => o.id === opportunityId);
    setOpportunity(found || null);
  }, [opportunityId]);

  if (!opportunity) {
    return (
      <div className="py-12">
        <EmptyState 
          title="Opportunity Not Found" 
          description="Yeh data available nahi hai." 
          actionLabel="Go Back"
          onAction={() => navigate(-1)}
        />
      </div>
    );
  }

  const getDemandColor = (level) => {
    switch (level) {
      case 'High': return 'text-success';
      case 'Medium': return 'text-primary';
      default: return 'text-warning';
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-20 animate-fade-in relative h-full">
      <header className="flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-surface-muted text-text-muted transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-text-primary leading-tight">{opportunity.productName}</h2>
          <p className="text-sm text-text-muted mt-0.5">{opportunity.category}</p>
        </div>
      </header>

      {/* Hero Metric */}
      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
            <Zap size={24} fill="currentColor" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-text-primary mb-1">{opportunity.opportunityLevel} Opportunity</h3>
            <p className="text-sm text-text-muted leading-relaxed">{opportunity.insightText}</p>
          </div>
        </CardContent>
      </Card>

      {/* Detail Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
              <TrendingUp size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Demand</span>
            </div>
            <span className={`text-lg font-bold ${getDemandColor(opportunity.demandLevel)}`}>{opportunity.demandLevel}</span>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
              <Store size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Retailers</span>
            </div>
            <span className="text-lg font-bold text-text-primary">{opportunity.retailersLooking} Looking</span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
              <Package size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Local Supply</span>
            </div>
            <span className="text-lg font-bold text-text-primary">{opportunity.localSupply}</span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
              <TrendingUp size={14} className="rotate-180" />
              <span className="text-xs font-bold uppercase tracking-wider">Competition</span>
            </div>
            <span className="text-lg font-bold text-text-primary">{opportunity.competition}</span>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface border-t border-border flex gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button variant="primary" fullWidth onClick={() => navigate('/distributor/catalogue')} icon={Package}>
          {opportunity.recommendedAction}
        </Button>
      </div>
    </div>
  );
}
