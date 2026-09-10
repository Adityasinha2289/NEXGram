import { Store, MapPin, Truck, Box } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';

export function DistributorCard({ distributor, packMatchCount, totalPackItems }) {
  const navigate = useNavigate();

  // Determine badge styling based on match ratio
  let matchBadgeVariant = 'neutral';
  let matchBadgeLabel = 'Catalogue Dekhiye';

  if (totalPackItems > 0) {
    const matchRatio = packMatchCount / totalPackItems;
    if (matchRatio === 1) {
      matchBadgeVariant = 'success';
      matchBadgeLabel = 'Pack Ready';
    } else if (matchRatio >= 0.5) {
      matchBadgeVariant = 'primary';
      matchBadgeLabel = 'Mostly Available';
    } else if (matchRatio > 0) {
      matchBadgeVariant = 'warning';
      matchBadgeLabel = 'Limited';
    } else {
      matchBadgeVariant = 'neutral';
      matchBadgeLabel = 'No Pack Match';
    }
  }

  return (
    <Card className="border-border hover:border-primary/30 transition-colors shadow-sm">
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0">
              <Store size={20} className="text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-text-primary leading-tight">{distributor.name}</h4>
              <p className="text-xs text-text-muted mt-0.5">{distributor.categories.join(' • ')}</p>
            </div>
          </div>
          {totalPackItems > 0 && (
            <Badge variant={matchBadgeVariant} className="flex-shrink-0">{matchBadgeLabel}</Badge>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs mt-2 border-t border-border pt-3">
          <div className="flex items-center gap-1.5 text-text-primary font-medium">
            <MapPin size={14} className="text-text-muted" />
            <span>{distributor.distance}</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-primary font-medium">
            <Truck size={14} className="text-text-muted" />
            <span>{distributor.deliveryTime}</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-primary font-medium">
            <Box size={14} className="text-text-muted" />
            <span>Min: ₹{distributor.minimumOrder.toLocaleString('en-IN')}</span>
          </div>
          {totalPackItems > 0 && (
            <div className="flex items-center gap-1.5 font-bold text-primary">
              <span>{packMatchCount}/{totalPackItems} products available</span>
            </div>
          )}
        </div>

        {/* CTA */}
        <Button 
          variant="secondary" 
          fullWidth 
          className="mt-2"
          onClick={() => navigate(`/retailer/distributors/${distributor.id}`)}
        >
          Catalogue Dekho
        </Button>
      </CardContent>
    </Card>
  );
}
