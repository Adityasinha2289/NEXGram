import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { loansApi } from '../../../services/api/loansApi';

const rupees = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;

const TENURES = [12, 24, 36, 48, 60];

/**
 * Applying against one scheme.
 *
 * The EMI updates as the amount and tenure change, because the monthly number
 * is the one a shopkeeper actually decides on — a principal tells them nothing
 * about whether they can afford it. It is computed server-side and labelled as
 * indicative throughout: the rate is the bank's to set, and a figure presented
 * as fact here is one somebody budgets their year around.
 */
export function ApplyForm({ scheme, defaultAmount, onClose, onApplied }) {
  const [amount, setAmount] = useState(
    String(defaultAmount || scheme.minAmount || 25000),
  );
  const [tenure, setTenure] = useState(24);
  const [purpose, setPurpose] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const numericAmount = Number(amount);
  const withinBand =
    numericAmount > 0
    && (!scheme.minAmount || numericAmount >= scheme.minAmount)
    && (!scheme.maxAmount || numericAmount <= scheme.maxAmount);

  // Debounced: the amount field is typed digit by digit, and one request per
  // keystroke is real money on the connection this app is built for.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!withinBand) {
        if (!cancelled) setEstimate(null);
        return;
      }
      loansApi.getEstimate({
        scheme_id: scheme.id,
        amount: numericAmount,
        tenure_months: tenure,
      })
        .then((res) => { if (!cancelled) setEstimate(res); })
        .catch(() => { if (!cancelled) setEstimate(null); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [scheme.id, numericAmount, tenure, withinBand]);

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await loansApi.apply({
        scheme_id: scheme.id,
        amount: numericAmount,
        tenure_months: tenure,
        purpose: purpose.trim() || undefined,
      });
      onApplied?.();
    } catch (err) {
      setError(err.message || 'Application nahi ja payi. Dobara try karein.');
    } finally {
      setIsSaving(false);
    }
  };

  const bandNote = [
    scheme.minAmount ? `kam se kam ${rupees(scheme.minAmount)}` : null,
    scheme.maxAmount ? `zyada se zyada ${rupees(scheme.maxAmount)}` : null,
  ].filter(Boolean).join(', ');

  return (
    <Modal
      title={scheme.name}
      onClose={onClose}
      footer={
        <Button type="submit" form="loan-apply" fullWidth isLoading={isSaving} disabled={!withinBand}>
          Application bhejein
        </Button>
      }
    >
      <form id="loan-apply" onSubmit={submit} className="flex flex-col gap-4 p-4">
        <Input
          label="Kitna chahiye"
          type="number"
          inputMode="numeric"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={!withinBand && amount ? `Is scheme mein ${bandNote} milta hai.` : undefined}
        />

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text-secondary">Kitne mahine mein chukayenge</span>
          <select
            className="h-[42px] w-full cursor-pointer rounded-md border border-border-strong bg-surface px-3 text-text-primary transition-colors hover:border-text-faint focus:border-primary focus:outline-none"
            value={tenure}
            onChange={(e) => setTenure(Number(e.target.value))}
          >
            {TENURES.map((months) => (
              <option key={months} value={months}>{months} mahine</option>
            ))}
          </select>
        </label>

        {/* The monthly number, which is what the decision actually turns on. */}
        {estimate && (
          <div className="rounded-lg border border-primary/20 bg-primary-light px-3.5 py-3">
            <p className="eyebrow">Andaazan EMI</p>
            <p className="num mt-1 text-2xl font-bold leading-none text-text-primary">
              {rupees(estimate.monthlyInstalment)}
              <span className="text-sm font-medium text-text-muted"> /mahina</span>
            </p>
            <p className="num mt-2 text-2xs leading-snug text-text-secondary">
              {estimate.indicativeAnnualRate}% saalana · kul {rupees(estimate.totalRepayable)} ·
              byaaj {rupees(estimate.totalInterest)}
            </p>
            <p className="mt-1.5 text-2xs leading-snug text-text-muted">
              {estimate.disclaimer}
            </p>
          </div>
        )}

        <Input
          label="Kis kaam ke liye? (optional)"
          placeholder="e.g. nayi shelf aur stock"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        />

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2.5 text-sm leading-snug text-danger"
          >
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" strokeWidth={2} />
            {error}
          </p>
        )}

        <p className="text-2xs leading-snug text-text-muted">
          Application bhejne se loan approve nahi hota. Aapki di hui details aur aaj ke
          criteria record ho jayenge, aur bank aage ka faisla karega.
        </p>
      </form>
    </Modal>
  );
}
