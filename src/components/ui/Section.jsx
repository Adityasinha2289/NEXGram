import { ArrowRight } from 'lucide-react';

/**
 * A titled block of a page.
 *
 * The heading is a rank below the page title and a rank above the content, which
 * is the whole job: the dashboards had every section heading at the same weight
 * and size as the page's own, so the page read as seven unrelated screens
 * stacked on top of each other.
 */
export function Section({ title, description, action, children, className = '', id }) {
  return (
    <section className={`flex flex-col gap-3 ${className}`} id={id}>
      {(title || action) && (
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            {title && (
              <h3 className="text-base font-semibold leading-tight text-text-primary">{title}</h3>
            )}
            {description && (
              <p className="mt-0.5 text-sm leading-snug text-text-muted">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * The "see all" affordance in a section heading. A link, styled as one, rather
 * than a ghost button pretending to be one.
 */
export function SectionLink({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-my-2 flex flex-shrink-0 items-center gap-1 rounded-sm py-2 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
    >
      {children}
      <ArrowRight size={14} strokeWidth={2.25} />
    </button>
  );
}
