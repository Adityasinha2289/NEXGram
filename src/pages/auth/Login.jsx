import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      await login(mobile, password);
      // Let ProtectedRoute or App handle navigation if role-based is needed, or we just navigate to dashboard here
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // For Dev only, to easily login
  // Demo accounts from backend/seed/demo_seed.py. These must track the seed:
  // stale shortcuts here just produce a 401 with no explanation.
  const DEMO_ACCOUNTS = {
    retailer: { mobile: '9000000001', password: 'demo1234', label: 'Gupta Kirana Store' },
    distributor: { mobile: '9100000002', password: 'demo1234', label: 'Himachal Dairy Co' },
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
      setError(err.message || 'Demo login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-primary mb-2">Welcome Back</h1>
            <p className="text-text-muted text-sm">Login to continue to NEXGram</p>
          </div>

          {error && (
            <div className="bg-danger/10 text-danger text-sm p-3 rounded-lg mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Mobile Number"
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Enter your 10 digit number"
              required
            />
            
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button type="submit" fullWidth disabled={isLoading} className="mt-2">
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-3 text-center">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              Password bhool gaye?
            </Link>
          </div>

          <div className="mt-6 text-center text-sm text-text-muted">
            Naye hain? <Link to="/register" className="text-primary font-medium hover:underline">Account Banayein</Link>
          </div>

          <div className="mt-8 pt-4 border-t border-border">
            <p className="text-xs text-text-muted text-center mb-2">Demo accounts (ek tap mein login)</p>
            <div className="flex justify-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" disabled={isLoading} onClick={() => loginAsDemo('retailer')}>
                Retailer demo
              </Button>
              <Button variant="outline" size="sm" disabled={isLoading} onClick={() => loginAsDemo('distributor')}>
                Distributor demo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
