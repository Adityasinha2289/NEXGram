import { Target, Users, MapPin } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { MOCK_USER, MOCK_OPPORTUNITIES } from '../../data/mockData';

export function DistributorDashboard() {
  const { name, location, radius, activeSignals } = MOCK_USER.distributor;
  const opportunities = MOCK_OPPORTUNITIES;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold">Namaste, {name}!</h2>
        <div className="flex items-center gap-1 text-sm text-muted mt-1">
          <MapPin size={16} />
          <span>{location} (Radius: {radius})</span>
        </div>
      </header>

      <div className="flex gap-4">
        <Card className="flex-1 bg-surface border-border">
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
            <Users className="text-primary" size={24} />
            <div className="text-center">
              <p className="text-xs text-muted">Retailers</p>
              <p className="text-xl font-bold text-primary">124</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="flex-1 bg-surface border-border">
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
            <Target className="text-secondary" size={24} />
            <div className="text-center">
              <p className="text-xs text-muted">Active Signals</p>
              <p className="text-xl font-bold text-secondary">{activeSignals}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Local Opportunities</h3>
          <Button variant="ghost" size="sm">Sab Dekho</Button>
        </div>
        
        {opportunities.length > 0 ? (
          <div className="flex flex-col gap-4">
            {opportunities.map(opp => (
              <Card key={opp.id} interactive className="border-l-4 border-l-secondary">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-md leading-tight">{opp.title}</h4>
                    <Badge variant="secondary">
                      {opp.type === 'demand' ? 'Demand' : 'Scheme'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted mb-4">{opp.description}</p>
                  <Button variant="outline" size="sm" fullWidth>Action Lein</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState 
            title="Koi Signal Nahi Hai" 
            description="Abhi koi nayi opportunity available nahi hai." 
          />
        )}
      </section>
    </div>
  );
}
