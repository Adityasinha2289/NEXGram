import { useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { OptionCard } from '../../../../components/ui/OptionCard';
import { Input } from '../../../../components/ui/Input';

const UNMET_CATEGORIES = [
  { id: 'premium_dairy', label: 'Premium Dairy (Cheese, Butter)' },
  { id: 'frozen', label: 'Frozen Foods' },
  { id: 'local_snacks', label: 'Local / Regional Snacks' },
  { id: 'hygiene', label: 'Hygiene & Sanitary' },
  { id: 'beverages', label: 'Specific Beverages' },
];

export function UnmetDemand({ data, updateData, onNext }) {
  const [error, setError] = useState('');

  const unmetNeeds = data.unmetNeeds || { categories: [], other: '' };

  const toggleCategory = (id) => {
    const current = unmetNeeds.categories || [];
    const updated = current.includes(id) 
      ? current.filter(c => c !== id) 
      : [...current, id];
    
    updateData({ unmetNeeds: { ...unmetNeeds, categories: updated } });
    setError('');
  };

  const handleOtherChange = (val) => {
    updateData({ unmetNeeds: { ...unmetNeeds, other: val } });
    setError('');
  };

  const validateAndNext = () => {
    if (unmetNeeds.categories.length === 0 && !unmetNeeds.other.trim()) {
      setError('Kam se kam ek option select karein ya likhein.');
    } else {
      onNext();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="text-center mt-4">
        <h2 className="text-2xl font-bold text-text-primary">Aisi kaunsi cheez hai jo customers maangte hain but aapke paas usually nahi hoti?</h2>
        <p className="text-text-muted mt-2">Yeh humein naye suppliers dhoondhne mein madad karega.</p>
      </div>

      <div className="flex flex-col gap-3">
        {UNMET_CATEGORIES.map(category => (
          <OptionCard
            key={category.id}
            title={category.label}
            selected={(unmetNeeds.categories || []).includes(category.id)}
            onClick={() => toggleCategory(category.id)}
            multiSelect
          />
        ))}
        
        <div className="mt-2">
          <Input 
            label="Koi aur item? (Other)" 
            placeholder="E.g. imported chocolates, specific brand..."
            value={unmetNeeds.other}
            onChange={(e) => handleOtherChange(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-danger text-sm text-center">{error}</p>}

      <Button size="lg" fullWidth onClick={validateAndNext} className="mt-4">
        Aage Badho
      </Button>
    </div>
  );
}
