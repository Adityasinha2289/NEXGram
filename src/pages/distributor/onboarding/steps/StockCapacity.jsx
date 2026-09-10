import { useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { OptionCard } from '../../../../components/ui/OptionCard';
import { Input } from '../../../../components/ui/Input';

const CAPACITY_LEVELS = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
  { id: 'very_large', label: 'Very Large' },
  { id: 'custom', label: 'Custom / Describe' },
];

export function StockCapacity({ data, updateData, onNext }) {
  const [error, setError] = useState('');

  const handleSelect = (id) => {
    updateData({ stockCapacity: { ...data.stockCapacity, level: id } });
    setError('');
  };

  const handleCustomChange = (val) => {
    updateData({ stockCapacity: { ...data.stockCapacity, customDescription: val } });
    setError('');
  };

  const validateAndNext = () => {
    if (!data.stockCapacity.level) {
      setError('Stock capacity select karein.');
    } else if (data.stockCapacity.level === 'custom' && !data.stockCapacity.customDescription.trim()) {
      setError('Details describe karein.');
    } else {
      onNext();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="text-center mt-4">
        <h2 className="text-2xl font-bold text-text-primary">Aap approx kitna stock handle kar sakte ho?</h2>
      </div>

      <div className="flex flex-col gap-3">
        {CAPACITY_LEVELS.map(level => (
          <OptionCard
            key={level.id}
            title={level.label}
            selected={data.stockCapacity.level === level.id}
            onClick={() => handleSelect(level.id)}
          />
        ))}

        {data.stockCapacity.level === 'custom' && (
          <div className="mt-2 animate-fade-in">
            <Input 
              label="Describe capacity" 
              placeholder="e.g. Approx 500 kg dairy products"
              value={data.stockCapacity.customDescription}
              onChange={(e) => handleCustomChange(e.target.value)}
            />
          </div>
        )}
      </div>

      {error && <p className="text-danger text-sm text-center">{error}</p>}

      <Button size="lg" fullWidth onClick={validateAndNext} className="mt-4">
        Aage Badho
      </Button>
    </div>
  );
}
