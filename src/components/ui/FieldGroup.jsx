import { Check } from 'lucide-react';
import { Input } from './Input';

/**
 * One editable field, rendered from a small schema.
 *
 * Used by the profile editor so retailer and distributor forms are the same
 * component driven by different field lists, rather than two near-identical
 * pages that drift apart.
 */
export function Field({ field, value, onChange, error }) {
  const { key, label, type, options = [], placeholder, hint } = field;

  if (type === 'select') {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-bold text-text-primary ml-1" htmlFor={key}>{label}</label>
        <select
          id={key}
          className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
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
        {hint && <p className="text-xs text-text-muted ml-1">{hint}</p>}
        {error && <p className="text-xs text-danger ml-1">{error}</p>}
      </div>
    );
  }

  if (type === 'multiselect') {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (option) =>
      onChange(
        key,
        selected.includes(option) ? selected.filter((v) => v !== option) : [...selected, option],
      );

    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-text-primary ml-1">{label}</label>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const optionValue = option.value ?? option;
            const isOn = selected.includes(optionValue);
            return (
              <button
                key={optionValue}
                type="button"
                onClick={() => toggle(optionValue)}
                aria-pressed={isOn}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border transition-colors ${
                  isOn
                    ? 'bg-primary text-text-inverse border-primary'
                    : 'bg-surface text-text-secondary border-border hover:border-primary'
                }`}
              >
                {isOn && <Check size={14} />}
                {option.label ?? option}
              </button>
            );
          })}
        </div>
        {hint && <p className="text-xs text-text-muted ml-1">{hint}</p>}
        {error && <p className="text-xs text-danger ml-1">{error}</p>}
      </div>
    );
  }

  if (type === 'textarea') {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-bold text-text-primary ml-1" htmlFor={key}>{label}</label>
        <textarea
          id={key}
          rows={3}
          className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-y"
          placeholder={placeholder}
          value={value ?? ''}
          onChange={(e) => onChange(key, e.target.value)}
        />
        {hint && <p className="text-xs text-text-muted ml-1">{hint}</p>}
        {error && <p className="text-xs text-danger ml-1">{error}</p>}
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
