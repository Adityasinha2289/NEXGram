import { useNavigate } from 'react-router-dom';
import { Box, MapPin, Store, Truck } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Card } from '../../../../components/ui/Card';

const rupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

function matchLabel(packMatchCount, totalPackItems) {
  if (!totalPackItems) return null;
  const ratio = packMatchCount / totalPackItems;
  if (ratio === 1) return { variant: 'success', label: 'Pura pack' };
  if (ratio >= 0.5) return { variant: 'primary', label: 'Zyadatar mil jayega' };
  if (ratio > 0) return { variant: 'warning', label: 'Kuch hi milega' };
  return { variant: 'neutral', label: 'Pack se match nahi' };
}

export function DistributorCard({ distributor, packMatchCount, totalPackItems }) {
  const navigate = useNavigate();
  const match = matchLabel(packMatchCount, totalPackItems);

  // A minimum order of zero is not a minimum order. Printing "Min Rs 0" on
  // every card filled a column with a fact that was never true.
  const facts = [
    { icon: MapPin, value: distributor.distance },
    { icon: Truck, value: distributor.deliveryTime },
    distributor.minimumOrder > 0
      ? { icon: Box, value: `Min ${rupees(distributor.minimumOrder)}` }
      : null,
  ].filter((fact) => fact && fact.value && fact.value !== 'N/A');

  return (
    <Card
      interactive
      className="cursor-pointer p-4"
      onClick={() => navigate(`/retailer/distributors/${distributor.id}`)}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-primary-light text-primary">
          <Store size={17} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-tight text-text-primary">
            {distributor.name}
          </h3>
          <p className="mt-0.5 truncate text-2xs text-text-muted">
            {distributor.categories.join(' · ')}
          </p>
        </div>
        {match && <Badge variant={match.variant} dot>{match.label}</Badge>}
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-3">
        {facts.map((fact) => (
          <div key={fact.value} className="flex items-center gap-1.5 text-2xs text-text-secondary">
            <fact.icon size={12} className="flex-shrink-0 text-text-muted" strokeWidth={2} />
            <dd className="num">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {/* Only when there is a match to report — the badge already says when
          there is not, and repeating "0/6" under it says it twice. */}
      {totalPackItems > 0 && packMatchCount > 0 && (
        <p className="num mt-2 text-2xs font-medium text-primary">
          Aapke pack ke {packMatchCount}/{totalPackItems} products yahaan milte hain
        </p>
      )}
    </Card>
  );
}
