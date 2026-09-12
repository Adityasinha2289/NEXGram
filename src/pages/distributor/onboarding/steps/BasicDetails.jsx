import { useState } from 'react';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { Card, CardContent } from '../../../../components/ui/Card';

export function BasicDetails({ data, updateData, onNext }) {
  const [errors, setErrors] = useState({});

  const validateAndNext = () => {
    const newErrors = {};
    if (!data.contactName.trim()) newErrors.contactName = 'Aapka naam zaroori hai';
    if (!data.businessName.trim()) newErrors.businessName = 'Business ka naam zaroori hai';
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
        <h2 className="text-xl font-bold leading-tight text-text-primary">Aapke business ke baare mein thoda samajhte hain</h2>
        <p className="mt-1.5 text-sm leading-snug text-text-muted">Apni details confirm karein</p>
      </div>

      <Card className="border-border">
        <CardContent className="flex flex-col gap-4 p-6">
          <Input 
            label="Aapka Naam (Contact Person)" 
            placeholder="e.g. Suresh Kumar"
            value={data.contactName}
            onChange={(e) => updateData({ contactName: e.target.value })}
            error={errors.contactName}
          />
          <Input 
            label="Business ka Naam" 
            placeholder="e.g. Suresh Traders"
            value={data.businessName}
            onChange={(e) => updateData({ businessName: e.target.value })}
            error={errors.businessName}
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
