import { useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { OptionCard } from '../../../../components/ui/OptionCard';

const DELIVERY_OPTIONS = [
  { id: 'own', label: 'Apni Delivery' },
  { id: 'staff', label: 'Delivery Staff' },
  { id: 'transport', label: 'Transport Partner' },
  { id: 'pickup', label: 'Retailer Pickup' },
  { id: 'multiple', label: 'Multiple Options' },
];

export function Delivery({ data, updateData, onNext }) {
  const [error, setError] = useState('');

  const toggleDelivery = (id) => {
    const current = data.deliveryCapabilities || [];
    const updated = current.includes(id) 
      ? current.filter(c => c !== id) 
      : [...current, id];
    
    updateData({ deliveryCapabilities: updated });
    if (updated.length > 0) setError('');
  };

  const validateAndNext = () => {
    if (!data.deliveryCapabilities || data.deliveryCapabilities.length === 0) {
      setError('Aap delivery kaise manage karte ho? (Select kam se kam ek)');
    } else {
      onNext();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="text-center mt-4">
        <h2 className="text-2xl font-bold text-text-primary">Aap delivery kaise manage karte ho?</h2>
      </div>

      <div className="flex flex-col gap-3">
        {DELIVERY_OPTIONS.map(opt => (
          <OptionCard
            key={opt.id}
            title={opt.label}
            selected={(data.deliveryCapabilities || []).includes(opt.id)}
            onClick={() => toggleDelivery(opt.id)}
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
