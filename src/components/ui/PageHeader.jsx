/**
 * The first thing on a page: what this screen is, and what it is for.
 *
 * Every screen had been hand-rolling this out of an h2, a p and a flex row, and
 * the sizes had drifted apart — three different title sizes and two different
 * gaps across the app. One component means one answer.
 *
 * @param eyebrow  Optional context above the title (a role, a category).
 * @param meta     A row of small facts rendered under the description.
 * @param action   Pushed to the right of the title on a wide screen, under it
 *                 on a phone, where there is no room beside a long heading.
 */
export function PageHeader({ title, description, eyebrow, meta, action, className = '' }) {
  return (
    <header className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h2 className="text-display font-bold text-text-primary">{title}</h2>
        {description && (
          <p className="mt-1.5 max-w-[62ch] text-sm leading-relaxed text-text-muted">{description}</p>
        )}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">{meta}</div>}
      </div>
      {action && <div className="flex flex-shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}

/**
 * A small fact under a page or card heading — a location, a count, a timestamp.
 */
export function Meta({ icon: Icon, children, className = '' }) {
  return (
    <span className={`flex items-center gap-1.5 text-sm text-text-secondary ${className}`}>
      {Icon && <Icon size={14} className="flex-shrink-0 text-text-muted" strokeWidth={2} />}
      {children}
    </span>
  );
}
