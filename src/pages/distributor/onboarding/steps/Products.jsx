import { useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { OptionCard } from '../../../../components/ui/OptionCard';

const PRODUCT_CATEGORIES = [
  { id: 'dairy', label: 'Dairy' },
  { id: 'staples', label: 'Staples' },
  { id: 'snacks', label: 'Snacks' },
  { id: 'beverages', label: 'Beverages' },
  { id: 'spices', label: 'Spices' },
  { id: 'personal_care', label: 'Personal Care' },
  { id: 'household', label: 'Household' },
  { id: 'agri', label: 'Agriculture / Rural Products' },
  { id: 'other', label: 'Other' },
];

export function Products({ data, updateData, onNext }) {
  const [error, setError] = useState('');

  const toggleCategory = (id) => {
    const current = data.productCategories || [];
    const updated = current.includes(id) 
      ? current.filter(c => c !== id) 
      : [...current, id];
    
    updateData({ productCategories: updated });
    if (updated.length > 0) setError('');
  };

  const validateAndNext = () => {
    if (!data.productCategories || data.productCategories.length === 0) {
      setError('Kam se kam ek product category select karein.');
    } else {
      onNext();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="text-center mt-4">
        <h2 className="text-2xl font-bold text-text-primary">Aap kaunse products supply karte ho?</h2>
        <p className="text-text-muted mt-2">Aap multiple options select kar sakte hain</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {PRODUCT_CATEGORIES.map(category => (
          <OptionCard
            key={category.id}
            title={category.label}
            selected={(data.productCategories || []).includes(category.id)}
            onClick={() => toggleCategory(category.id)}
            multiSelect
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
