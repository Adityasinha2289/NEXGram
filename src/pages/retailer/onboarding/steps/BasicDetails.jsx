import { useState } from 'react';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { Card, CardContent } from '../../../../components/ui/Card';

export function BasicDetails({ data, updateData, onNext }) {
  const [errors, setErrors] = useState({});

  const validateAndNext = () => {
    const newErrors = {};
    if (!data.name.trim()) newErrors.name = 'Naam zaroori hai';
    if (!data.mobile.trim() || data.mobile.length < 10) newErrors.mobile = 'Sahi mobile number daalein';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
    } else {
      setErrors({});
      onNext();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold leading-tight text-text-primary">Sabse pehle, aapke baare mein</h2>
        <p className="mt-1.5 text-sm leading-snug text-text-muted">Apni basic details confirm karein</p>
      </div>

      <Card className="border-border">
        <CardContent className="flex flex-col gap-4 p-6">
          <Input 
            label="Aapka Naam" 
            placeholder="e.g. Ramesh Kumar"
            value={data.name}
            onChange={(e) => updateData({ name: e.target.value })}
            error={errors.name}
          />
          <Input 
            label="Mobile Number" 
            placeholder="9876543210"
            type="tel"
            value={data.mobile}
            onChange={(e) => updateData({ mobile: e.target.value })}
            error={errors.mobile}
          />
        </CardContent>
      </Card>

      <Button size="lg" fullWidth onClick={validateAndNext} className="mt-4">
        Aage Badho
      </Button>
    </div>
  );
}
