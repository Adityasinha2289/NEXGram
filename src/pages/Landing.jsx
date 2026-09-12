import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Store, Truck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { DEMO_ACCOUNTS } from '../constants/demoAccounts';

/**
 * The loop the product exists to close, in the order it happens.
 */
const LOOP = [
  {
    title: 'Dukaan batati hai',
    body: 'Customer ne maanga, stock nahi tha — retailer wahi report karta hai.',
  },
  {
    title: 'Engine jodta hai',
    body: 'Ek hi market ki saari dukaanon ke signals mil kar ek supply gap bante hain.',
  },
  {
    title: 'Distributor bharta hai',
    body: 'Gap ek scored opportunity ban kar us distributor tak jaata hai jo use pura kar sakta hai.',
  },
];

/**
 * The scoring breakdown for the strongest gap in the demo dataset. Shown here
 * verbatim because the arithmetic is the product's actual claim — "no number
 * without its evidence" is more convincing demonstrated than asserted.
 */
const SAMPLE_BREAKDOWN = [
  { label: 'Local demand', points: 42, max: 45, detail: '14 of a saturating 15 retailers' },
  { label: 'Supply scarcity', points: 26, max: 35, detail: '1 distributor can fulfil today' },
  { label: 'Your fit', points: 20, max: 20, detail: 'Your primary area' },
];

export function Landing() {
  const navigate = useNavigate();
  const { login, currentUser } = useAuth();
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentUser) {
      navigate(
        currentUser.role === 'retailer' ? '/retailer/dashboard' : '/distributor/dashboard',
        { replace: true },
      );
    }
  }, [currentUser, navigate]);

  const handleDemo = async (role) => {
    const account = DEMO_ACCOUNTS[role];
    setPending(role);
    setError(null);
    try {
      await login(account.mobile, account.password);
      navigate(role === 'retailer' ? '/retailer/dashboard' : '/distributor/dashboard');
    } catch (err) {
      setError(err?.message || 'Demo login abhi nahi ho paya. Login page se try karein.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-5 sm:px-6">
        <span className="flex items-center gap-2">
          <span
            className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-sm font-bold text-text-inverse"
            aria-hidden="true"
          >
            N
          </span>
          <span className="text-base font-bold tracking-tight text-text-primary">NEXGram</span>
        </span>
        <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
          Login
        </Button>
      </header>

      <main className="mx-auto grid max-w-[1180px] gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start lg:gap-14 lg:pt-6">
        <div className="flex flex-col gap-6">
          <div>
            <p className="eyebrow">Rural B2B commerce intelligence</p>
            <h1 className="mt-2 text-display-lg font-bold text-text-primary">
              Kya rakhein — aur kyun.
            </h1>
            <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-text-secondary">
              Gaon ki dukaanein roz batati hain ki customer ne kya maanga aur mila nahi.
              NEXGram un signals ko ek scored, samjhaye ja sakne wale stocking decision mein
              badal deta hai — har number ke peechhe uska evidence.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <p className="eyebrow">Demo kholein</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {['retailer', 'distributor'].map((role) => {
                const account = DEMO_ACCOUNTS[role];
                const Icon = role === 'retailer' ? Store : Truck;
                return (
                  <button
                    key={role}
                    type="button"
                    disabled={Boolean(pending)}
                    onClick={() => handleDemo(role)}
                    className="panel flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:border-border-strong hover:bg-surface-muted disabled:opacity-60"
                  >
                    <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-primary-light text-primary">
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-text-primary">
                        {pending === role ? 'Khul raha hai…' : `${role === 'retailer' ? 'Retailer' : 'Distributor'} demo`}
                      </span>
                      <span className="block truncate text-2xs text-text-muted">
                        {account.label}
                      </span>
                    </span>
                    <ArrowRight size={16} className="flex-shrink-0 text-text-faint" />
                  </button>
                );
              })}
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <p className="text-2xs text-text-muted">
              Apna account chahiye?{' '}
              <Link to="/register" className="font-semibold text-primary hover:underline">
                Register karein
              </Link>
            </p>
          </div>

          <ol className="flex flex-col gap-px overflow-hidden rounded-xl border border-border bg-border">
            {LOOP.map((step, index) => (
              <li key={step.title} className="flex items-start gap-3 bg-surface px-4 py-3.5">
                {/* Numbered because this genuinely is a sequence: each step only
                    happens because the one before it did. */}
                <span className="num mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-surface-sunken text-2xs font-bold text-text-secondary">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{step.title}</p>
                  <p className="mt-0.5 text-sm leading-snug text-text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* The claim, demonstrated rather than asserted. */}
        <aside className="panel overflow-hidden shadow-md">
          <div className="flex items-start justify-between gap-4 border-b border-border bg-primary-subtle px-5 py-4">
            <div className="min-w-0">
              <p className="eyebrow">Paneer · Palampur Market</p>
              <p className="num mt-1 text-display font-bold leading-none text-text-primary">
                88<span className="text-lg font-semibold text-text-muted">/100</span>
              </p>
              <p className="mt-1.5 text-2xs font-semibold text-success">
                Strong · High confidence · 14 retailer signals
              </p>
            </div>
            <div
              className="score-ring flex-shrink-0"
              style={{ '--score': 88, '--ring-color': 'var(--color-success)', fontSize: '0.8rem' }}
              role="img"
              aria-label="88 out of 100, Strong, High confidence"
            >
              <div className="score-ring-inner">
                <span className="num text-sm font-bold text-text-primary">88</span>
              </div>
            </div>
          </div>

          <dl className="divide-y divide-border">
            {SAMPLE_BREAKDOWN.map((part) => (
              <div key={part.label} className="flex flex-col gap-1.5 px-5 py-3">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <dt className="font-medium text-text-primary">{part.label}</dt>
                  <dd className="num flex-shrink-0 text-text-muted">
                    {part.points} / {part.max}
                  </dd>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(part.points / part.max) * 100}%` }}
                  />
                </div>
                <p className="text-2xs text-text-muted">{part.detail}</p>
              </div>
            ))}
          </dl>

          <div className="flex items-baseline justify-between gap-3 border-t border-border bg-surface-muted px-5 py-3">
            <span className="text-sm font-semibold text-text-primary">Total</span>
            <span className="num text-sm font-bold text-primary">88 / 100</span>
          </div>

          <p className="border-t border-border px-5 py-3 text-2xs leading-snug text-text-muted">
            Engine ka asli output, demo dataset se. Koi bhi score bina apne evidence ke nahi
            dikhta — aur jo sentence evidence se prove nahi hota, woh reject ho jaata hai.
          </p>
        </aside>
      </main>
    </div>
  );
}
