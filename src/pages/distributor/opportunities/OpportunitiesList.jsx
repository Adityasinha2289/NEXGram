import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { ScoreRing } from '../../../components/ui/ScoreRing';
import { intelligenceApi } from '../../../services/api/intelligenceApi';

export function OpportunitiesList() {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        setLoading(true);
        // GET /api/intelligence/opportunities
        const res = await intelligenceApi.getOpportunities();
        setOpportunities(res.items || []);
      } catch (err) {
        console.error("Failed to load opportunities:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOpportunities();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (opportunities.length === 0) {
    return (
      <div className="py-12">
        <EmptyState 
          title="No Opportunities Yet" 
          description="Aapke service area ke liye abhi koi naye supply gaps detect nahi hue hain." 
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-20 animate-fade-in">
      <header className="mb-2">
        <h2 className="text-xl font-bold text-text-primary">Business Opportunities</h2>
        <p className="text-sm text-text-muted mt-1">Data-driven demand gaps in your service area.</p>
      </header>

      <div className="flex flex-col gap-4">
        {opportunities.map(opp => (
          <Card 
            key={opp.id} 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate(`/distributor/opportunities/${opp.id}`)}
          >
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="eyebrow mb-0.5">{opp.category}</p>
                  <h4 className="font-bold text-base text-text-primary leading-tight">{opp.name}</h4>
                  {opp.area && (
                    <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                      <MapPin size={12} /> {opp.area}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <ScoreRing score={opp.score} tier={opp.tier} confidence={opp.confidence} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm bg-surface-muted p-2 rounded-md">
                <div>
                  <span className="text-text-muted text-xs block">Retailers asking</span>
                  <span className="font-semibold text-text-primary">{opp.retailerCount}</span>
                </div>
                <div>
                  <span className="text-text-muted text-xs block">Can fulfil today</span>
                  <span className="font-semibold text-text-primary">
                    {opp.supplierCount === 0
                      ? 'Koi supplier nahi'
                      : `${opp.availableSupplierCount} of ${opp.supplierCount} listing${opp.supplierCount === 1 ? '' : 's'}`}
                  </span>
                </div>
              </div>

              {/* A score never appears without the evidence behind it. */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={opp.tierVariant}>{opp.tier}</Badge>
                <span className="text-xs text-text-muted">
                  {opp.retailerCount} retailer signal{opp.retailerCount === 1 ? '' : 's'}
                </span>
              </div>

              {/* Generated from the evidence object and checked against it before
                  display, so it cannot state a figure the engine did not produce. */}
              <p className="text-sm text-text-secondary leading-snug">
                {opp.explanation?.text || opp.evidence?.summary || 'Opportunity detected based on local demand.'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
