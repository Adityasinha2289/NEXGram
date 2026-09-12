import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AuthShell } from './AuthShell';
import { authApi } from '../../services/api/authApi';

/**
 * Forgotten-password recovery, in two steps on one screen.
 *
 * Step one deliberately gives the same confirmation whether or not the number
 * is registered - saying "no such account" would turn this into a way to find
 * out which shops are on the platform.
 */
export function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('request');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState(null);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const requestCode = async (e) => {
    e.preventDefault();
    setIsBusy(true);
    setError(null);
    try {
      const res = await authApi.requestPasswordReset(mobile);
      setExpiresIn(res.expires_in_minutes);
      setStep('confirm');
    } catch (err) {
      setError(err.message || 'Abhi request nahi ho payi. Thodi der baad try karein.');
    } finally {
      setIsBusy(false);
    }
  };

  const confirmReset = async (e) => {
    e.preventDefault();
    setIsBusy(true);
    setError(null);
    try {
      await authApi.confirmPasswordReset({ mobile, code, new_password: newPassword });
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Reset nahi ho paya.');
    } finally {
      setIsBusy(false);
    }
  };

  if (done) {
    return (
      <AuthShell title="Password badal gaya" subtitle="Login page par bhej rahe hain…">
        <ShieldCheck size={32} className="mx-auto text-success" strokeWidth={1.75} />
      </AuthShell>
    );
  }

  const errorNotice = error && (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2.5 text-sm leading-snug text-danger"
    >
      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" strokeWidth={2} />
      {error}
    </p>
  );

  return (
    <AuthShell
      title="Password bhool gaye?"
      subtitle={
        step === 'request'
          ? 'Apna registered mobile number daalein.'
          : 'Jo code aaya hai woh aur naya password daalein.'
      }
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1 font-medium hover:text-text-primary"
        >
          <ArrowLeft size={14} /> Login par wapas
        </Link>
      }
    >
      {step === 'request' ? (
        <form onSubmit={requestCode} className="flex flex-col gap-4">
          <Input
            label="Mobile number"
            id="reset-mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="username"
            placeholder="10 digit number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
          />
          {errorNotice}
          <Button type="submit" size="lg" fullWidth isLoading={isBusy}>
            Code bhejein
          </Button>
        </form>
      ) : (
        <form onSubmit={confirmReset} className="flex flex-col gap-4">
          <p className="rounded-lg bg-primary-light px-3 py-2.5 text-sm leading-snug text-text-secondary">
            Agar <span className="num font-semibold text-text-primary">{mobile}</span> registered
            hai, to code bhej diya gaya hai
            {expiresIn ? ` (${expiresIn} minute tak valid)` : ''}.
          </p>

          <Input
            label="Reset code"
            id="reset-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6 digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <Input
            label="Naya password"
            id="reset-password"
            type="password"
            autoComplete="new-password"
            placeholder="Kam se kam 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          {errorNotice}
          <Button type="submit" size="lg" fullWidth isLoading={isBusy}>
            Password badlein
          </Button>
          <button
            type="button"
            onClick={() => { setStep('request'); setError(null); }}
            className="rounded-sm py-1 text-sm text-text-muted transition-colors hover:text-text-primary"
          >
            Number galat hai? Badlein
          </button>
        </form>
      )}
    </AuthShell>
  );
}
