/**
 * A single-choice filter row.
 *
 * Scrolls sideways on a phone rather than wrapping to three lines, and bleeds
 * to the screen edge there so the last chip does not look cut off mid-gutter.
 * Rendered as radios so a keyboard moves through the set with arrow keys and a
 * screen reader announces it as one choice, which a row of buttons does not.
 */
export function FilterChips({ options, value, onChange, name = 'filter', label, className = '' }) {
  return (
    <fieldset
      className={`-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide sm:mx-0 sm:flex-wrap sm:px-0 ${className}`}
    >
      {label && <legend className="sr-only">{label}</legend>}
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={`flex h-8 flex-shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-colors ${
              selected
                ? 'border-primary bg-primary text-text-inverse'
                : 'border-border bg-surface text-text-secondary hover:border-border-strong hover:bg-surface-muted'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
            {option.count !== undefined && (
              <span className={`num text-2xs ${selected ? 'opacity-80' : 'text-text-muted'}`}>
                {option.count}
              </span>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}
