import { Store, MapPin, Wallet, ListChecks } from 'lucide-react';
import { Card, CardContent } from '../../../../components/ui/Card';
import { useAuth } from '../../../../context/AuthContext';

/** "10000-25000" -> "₹10,000 – ₹25,000" */
function formatBudget(raw) {
  if (!raw) return 'Set nahi kiya';
  const numbers = String(raw).match(/\d+/g);
  if (!numbers) return raw;
  const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
  if (String(raw).toLowerCase().startsWith('under')) return `${rupees(numbers[0])} tak`;
  if (numbers.length === 1) return `${rupees(numbers[0])}+`;
  return `${rupees(numbers[0])} – ${rupees(numbers[1])}`;
}

export function BusinessContextCard() {
  const { profile } = useAuth();
  const data = profile?.profile_data || {};

  // Derived during render. This used to run in an effect that also depended on
  // its own output, which put the page in an infinite render loop.
  const context = {
    businessType: data.businessType || 'Profile adhura hai',
    location: data.location?.area && data.location?.district
      ? `${data.location.area}, ${data.location.district}`
      : 'Location set nahi hai',
    budget: formatBudget(data.investmentBudget),
    // requirements is an array; rendering it raw concatenated the entries.
    requirements: Array.isArray(data.requirements) && data.requirements.length
      ? data.requirements.join(', ')
      : 'Koi specific requirement nahi',
  };

  const rows = [
    { icon: Store, label: 'Business', value: context.businessType },
    { icon: MapPin, label: 'Location', value: context.location },
    { icon: Wallet, label: 'Budget', value: context.budget },
    { icon: ListChecks, label: 'Requirements', value: context.requirements },
  ];

  return (
    <Card className="bg-surface border-border">
      <CardContent className="p-4">
        <h3 className="font-bold text-md text-text-primary mb-3">Aapka Business</h3>
        <dl className="flex flex-col gap-3">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon size={16} className="text-text-muted flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <dt className="text-xs text-text-muted">{label}</dt>
                <dd className="font-semibold text-text-primary text-sm">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
