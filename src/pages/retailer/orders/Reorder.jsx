import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Check, Clock } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { intelligenceApi } from '../../../services/api/intelligenceApi';

export function Reorder() {
  const navigate = useNavigate();
  const [reorderItems, setReorderItems] = useState([]);
  const [addedIds, setAddedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reorder candidates come from this shop's real order history, with the
  // cadence measured from the gaps between their own past purchases.
  const load = () => {
    setIsLoading(true);
    setError(null);
    intelligenceApi.getReorderSuggestions()
      .then(setReorderItems)
      .catch(err => setError(err.message || 'Reorder list load nahi hui'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const handleAddToPack = (item) => {
    if (addedIds.includes(item.id)) return;
    setAddedIds(prev => [...prev, item.id]);
    navigate(`/retailer/distributors/${item.distributorId}`);
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState description={error} onRetry={load} />;

  return (
    <div className="flex flex-col gap-5 pb-6 animate-fade-in">
      <header>
        <h2 className="text-2xl font-bold text-text-primary leading-tight">Quick Reorder</h2>
        <p className="text-sm text-text-muted mt-1">Aapke pehle mangwaye gaye products wapas pack mein add karein.</p>
      </header>

      {reorderItems.length === 0 ? (
        <EmptyState 
          icon={Package}
          title="Koi past order nahi" 
          description="Aapne abhi tak koi order complete nahi kiya hai." 
          actionLabel="Products Dekho"
          onAction={() => navigate('/retailer/distributors')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {reorderItems.map((item, index) => {
            const inPack = addedIds.includes(item.id);
            return (
              <Card key={`${item.id}-${index}`} className={`border-border ${inPack ? 'bg-primary/5 border-primary/20' : ''}`}>
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-base text-text-primary">
                        {item.name} <span className="text-text-muted font-medium text-sm">{item.variant}</span>
                      </h4>
                      <p className="text-xs text-text-muted mt-0.5">Supplier: {item.distributorName}</p>
                      {item.dueNow && <Badge variant="warning" className="mt-1.5 text-2xs">Due now</Badge>}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-primary block">₹{item.price}</span>
                      <span className="text-2xs text-text-muted">/ {item.unit}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1 pt-3 border-t border-border">
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <Clock size={12} /> {item.suggestion}
                    </span>
                    
                    <Button 
                      variant={inPack ? "ghost" : "outline"} 
                      size="sm" 
                      icon={inPack ? Check : Plus}
                      onClick={() => handleAddToPack(item)}
                      disabled={inPack}
                      className={inPack ? "text-success border-success/20 bg-success/5" : ""}
                    >
                      {inPack ? "Khula" : "Order Karo"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
}
