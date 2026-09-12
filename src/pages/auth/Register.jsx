import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AuthShell } from './AuthShell';

const ROLES = [
  { value: 'retailer', label: 'Retailer', caption: 'Main dukaan chalata hoon' },
  { value: 'distributor', label: 'Distributor', caption: 'Main dukaanon ko supply karta hoon' },
];

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    password: '',
    role: 'retailer',
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await register(formData);
      // Onboarding is where demand and catalogue signals are captured, so a new
      // account goes there first; RequireOnboarding keeps them there until done.
      navigate(`/${formData.role}/onboarding`);
    } catch (err) {
      setError(err.message || 'Account nahi ban paya. Dobara try karein.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Account banayein"
      subtitle="Do minute lagenge."
      footer={
        <>
          Pehle se account hai?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Login karein
          </Link>
        </>
      }
    >
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2.5 text-sm leading-snug text-danger"
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" strokeWidth={2} />
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/*
         * Two labelled choices rather than a segmented toggle: which side of the
         * market someone is on changes the entire app they get, so it is worth
         * more than a 28px tab with one word on it.
         */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-text-secondary">Aap kaun hain?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLES.map((role) => {
              const selected = formData.role === role.value;
              return (
                <label
                  key={role.value}
                  className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border px-3 py-2.5 transition-colors ${
                    selected
                      ? 'border-primary bg-primary-light'
                      : 'border-border bg-surface hover:border-border-strong'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={selected}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <span
                    className={`text-sm font-semibold ${selected ? 'text-primary-hover' : 'text-text-primary'}`}
                  >
                    {role.label}
                  </span>
                  <span className="text-2xs leading-snug text-text-muted">{role.caption}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Input
          label="Poora naam"
          name="name"
          autoComplete="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Aapka naam"
          required
        />

        <Input
          label="Mobile number"
          name="mobile"
          type="tel"
          inputMode="numeric"
          autoComplete="username"
          value={formData.mobile}
          onChange={handleChange}
          placeholder="10 digit number"
          required
        />

        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Kam se kam 8 characters"
          required
        />

        <Button type="submit" size="lg" fullWidth isLoading={isLoading} className="mt-1">
          Account banayein
        </Button>
      </form>
    </AuthShell>
  );
}
