import { useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { OptionCard } from '../../../../components/ui/OptionCard';

const COVERAGE_RANGES = [
  { id: '0', label: 'Abhi start kar raha hoon' },
  { id: '1-10', label: '1–10 retailers' },
  { id: '10-25', label: '10–25 retailers' },
  { id: '25-50', label: '25–50 retailers' },
  { id: '50-100', label: '50–100 retailers' },
  { id: '100+', label: '100+ retailers' },
];

export function RetailerCoverage({ data, updateData, onNext }) {
  const [error, setError] = useState('');

  const handleSelect = (id) => {
    updateData({ retailerCoverage: id });
    setError('');
  };

  const validateAndNext = () => {
    if (!data.retailerCoverage) {
      setError('Aap apna retailer coverage select karein.');
    } else {
      onNext();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold leading-tight text-text-primary">Abhi approx kitne retailers ko supply karte ho?</h2>
        <p className="mt-1.5 text-sm leading-snug text-text-muted">Yeh data aapko nayi business opportunities suggest karne mein madad karega.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {COVERAGE_RANGES.map(range => (
          <OptionCard
            key={range.id}
            title={range.label}
            selected={data.retailerCoverage === range.id}
            onClick={() => handleSelect(range.id)}
          />
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <Button size="lg" fullWidth onClick={validateAndNext} className="mt-4">
        Profile Complete Karo
      </Button>
    </div>
  );
}
