import { useState, useEffect } from 'react';
import { Store, MapPin, Wallet, ListChecks } from 'lucide-react';
import { Card, CardContent } from '../../../../components/ui/Card';

export function BusinessContextCard() {
  const [context, setContext] = useState({
    businessType: 'Kirana Store',
    location: 'Palampur Market, Kangra',
    budget: '₹10,000 – ₹25,000',
    requirements: 'Dairy products, cold drinks'
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexgram_retailer_onboarding');
      if (saved) {
        const parsed = JSON.parse(saved);
        setContext({
          businessType: parsed.businessType || context.businessType,
          location: parsed.location?.district && parsed.location?.area 
            ? `${parsed.location.area}, ${parsed.location.district}`
            : context.location,
          budget: parsed.investmentBudget || context.budget,
          requirements: parsed.requirements || context.requirements
        });
      }
    } catch (e) {
      console.error("Failed to parse onboarding local storage", e);
    }
  }, []);

  return (
    <Card className="bg-surface border-border">
      <CardContent className="p-4">
        <h3 className="font-bold text-md text-text-primary mb-3">Aapka Business</h3>
        
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-start gap-3">
            <Store size={16} className="text-text-muted mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-text-muted text-xs block">Business</span>
              <span className="font-semibold text-text-primary">{context.businessType}</span>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-text-muted mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-text-muted text-xs block">Location</span>
              <span className="font-semibold text-text-primary">{context.location}</span>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Wallet size={16} className="text-text-muted mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-text-muted text-xs block">Budget</span>
              <span className="font-semibold text-text-primary">{context.budget}</span>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <ListChecks size={16} className="text-text-muted mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-text-muted text-xs block">Requirements</span>
              <span className="font-semibold text-text-primary line-clamp-2">{context.requirements}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
