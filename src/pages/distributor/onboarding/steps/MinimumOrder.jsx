import { useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { OptionCard } from '../../../../components/ui/OptionCard';
import { Input } from '../../../../components/ui/Input';

const MIN_ORDER_RANGES = [
  { id: '<1k', label: '₹1,000 se kam' },
  { id: '1k-2.5k', label: '₹1,000 – ₹2,500' },
  { id: '2.5k-5k', label: '₹2,500 – ₹5,000' },
  { id: '5k-10k', label: '₹5,000 – ₹10,000' },
  { id: '>10k', label: '₹10,000+' },
  { id: 'custom', label: 'Custom' },
];

export function MinimumOrder({ data, updateData, onNext }) {
  const [error, setError] = useState('');

  const handleSelect = (id) => {
    updateData({ minimumOrderRange: id });
    setError('');
  };

  const handleCustomChange = (val) => {
    updateData({ customMinOrder: val });
    setError('');
  };

  const validateAndNext = () => {
    if (!data.minimumOrderRange) {
      setError('Aapka minimum order approx kitna hota hai?');
    } else if (data.minimumOrderRange === 'custom' && !data.customMinOrder.trim()) {
      setError('Custom amount enter karein.');
    } else {
      onNext();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="text-center mt-4">
        <h2 className="text-2xl font-bold text-text-primary">Aapka minimum order approx kitna hota hai?</h2>
      </div>

      <div className="flex flex-col gap-3">
        {MIN_ORDER_RANGES.map(range => (
          <OptionCard
            key={range.id}
            title={range.label}
            selected={data.minimumOrderRange === range.id}
            onClick={() => handleSelect(range.id)}
          />
        ))}

        {data.minimumOrderRange === 'custom' && (
          <div className="mt-2 animate-fade-in">
            <Input 
              label="Approx amount (₹)" 
              placeholder="e.g. 15000"
              type="number"
              value={data.customMinOrder}
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
