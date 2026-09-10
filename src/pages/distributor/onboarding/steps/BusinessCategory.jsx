import { useState } from 'react';
import { Package, Milk, Coffee, ShoppingBag, Droplet, Home, Tractor, Truck, PlusCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { OptionCard } from '../../../../components/ui/OptionCard';

const CATEGORIES = [
  { id: 'fmcg', label: 'FMCG Distribution', icon: Package },
  { id: 'dairy', label: 'Dairy', icon: Milk },
  { id: 'fnb', label: 'Food & Beverages', icon: Coffee },
  { id: 'grocery', label: 'Grocery / Staples', icon: ShoppingBag },
  { id: 'personal_care', label: 'Personal Care', icon: Droplet },
  { id: 'household', label: 'Household', icon: Home },
  { id: 'agri', label: 'Agriculture / Rural Products', icon: Tractor },
  { id: 'general', label: 'General Distribution', icon: Truck },
  { id: 'other', label: 'Other', icon: PlusCircle },
];

export function BusinessCategory({ data, updateData, onNext }) {
  const [error, setError] = useState('');

  const handleSelect = (id) => {
    updateData({ businessCategory: id });
    setError('');
  };

  const validateAndNext = () => {
    if (!data.businessCategory) {
      setError('Business category select karein.');
    } else {
      onNext();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="text-center mt-4">
        <h2 className="text-2xl font-bold text-text-primary">Aap kis type ka business karte ho?</h2>
      </div>

      <div className="flex flex-col gap-3">
        {CATEGORIES.map(cat => (
          <OptionCard
            key={cat.id}
            title={cat.label}
            icon={cat.icon}
            selected={data.businessCategory === cat.id}
            onClick={() => handleSelect(cat.id)}
          />
        ))}
      </div>

      {error && <p className="text-danger text-sm text-center">{error}</p>}

      <Button size="lg" fullWidth onClick={validateAndNext} className="mt-4">
        Aage Badho
      </Button>
    </div>
  );
}
