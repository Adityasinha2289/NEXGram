import { Check } from 'lucide-react';

/**
 * One choice in an onboarding step.
 *
 * Rendered as a button rather than a div with an onClick, so it is reachable by
 * keyboard and announces its pressed state. The selected border is set
 * explicitly in both states: the previous version painted `border-transparent`
 * over the card's own border, which left every unselected option with no edge
 * at all once utilities started winning over component styles.
 */
export function OptionCard({
  title,
  description,
  icon: Icon,
  selected = false,
  onClick,
  multiSelect = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
        selected
          ? 'border-primary bg-primary-light'
          : 'border-border bg-surface hover:border-border-strong hover:bg-surface-muted'
      }`}
    >
      {Icon && (
        <span
          className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg transition-colors ${
            selected ? 'bg-primary text-text-inverse' : 'bg-surface-muted text-text-muted'
          }`}
        >
          <Icon size={18} strokeWidth={2} />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-text-primary">{title}</span>
        {description && (
          <span className="mt-0.5 block text-2xs leading-snug text-text-muted">{description}</span>
        )}
      </span>

      <span
        aria-hidden="true"
        className={`grid h-5 w-5 flex-shrink-0 place-items-center border transition-colors ${
          multiSelect ? 'rounded-md' : 'rounded-full'
        } ${selected ? 'border-primary bg-primary text-text-inverse' : 'border-border-strong'}`}
      >
        {selected && <Check size={12} strokeWidth={3} />}
      </span>
    </button>
  );
}
