import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Store, Package, Zap } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { fetchApi } from '../../../services/api/client';

export function OpportunityDetail() {
  const { opportunityId } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOpp = async () => {
      try {
        setLoading(true);
        const res = await fetchApi(`/intelligence/opportunities/${opportunityId}`);
        setOpportunity(res);
      } catch (err) {
        console.error("Failed to fetch opportunity", err);
        setOpportunity(null);
      } finally {
        setLoading(false);
      }
    };
    fetchOpp();
  }, [opportunityId]);

  if (loading) {
    return <div className="py-12 text-center text-text-muted">Loading detail...</div>;
  }

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

  const getDemandColor = (score) => {
    if (score >= 5) return 'text-success';
    if (score >= 2) return 'text-primary';
    return 'text-warning';
  };

  const getOppLevel = (score) => {
    if (score >= 80) return "Strong";
    if (score >= 65) return "Good";
    if (score >= 45) return "Moderate";
    return "Low";
  };

  const oppLevel = getOppLevel(opportunity.opportunity_score);
  const targetName = opportunity.product_id ? opportunity.product_id.toUpperCase() : (opportunity.category_id ? opportunity.category_id.toUpperCase() : "OPPORTUNITY");

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
          <h2 className="text-xl font-bold text-text-primary leading-tight">{targetName}</h2>
          <p className="text-sm text-text-muted mt-0.5">{opportunity.category_id || "Category"}</p>
        </div>
      </header>

      {/* Hero Metric */}
      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
            <Zap size={24} fill="currentColor" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-text-primary mb-1">{oppLevel} Opportunity</h3>
            <p className="text-sm text-text-muted leading-relaxed">{opportunity.evidence_json?.summary || "Data-driven gap in the market."}</p>
          </div>
        </CardContent>
      </Card>

      {/* Detail Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
              <TrendingUp size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Demand Score</span>
            </div>
            <span className={`text-lg font-bold ${getDemandColor(opportunity.demand_score)}`}>{opportunity.demand_score}</span>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
              <Store size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Retailers</span>
            </div>
            <span className="text-lg font-bold text-text-primary">{opportunity.potential_retailer_count} Looking</span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
              <Package size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Local Supply</span>
            </div>
            <span className="text-lg font-bold text-text-primary">{opportunity.supply_score} Suppliers</span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
              <TrendingUp size={14} className="rotate-180" />
              <span className="text-xs font-bold uppercase tracking-wider">Competition</span>
            </div>
            <span className="text-lg font-bold text-text-primary">{opportunity.evidence_json?.competition || "Unknown"}</span>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface border-t border-border flex gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button variant="primary" fullWidth onClick={() => navigate('/distributor/catalogue')} icon={Package}>
          Add to Catalogue ({opportunity.recommended_initial_stock} units suggested)
        </Button>
      </div>
    </div>
  );
}
