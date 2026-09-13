import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AuthShell } from './AuthShell';
import { ROLES, ROLE_LIST, homeFor } from '../../constants/roles';
import { isClerkEnabled } from '../../config/clerk';

/**
 * Signing in, one screen per side of the market.
 *
 * Three roles share one form but not one page. A shopkeeper arriving at a
 * generic "login" has to work out which of three things they are before they
 * can type a number; a page that already says "Retailer" answers that before
 * they start, and the demo button on it opens the right world rather than a
 * menu of three.
 *
 * The role is a hint for the screen, never an assertion. What the account
 * actually is comes back from the server, and that is what decides where the
 * user lands — signing in with distributor credentials on the retailer page
 * takes you to the distributor dashboard, not to a screen you have no profile
 * for.
 */
export function Login() {
  const { role: roleParam } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const role = ROLES[roleParam];

  // /login/something-else is a typo, not a fourth role.
  if (roleParam && !role) return <Navigate to="/login" replace />;

  const goHome = (user) => navigate(homeFor(user?.role), { replace: true });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      goHome(await login(mobile, password));
    } catch (err) {
      setError(err.message || 'Login nahi ho paya. Mobile number aur password check karein.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemo = async (demoRole) => {
    const account = ROLES[demoRole].demo;
    setMobile(account.mobile);
    setPassword(account.password);
    setError(null);
    setIsLoading(true);
    try {
      goHome(await login(account.mobile, account.password));
    } catch (err) {
      setError(err.message || 'Demo login nahi ho paya.');
    } finally {
      setIsLoading(false);
    }
  };

  // Without a role in the path this is the chooser, not a form: asking for a
  // mobile number before the user has said what they are is the thing the
  // split was meant to remove.
  if (!role) return <RoleChooser />;

  const Icon = role.icon;

  return (
    <AuthShell
      title={`${role.label} login`}
      subtitle={role.tagline}
      footer={
        <>
          Naye hain?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Account banayein
          </Link>
        </>
      }
    >
      <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary-light px-3.5 py-3">
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-primary text-text-inverse">
          <Icon size={17} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">{role.label}</p>
          <p className="text-2xs leading-snug text-text-muted">{role.noun}</p>
        </div>
        <Link
          to="/login"
          className="ml-auto flex-shrink-0 rounded-md px-2 py-1.5 text-2xs font-semibold text-primary transition-colors hover:bg-surface"
        >
          Badlein
        </Link>
      </div>

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

      {/* Only when a Clerk instance is configured. Offering a sign-in route
          that cannot work is worse than not offering it. */}
      {isClerkEnabled && (
        <div className="flex flex-col gap-3 border-t border-border pt-5">
          <p className="eyebrow text-center">Ya</p>
          <Button
            variant="outline"
            fullWidth
            disabled={isLoading}
            onClick={() => navigate(`/sign-in?role=${role.key}`)}
          >
            OTP, Google ya email se sign in
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-5">
        <p className="eyebrow text-center">Dekhna hai? Demo account</p>
        <Button
          variant="outline"
          fullWidth
          disabled={isLoading}
          onClick={() => loginAsDemo(role.key)}
        >
          {role.demo.label} se khol dein
        </Button>
      </div>
    </AuthShell>
  );
}

/** Which of the three you are, before anything asks for a number. */
function RoleChooser() {
  return (
    <AuthShell
      title="Aap kaun hain?"
      subtitle="Apna role chunein — screen usi hisaab se khulegi."
      footer={
        <>
          Naye hain?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Account banayein
          </Link>
        </>
      }
    >
      <ul className="flex flex-col gap-2.5">
        {ROLE_LIST.map((role) => {
          const Icon = role.icon;
          return (
            <li key={role.key}>
              <Link
                to={role.loginPath}
                className="flex items-center gap-3.5 rounded-lg border border-border bg-surface px-4 py-3.5 transition-colors hover:border-primary hover:bg-primary-light"
              >
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-primary-light text-primary">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-text-primary">
                    {role.label}
                  </span>
                  <span className="block text-2xs leading-snug text-text-muted">
                    {role.tagline}
                  </span>
                </span>
                <ArrowRight size={16} className="flex-shrink-0 text-text-faint" strokeWidth={2} />
              </Link>
            </li>
          );
        })}
      </ul>
    </AuthShell>
  );
}
