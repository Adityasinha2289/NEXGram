/**
 * A strip of "do this now" controls.
 *
 * The retailer's home had three of these and drew each one differently — one
 * tinted primary, one plain white, and one inside a terracotta banner with its
 * own heading and button — so three equivalent actions read as three unrelated
 * features and the page carried three accent colours for no reason.
 *
 * They share one surface here for the same reason StatGroup's figures do: they
 * are one instrument, not three objects.
 */
export function ActionGrid({ children, columns = 3, className = '' }) {
  const cols = columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3';
  return (
    <div className={`panel grid gap-px overflow-hidden bg-border ${cols} ${className}`}>
      {children}
    </div>
  );
}

/**
 * One control in the strip.
 *
 * @param accent  Marks the one action the screen wants first. At most one tile
 *                per grid should set it — it is how the strip says "start
 *                here", and it stops saying it the moment two tiles claim it.
 */
export function ActionTile({ icon: Icon, label, caption, onClick, accent = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
        accent
          ? 'bg-primary-subtle hover:bg-primary-light'
          : 'bg-surface hover:bg-surface-muted'
      }`}
    >
      <span
        className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg ${
          accent ? 'bg-primary text-text-inverse' : 'bg-surface-muted text-text-secondary'
        }`}
      >
        <Icon size={17} strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-tight text-text-primary">{label}</span>
        {caption && (
          <span className="mt-0.5 block text-2xs leading-snug text-text-muted">{caption}</span>
        )}
      </span>
    </button>
  );
}
