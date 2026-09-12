import { ListChecks, MapPin, Store, Wallet } from 'lucide-react';
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

/**
 * The inputs the plan was computed from.
 *
 * Kept flat and compact: this is the footnote that makes the plan above it
 * credible, not a section competing with it for attention.
 */
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
    <dl className="panel grid gap-px overflow-hidden bg-border sm:grid-cols-2">
      {rows.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-start gap-2.5 bg-surface px-4 py-3">
          <Icon size={15} className="mt-0.5 flex-shrink-0 text-text-muted" strokeWidth={2} />
          <div className="min-w-0">
            <dt className="eyebrow">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium leading-snug text-text-primary">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
