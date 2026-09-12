import { useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { OptionCard } from '../../../../components/ui/OptionCard';

const PURCHASE_RANGES = [
  { id: '<5k', label: '₹5,000 se kam' },
  { id: '5k-15k', label: '₹5,000 – ₹15,000' },
  { id: '15k-30k', label: '₹15,000 – ₹30,000' },
  { id: '30k-50k', label: '₹30,000 – ₹50,000' },
  { id: '>50k', label: '₹50,000+' },
];

const FREQUENCIES = [
  { id: 'daily', label: 'Daily' },
  { id: '2-3/week', label: '2–3 baar/week' },
  { id: 'weekly', label: 'Weekly' },
  { id: '2-3/month', label: '2–3 baar/month' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'as_needed', label: 'As needed' },
];

export function Purchasing({ data, updateData, onNext }) {
  const [error, setError] = useState('');
  
  // Local state to manage two questions on one logical screen step, 
  // but progressively revealed if we wanted, or just shown together since they are heavily related.
  // We will show them together to keep it simple, or split them.
  // The UX principle is "ONE QUESTION PER SCREEN wherever practical".
  // So let's split it visually using a sub-step or just show the second after the first is picked.
  const [showFrequency, setShowFrequency] = useState(!!data.monthlyPurchaseRange);

  const handleRangeSelect = (id) => {
    updateData({ monthlyPurchaseRange: id });
    setShowFrequency(true);
    setError('');
  };

  const handleFreqSelect = (id) => {
    updateData({ purchasingFrequency: id });
    setError('');
  };

  const validateAndNext = () => {
    if (!data.monthlyPurchaseRange) {
      setError('Please select monthly purchase range.');
      return;
    }
    if (!data.purchasingFrequency) {
      setError('Please select purchasing frequency.');
      return;
    }
    onNext();
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Aap roughly kitna monthly stock purchase karte ho?</h2>
        </div>
        <div className="flex flex-col gap-3">
          {PURCHASE_RANGES.map(range => (
            <OptionCard
              key={range.id}
              title={range.label}
              selected={data.monthlyPurchaseRange === range.id}
              onClick={() => handleRangeSelect(range.id)}
            />
          ))}
        </div>
      </div>

      {showFrequency && (
        <div className="flex flex-col gap-4 animate-fade-in border-t border-border pt-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-text-primary">Stock kitni baar purchase karte ho?</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {FREQUENCIES.map(freq => (
              <OptionCard
                key={freq.id}
                title={freq.label}
                selected={data.purchasingFrequency === freq.id}
                onClick={() => handleFreqSelect(freq.id)}
              />
            ))}
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <Button size="lg" fullWidth onClick={validateAndNext} className="mt-4" disabled={!data.monthlyPurchaseRange || !data.purchasingFrequency}>
        Aage Badho
      </Button>
    </div>
  );
}
