import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-text-muted mb-4 hover:text-primary">
            <ArrowLeft size={15} /> Login par wapas
          </Link>

          {done ? (
            <div className="text-center py-6">
              <ShieldCheck size={40} className="text-success mx-auto mb-3" />
              <h1 className="text-xl font-bold text-text-primary">Password badal gaya</h1>
              <p className="text-sm text-text-muted mt-1">Login page par bhej rahe hain...</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <KeyRound size={32} className="text-primary mx-auto mb-2" />
                <h1 className="text-2xl font-bold text-primary">Password Bhool Gaye?</h1>
                <p className="text-text-muted text-sm mt-1">
                  {step === 'request'
                    ? 'Apna registered mobile number daalein.'
                    : 'Jo code aaya hai woh aur naya password daalein.'}
                </p>
              </div>

              {step === 'request' ? (
                <form onSubmit={requestCode} className="flex flex-col gap-4">
                  <Input
                    label="Mobile Number"
                    id="reset-mobile"
                    type="tel"
                    inputMode="numeric"
                    placeholder="10 digit number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                  />
                  {error && <p className="text-sm text-danger">{error}</p>}
                  <Button type="submit" fullWidth disabled={isBusy}>
                    {isBusy ? 'Bhej rahe hain...' : 'Code Bhejein'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={confirmReset} className="flex flex-col gap-4">
                  <div className="bg-primary-light border border-primary/20 rounded-lg p-3 text-sm text-text-secondary">
                    Agar <span className="font-semibold text-text-primary">{mobile}</span> registered hai,
                    to code bhej diya gaya hai{expiresIn ? ` (${expiresIn} minute tak valid)` : ''}.
                  </div>

                  <Input
                    label="Reset Code"
                    id="reset-code"
                    inputMode="numeric"
                    placeholder="6 digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                  <Input
                    label="Naya Password"
                    id="reset-password"
                    type="password"
                    placeholder="Kam se kam 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  {error && <p className="text-sm text-danger">{error}</p>}
                  <Button type="submit" fullWidth disabled={isBusy}>
                    {isBusy ? 'Badal rahe hain...' : 'Password Badlein'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setStep('request'); setError(null); }}
                    className="text-sm text-text-muted hover:text-primary"
                  >
                    Number galat hai? Badlein
                  </button>
                </form>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
