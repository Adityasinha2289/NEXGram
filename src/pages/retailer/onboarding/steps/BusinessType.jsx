import { useState } from 'react';
import { Store, Milk, Utensils, Pill, Shirt, ShoppingBag, PlusCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { OptionCard } from '../../../../components/ui/OptionCard';

const BUSINESS_TYPES = [
  { id: 'kirana', label: 'Kirana', icon: Store },
  { id: 'dairy', label: 'Dairy', icon: Milk },
  { id: 'restaurant', label: 'Restaurant / Dhaba', icon: Utensils },
  { id: 'pharmacy', label: 'Pharmacy', icon: Pill },
  { id: 'clothing', label: 'Clothing', icon: Shirt },
  { id: 'general', label: 'General Retail', icon: ShoppingBag },
  { id: 'other', label: 'Other', icon: PlusCircle },
];

export function BusinessType({ data, updateData, onNext }) {
  const [error, setError] = useState('');

  const handleSelect = (id) => {
    updateData({ businessType: id });
    setError('');
  };

  const validateAndNext = () => {
    if (!data.businessType) {
      setError('Aapka business type select karein.');
    } else {
      onNext();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold leading-tight text-text-primary">Aap kis type ka business chalate ho?</h2>
      </div>

      <div className="flex flex-col gap-3">
        {BUSINESS_TYPES.map(type => (
          <OptionCard
            key={type.id}
            title={type.label}
            icon={type.icon}
            selected={data.businessType === type.id}
            onClick={() => handleSelect(type.id)}
          />
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <Button size="lg" fullWidth onClick={validateAndNext} className="mt-4">
        Aage Badho
      </Button>
    </div>
  );
}
