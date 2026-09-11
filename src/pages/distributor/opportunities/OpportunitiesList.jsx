import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, PackageOpen, AlertCircle, Search } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { fetchApi } from '../../../services/api/client';

export function OpportunitiesList() {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        setLoading(true);
        // GET /api/intelligence/opportunities
        const res = await fetchApi('/intelligence/opportunities');
        setOpportunities(res || []);
      } catch (err) {
        console.error("Failed to load opportunities:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOpportunities();
  }, []);

  if (loading) {
    return <div className="p-4 text-center text-text-muted">Loading opportunities...</div>;
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

  const getOppBadge = (score) => {
    if (score >= 80) return <Badge variant="success">Strong</Badge>;
    if (score >= 65) return <Badge variant="primary">Good</Badge>;
    if (score >= 45) return <Badge variant="warning">Moderate</Badge>;
    return <Badge variant="default">Low</Badge>;
  };

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
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-text-muted uppercase font-bold tracking-wider mb-0.5">
                    {opp.category_id || "Category"}
                  </p>
                  <h4 className="font-bold text-md text-text-primary leading-tight">
                    {opp.product_id ? opp.product_id.toUpperCase() : (opp.category_id ? opp.category_id.toUpperCase() : "Opportunity")}
                  </h4>
                </div>
                {getOppBadge(opp.opportunity_score)}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm bg-surface-muted p-2 rounded-md">
                <div>
                  <span className="text-text-muted text-xs block">Retailers Demand</span>
                  <span className="font-semibold text-text-primary">{opp.potential_retailer_count}</span>
                </div>
                <div>
                  <span className="text-text-muted text-xs block">Competition</span>
                  <span className="font-semibold text-text-primary">{opp.supply_score} local suppliers</span>
                </div>
              </div>
              
              <p className="text-sm text-text-muted italic line-clamp-1">
                {opp.evidence_json?.summary || "Opportunity detected based on local demand."}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
