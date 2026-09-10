import { useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { OptionCard } from '../../../../components/ui/OptionCard';

const INVESTMENT_BUDGETS = [
  { id: '<10k', label: '₹10,000 se kam' },
  { id: '10k-25k', label: '₹10,000 – ₹25,000' },
  { id: '25k-50k', label: '₹25,000 – ₹50,000' },
  { id: '50k-1lakh', label: '₹50,000 – ₹1 lakh' },
  { id: '>1lakh', label: '₹1 lakh+' },
];

export function Investment({ data, updateData, onNext }) {
  const [error, setError] = useState('');

  const handleSelect = (id) => {
    updateData({ investmentBudget: id });
    setError('');
  };

  const validateAndNext = () => {
    if (!data.investmentBudget) {
      setError('Aapka investment budget select karein.');
    } else {
      onNext();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="text-center mt-4">
        <h2 className="text-2xl font-bold text-text-primary">Aap abhi stock ya business expansion mein approx kitna invest kar sakte ho?</h2>
      </div>

      <div className="flex flex-col gap-3">
        {INVESTMENT_BUDGETS.map(budget => (
          <OptionCard
            key={budget.id}
            title={budget.label}
            selected={data.investmentBudget === budget.id}
            onClick={() => handleSelect(budget.id)}
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
