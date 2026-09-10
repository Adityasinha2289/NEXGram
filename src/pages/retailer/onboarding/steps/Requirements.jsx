import { useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { OptionCard } from '../../../../components/ui/OptionCard';

const REQUIREMENTS = [
  { id: 'inventory', label: 'Inventory / Stock' },
  { id: 'new_products', label: 'New Products' },
  { id: 'equipment', label: 'Equipment (Fridge, Racks)' },
  { id: 'expansion', label: 'Shop Expansion' },
  { id: 'working_capital', label: 'Working Capital' },
  { id: 'other', label: 'Other' },
];

const SUPPLIERS = [
  { id: 'distributor', label: 'Nearby Distributor' },
  { id: 'wholesale', label: 'Wholesale Market' },
  { id: 'direct', label: 'Company / Direct Supplier' },
  { id: 'multiple', label: 'Multiple Suppliers' },
];

export function Requirements({ data, updateData, onNext }) {
  const [error, setError] = useState('');

  const toggleRequirement = (id) => {
    const current = data.requirements || [];
    const updated = current.includes(id) 
      ? current.filter(c => c !== id) 
      : [...current, id];
    
    updateData({ requirements: updated });
    if (updated.length > 0) setError('');
  };

  const handleSupplierSelect = (id) => {
    updateData({ existingSupplierType: id });
  };

  const validateAndNext = () => {
    if (!data.requirements || data.requirements.length === 0) {
      setError('Aapko abhi sabse zyada kis cheez ki zarurat hai? (Select at least one)');
    } else {
      onNext();
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="flex flex-col gap-4">
        <div className="text-center mt-4">
          <h2 className="text-xl font-bold text-text-primary">Aapko abhi business mein kis cheez ki sabse zyada zarurat hai?</h2>
        </div>

        <div className="flex flex-col gap-3">
          {REQUIREMENTS.map(req => (
            <OptionCard
              key={req.id}
              title={req.label}
              selected={(data.requirements || []).includes(req.id)}
              onClick={() => toggleRequirement(req.id)}
              multiSelect
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-text-primary">Abhi aap stock kahan se lete ho? <span className="text-text-muted text-sm font-normal">(Optional)</span></h2>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {SUPPLIERS.map(sup => (
            <OptionCard
              key={sup.id}
              title={sup.label}
              selected={data.existingSupplierType === sup.id}
              onClick={() => handleSupplierSelect(sup.id)}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-danger text-sm text-center">{error}</p>}

      <Button size="lg" fullWidth onClick={validateAndNext} className="mt-4">
        Profile Complete Karo
      </Button>
    </div>
  );
}
