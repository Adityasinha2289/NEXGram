import { ChevronRight } from 'lucide-react';

/**
 * A list of records on one surface, separated by hairlines.
 *
 * This replaces the card-per-row pattern the app used everywhere. Eight
 * bordered, shadowed cards in a column read as eight unrelated objects and cost
 * ~14px of frame each; the same eight rows on one panel read as one list and
 * fit three more items on a phone screen.
 */
export function List({ children, className = '' }) {
  return (
    <div className={`panel divide-y divide-border overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

/**
 * One record. Becomes a button when it leads somewhere, a plain row when it
 * does not — so nothing looks clickable that is not.
 */
export function ListRow({ children, onClick, className = '', ...props }) {
  const shared = `flex w-full items-center gap-3 px-4 py-3.5 text-left ${className}`;

  if (!onClick) {
    return <div className={shared} {...props}>{children}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${shared} transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted`}
      {...props}
    >
      {children}
    </button>
  );
}

/** The chevron that marks a row as leading somewhere. */
export function RowChevron() {
  return (
    <ChevronRight
      size={16}
      strokeWidth={2.25}
      className="ml-auto flex-shrink-0 text-text-faint"
      aria-hidden="true"
    />
  );
}

/**
 * A label and its value on one line, for the fact tables on detail pages.
 * The value is right-aligned and tabular so a column of them scans vertically.
 */
export function KeyValue({ label, value, className = '' }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2 ${className}`}>
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd className="num text-sm font-medium text-text-primary text-right">{value}</dd>
    </div>
  );
}
