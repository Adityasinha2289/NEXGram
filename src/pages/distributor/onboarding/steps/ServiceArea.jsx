import { useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { OptionCard } from '../../../../components/ui/OptionCard';
import { Input } from '../../../../components/ui/Input';

const RADIUS_OPTIONS = [
  { id: '5km', label: '5 km' },
  { id: '10km', label: '10 km' },
  { id: '20km', label: '20 km' },
  { id: '30km', label: '30 km' },
  { id: '50km+', label: '50 km+' },
  { id: 'custom', label: 'Custom' },
];

export function ServiceArea({ data, updateData, onNext }) {
  const [error, setError] = useState('');

  const handleSelect = (id) => {
    updateData({ serviceRadius: id });
    setError('');
  };

  const handleCustomChange = (val) => {
    updateData({ customRadius: val });
    setError('');
  };

  const validateAndNext = () => {
    if (!data.serviceRadius) {
      setError('Aap apna service area select karein.');
    } else if (data.serviceRadius === 'custom' && !data.customRadius.trim()) {
      setError('Custom area define karein.');
    } else {
      onNext();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="text-center mt-4">
        <h2 className="text-2xl font-bold text-text-primary">Aap kitne area tak supply kar sakte ho?</h2>
      </div>

      <div className="flex flex-col gap-3">
        {RADIUS_OPTIONS.map(opt => (
          <OptionCard
            key={opt.id}
            title={opt.label}
            selected={data.serviceRadius === opt.id}
            onClick={() => handleSelect(opt.id)}
          />
        ))}

        {data.serviceRadius === 'custom' && (
          <div className="mt-2 animate-fade-in">
            <Input 
              label="Kitne km tak?" 
              placeholder="e.g. 15 km"
              type="number"
              value={data.customRadius}
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
