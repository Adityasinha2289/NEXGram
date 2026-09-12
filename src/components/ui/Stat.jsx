/**
 * One figure, captioned.
 *
 * Deliberately not a card. A row of three bordered boxes turns three related
 * readings into three separate objects; sharing one surface and separating them
 * with a hairline says they are one instrument panel, which they are.
 */
export function Stat({ label, value, caption, icon: Icon, tone = 'default' }) {
  const valueTone = {
    default: 'text-text-primary',
    positive: 'text-success',
    caution: 'text-warning',
    negative: 'text-danger',
    brand: 'text-primary',
  }[tone] || 'text-text-primary';

  return (
    <div className="flex min-w-0 flex-col gap-1 bg-surface px-3 py-3.5 sm:px-4">
      <span className="eyebrow flex items-center gap-1.5">
        {Icon && <Icon size={12} strokeWidth={2.25} className="flex-shrink-0" />}
        <span className="truncate">{label}</span>
      </span>
      <span className={`num text-lg font-bold leading-none tracking-tight sm:text-xl ${valueTone}`}>
        {value}
      </span>
      {caption && (
        <span className="text-2xs leading-snug text-text-muted">{caption}</span>
      )}
    </div>
  );
}

/**
 * The shared surface a row of Stats sits on.
 *
 * The hairlines are the 1px grid gap showing the container's background
 * through, rather than borders on the cells: Tailwind's divide-* utilities put
 * a left border on every cell but the first, which in a wrapping grid lands on
 * the first cell of the second row too.
 */
export function StatGroup({ children, columns = 3, className = '' }) {
  const cols = columns === 2 ? 'grid-cols-2' : 'grid-cols-3';
  return (
    <div className={`panel grid gap-px overflow-hidden bg-border ${cols} ${className}`}>
      {children}
    </div>
  );
}
