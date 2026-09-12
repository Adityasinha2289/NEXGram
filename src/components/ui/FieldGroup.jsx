import { Check } from 'lucide-react';
import { Input } from './Input';

/**
 * One editable field, rendered from a small schema.
 *
 * Used by the profile editor so retailer and distributor forms are the same
 * component driven by different field lists, rather than two near-identical
 * pages that drift apart.
 */
function Label({ htmlFor, children }) {
  return (
    <label className="text-sm font-medium text-text-secondary" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

function Hint({ hint, error, id }) {
  if (error) return <p className="text-xs text-danger" id={id}>{error}</p>;
  if (hint) return <p className="text-xs text-text-muted">{hint}</p>;
  return null;
}

export function Field({ field, value, onChange, error }) {
  const { key, label, type, options = [], placeholder, hint } = field;

  if (type === 'select') {
    return (
      <div className="flex flex-col gap-1">
        <Label htmlFor={key}>{label}</Label>
        <select
          id={key}
          className="h-[42px] w-full cursor-pointer rounded-md border border-border-strong bg-surface px-3 text-text-primary transition-colors hover:border-text-faint focus:border-primary focus:outline-none"
          value={value ?? ''}
          onChange={(e) => onChange(key, e.target.value)}
        >
          <option value="">Select karein</option>
          {options.map((option) => (
            <option key={option.value ?? option} value={option.value ?? option}>
              {option.label ?? option}
            </option>
          ))}
        </select>
        <Hint hint={hint} error={error} id={`${key}-hint`} />
      </div>
    );
  }

  if (type === 'multiselect') {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (option) => onChange(
      key,
      selected.includes(option) ? selected.filter((v) => v !== option) : [...selected, option],
    );

    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-text-secondary">{label}</legend>
        <div className="flex flex-wrap gap-1.5">
          {options.map((option) => {
            const optionValue = option.value ?? option;
            const isOn = selected.includes(optionValue);
            return (
              <button
                key={optionValue}
                type="button"
                onClick={() => toggle(optionValue)}
                aria-pressed={isOn}
                className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors ${
                  isOn
                    ? 'border-primary bg-primary text-text-inverse'
                    : 'border-border bg-surface text-text-secondary hover:border-border-strong hover:bg-surface-muted'
                }`}
              >
                {isOn && <Check size={13} strokeWidth={2.5} />}
                {option.label ?? option}
              </button>
            );
          })}
        </div>
        <Hint hint={hint} error={error} id={`${key}-hint`} />
      </fieldset>
    );
  }

  if (type === 'textarea') {
    return (
      <div className="flex flex-col gap-1">
        <Label htmlFor={key}>{label}</Label>
        <textarea
          id={key}
          rows={3}
          className="w-full resize-y rounded-md border border-border-strong bg-surface px-3 py-2.5 leading-relaxed text-text-primary transition-colors placeholder:text-text-muted hover:border-text-faint focus:border-primary focus:outline-none"
          placeholder={placeholder}
          value={value ?? ''}
          onChange={(e) => onChange(key, e.target.value)}
        />
        <Hint hint={hint} error={error} id={`${key}-hint`} />
      </div>
    );
  }

  return (
    <Input
      id={key}
      label={label}
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => onChange(key, e.target.value)}
      error={error}
    />
  );
}
