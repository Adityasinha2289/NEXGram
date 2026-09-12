import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AuthShell } from './AuthShell';
import { DEMO_ACCOUNTS } from '../../constants/demoAccounts';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(mobile, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login nahi ho paya. Mobile number aur password check karein.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemo = async (role) => {
    const account = DEMO_ACCOUNTS[role];
    setMobile(account.mobile);
    setPassword(account.password);
    setError(null);
    setIsLoading(true);
    try {
      await login(account.mobile, account.password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Demo login nahi ho paya.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Wapas aane ka shukriya"
      subtitle="NEXGram mein login karein."
      footer={
        <>
          Naye hain?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Account banayein
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
        <Input
          label="Mobile number"
          type="tel"
          inputMode="numeric"
          autoComplete="username"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="10 digit number"
          required
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        <Button type="submit" size="lg" fullWidth isLoading={isLoading} className="mt-1">
          Login
        </Button>
      </form>

      <div className="text-center">
        <Link
          to="/forgot-password"
          className="rounded-sm text-sm font-medium text-primary hover:underline"
        >
          Password bhool gaye?
        </Link>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-5">
        <p className="eyebrow text-center">Demo accounts — ek tap mein</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {['retailer', 'distributor'].map((role) => (
            <Button
              key={role}
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => loginAsDemo(role)}
            >
              {role === 'retailer' ? 'Retailer demo' : 'Distributor demo'}
            </Button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}
