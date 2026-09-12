import { useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { OptionCard } from '../../../../components/ui/OptionCard';

const DEMAND_CATEGORIES = [
  { id: 'dairy', label: 'Dairy Products' },
  { id: 'staples', label: 'Staples (Atta, Dal, Rice)' },
  { id: 'snacks', label: 'Snacks & Namkeen' },
  { id: 'beverages', label: 'Beverages (Cold Drinks, Tea, Coffee)' },
  { id: 'personal_care', label: 'Personal Care (Soap, Shampoo)' },
  { id: 'household', label: 'Household (Detergent, Cleaners)' },
  { id: 'spices', label: 'Spices & Masale' },
  { id: 'other', label: 'Other' },
];

export function Demand({ data, updateData, onNext }) {
  const [error, setError] = useState('');

  const toggleCategory = (id) => {
    const current = data.demandedCategories || [];
    const updated = current.includes(id) 
      ? current.filter(c => c !== id) 
      : [...current, id];
    
    updateData({ demandedCategories: updated });
    if (updated.length > 0) setError('');
  };

  const validateAndNext = () => {
    if (!data.demandedCategories || data.demandedCategories.length === 0) {
      setError('Kam se kam ek category select karein.');
    } else {
      onNext();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold leading-tight text-text-primary">Aapke customers sabse zyada kya maangte hain?</h2>
        <p className="mt-1.5 text-sm leading-snug text-text-muted">Aap multiple options select kar sakte hain</p>
      </div>

      <div className="flex flex-col gap-3">
        {DEMAND_CATEGORIES.map(category => (
          <OptionCard
            key={category.id}
            title={category.label}
            selected={(data.demandedCategories || []).includes(category.id)}
            onClick={() => toggleCategory(category.id)}
            multiSelect
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
