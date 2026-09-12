import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { KeyValue } from '../../../../components/ui/List';

const rupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

function budgetRange(budget) {
  if (budget?.max) return `${rupees(budget.min || 0)} – ${rupees(budget.max)}`;
  if (budget?.min) return `${rupees(budget.min)}+`;
  return 'Set nahi kiya';
}

/**
 * What the plan costs, against what the shop said it could spend.
 *
 * The per-product reasons used to be repeated here in a second list. They live
 * on the product rows now, where the thing being explained is: saying it twice
 * made the page longer without making it clearer.
 */
export function PackSummary({ packItems, totalEstimatedPrice, budget, budgetStatus }) {
  const isOverBudget = budgetStatus === 'Over budget';

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 border-b border-border bg-surface-muted px-4 py-3">
        <div>
          <p className="eyebrow">Estimated total</p>
          <p
            className={`num mt-0.5 text-xl font-bold leading-none ${
              isOverBudget ? 'text-danger' : 'text-text-primary'
            }`}
          >
            {rupees(totalEstimatedPrice)}
          </p>
        </div>
        <Badge variant={isOverBudget ? 'danger' : 'success'}>
          {isOverBudget ? <AlertCircle size={11} /> : <CheckCircle2 size={11} />}
          {budgetStatus}
        </Badge>
      </div>

      <dl className="divide-y divide-border px-4">
        <KeyValue label="Products" value={packItems.length} />
        <KeyValue label="Aapka budget" value={budgetRange(budget)} />
      </dl>

      <p className="flex items-start gap-2 border-t border-border bg-warning-bg px-4 py-2.5 text-2xs leading-snug text-text-secondary">
        <Info size={13} className="mt-px flex-shrink-0 text-warning" strokeWidth={2.25} />
        Final price distributor ke hisaab se badal sakta hai. Yeh sirf estimate hai.
      </p>
    </div>
  );
}
