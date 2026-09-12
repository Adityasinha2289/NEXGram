import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * A dialog that behaves like one.
 *
 * The two dialogs in the app each rolled their own overlay, and neither closed
 * on Escape, stopped the page behind it from scrolling, announced itself to a
 * screen reader, or moved focus into itself. All of that belongs in one place.
 *
 * Sits along the bottom edge on a phone, where a thumb can reach the controls,
 * and centres from 640px up.
 */
export function Modal({ title, onClose, children, footer, size = 'md' }) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    // Focus the panel so the next Tab lands inside the dialog rather than
    // continuing through the page behind it.
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose]);

  const height = size === 'tall' ? 'h-[82vh] sm:h-[min(620px,86vh)]' : 'max-h-[88vh]';

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Band karein"
        tabIndex={-1}
        className="absolute inset-0 bg-text-primary/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative z-10 flex w-full max-w-[480px] flex-col overflow-hidden rounded-t-2xl bg-surface shadow-lg outline-none sm:rounded-2xl ${height}`}
      >
        <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Band karein"
            className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div className="flex-shrink-0 border-t border-border p-3">{footer}</div>
        )}
      </div>
    </div>
  );
}
