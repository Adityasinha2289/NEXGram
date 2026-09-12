import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Store, Package, Zap } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { ScoreRing } from '../../../components/ui/ScoreRing';
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

  const oppLevel = opportunity.tier;
  const targetName = opportunity.name;
  const breakdown = opportunity.evidence?.breakdown || [];

  return (
    <div className="flex flex-col gap-6 pb-44 animate-fade-in relative">
      {/* The Layout header already provides a back control. */}
      <header>
        <div>
          <h2 className="text-xl font-bold text-text-primary leading-tight">{targetName}</h2>
          <p className="text-sm text-text-muted mt-0.5">{opportunity.category}{opportunity.area ? ` · ${opportunity.area}` : ''}</p>
        </div>
      </header>

      {/* Hero Metric */}
      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardContent className="p-5 flex items-start gap-4">
          <ScoreRing
            score={opportunity.score}
            tier={opportunity.tier}
            confidence={opportunity.confidence}
            size="lg"
            showLabel={false}
          />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-lg font-bold text-text-primary leading-none">{oppLevel} opportunity</span>
              <Badge variant={opportunity.tierVariant}>{Math.round(opportunity.score)}/100</Badge>
            </div>
            <p className="text-xs text-text-muted mt-1.5">
              <span className="font-semibold text-text-primary">{opportunity.confidence} confidence</span>
              {' '}&middot; {opportunity.retailerCount} retailer signal{opportunity.retailerCount === 1 ? '' : 's'}
            </p>
            <p className="text-sm text-text-muted leading-relaxed mt-2">
              {opportunity.evidence?.summary || "Data-driven gap in the market."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* How the score was reached. This is the product's core promise:
          no number without the arithmetic behind it. */}
      {breakdown.length > 0 && (
        <Card className="border-border">
          <CardContent className="p-4 flex flex-col gap-3">
            <h3 className="font-bold text-sm text-text-primary">Yeh score kaise bana</h3>
            {breakdown.map(part => (
              <div key={part.label} className="flex flex-col gap-1">
                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-text-primary font-medium">{part.label}</span>
                  <span className="text-text-muted tabular-nums">
                    {Math.round(part.points)} / {Math.round(part.max)}
                  </span>
                </div>
                <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(100, (part.points / part.max) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-text-muted">{part.detail}</p>
              </div>
            ))}
            <div className="flex justify-between items-baseline border-t border-border pt-2 font-bold text-sm">
              <span className="text-text-primary">Total</span>
              <span className="text-primary tabular-nums">{Math.round(opportunity.score)} / 100</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
              <TrendingUp size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Demand Score</span>
            </div>
            <span className={`text-lg font-bold ${getDemandColor(opportunity.components.demand)}`}>{Math.round(opportunity.components.demand)}</span>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
              <Store size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Retailers</span>
            </div>
            <span className="text-lg font-bold text-text-primary">{opportunity.retailerCount} Looking</span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
              <Package size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Local Supply</span>
            </div>
            <span className="text-lg font-bold text-text-primary">{opportunity.availableSupplierCount} can fulfil</span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
              <TrendingUp size={14} className="rotate-180" />
              <span className="text-xs font-bold uppercase tracking-wider">Competition</span>
            </div>
            <span className="text-lg font-bold text-text-primary">{opportunity.evidence?.competition || "Unknown"}</span>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-[70px] left-0 right-0 mx-auto max-w-[1024px] p-4 bg-surface border-t border-border flex gap-3 z-[60] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button
          variant="primary"
          fullWidth
          icon={Package}
          disabled={!opportunity.defaultVariantId}
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
          {opportunity.defaultVariantId
            ? `Add to Catalogue (${opportunity.recommendedInitialStock} units suggested)`
            : 'Category-level signal - koi specific product nahi'}
        </Button>
      </div>
    </div>
  );
}
