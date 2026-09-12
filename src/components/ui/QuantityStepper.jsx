import { Minus, Plus } from 'lucide-react';

/**
 * A quantity control that knows its own limits.
 *
 * Clamped to the supplier's minimum order quantity at the bottom and to what
 * they actually have at the top, so the server never has to reject a number the
 * UI offered.
 */
export function QuantityStepper({ value, min = 1, max, step = 1, onChange, label }) {
  const set = (next) => {
    const clamped = Math.min(max ?? Infinity, Math.max(min, next));
    onChange(clamped);
  };

  return (
    <div className="flex items-center rounded-md border border-border-strong bg-surface">
      <button
        type="button"
        onClick={() => set(value - step)}
        disabled={value <= min}
        aria-label={`${label} kam karein`}
        className="grid h-8 w-8 place-items-center rounded-l-md text-text-secondary transition-colors hover:bg-surface-muted disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Minus size={14} strokeWidth={2.5} />
      </button>
      <span className="num w-10 text-center text-sm font-semibold text-text-primary" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => set(value + step)}
        disabled={max !== undefined && value >= max}
        aria-label={`${label} badhayein`}
        className="grid h-8 w-8 place-items-center rounded-r-md text-text-secondary transition-colors hover:bg-surface-muted disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Plus size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}
