import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ClerkProvider, SignIn, useAuth as useClerkSession } from '@clerk/clerk-react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { ROLES, homeFor } from '../../constants/roles';
import { CLERK_PUBLISHABLE_KEY, isClerkEnabled } from '../../config/clerk';
import { AuthShell } from './AuthShell';

/**
 * Signing in through Clerk.
 *
 * Two steps that look like one. Clerk proves who someone is, then the token it
 * hands back is spent immediately on a NEXGram session and forgotten — see
 * backend/app/modules/auth/clerk.py for why the app does not simply keep using
 * Clerk's token.
 *
 * The provider lives *here* rather than around the app, because this is the
 * only screen that needs it: after the exchange the session is an ordinary
 * NEXGram one and no other component asks Clerk anything. Wrapping the whole
 * app instead pulled the SDK into the main bundle and cost every visitor 25kB
 * gzipped — including the ones who sign in with a mobile number and never touch
 * Clerk at all, on the metered connections this app is built for.
 */
export function ClerkSignIn() {
  const navigate = useNavigate();

  // Clerk navigates between its own sub-steps (OTP entry, the SSO callback).
  // Handing it the router keeps those as client-side transitions instead of
  // full page loads that would drop the session being built.
  const routerPush = useCallback((to) => navigate(to), [navigate]);
  const routerReplace = useCallback((to) => navigate(to, { replace: true }), [navigate]);

  if (!isClerkEnabled) return <Navigate to="/login" replace />;

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      routerPush={routerPush}
      routerReplace={routerReplace}
    >
      <ClerkSignInInner />
    </ClerkProvider>
  );
}

/**
 * Inside the provider, where Clerk's hooks are legal to call.
 *
 * The `role` in the query string is a hint carried from whichever login page
 * they came through, and it is used only if this Clerk identity has never been
 * seen here before. Where they land is decided by the role the server returns,
 * exactly as on the password form: arriving through the retailer door with a
 * distributor account takes you to the distributor's dashboard.
 */
function ClerkSignInInner() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithClerk, currentUser } = useAuth();
  const { isLoaded, isSignedIn, getToken } = useClerkSession();

  const [error, setError] = useState(null);
  // The exchange must happen once. Clerk re-renders as it refreshes its own
  // token every fifty seconds, and without this guard each refresh would mint
  // another NEXGram session.
  const exchanged = useRef(false);

  const roleParam = params.get('role');
  const role = ROLES[roleParam] ? roleParam : undefined;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || exchanged.current) return;
    exchanged.current = true;

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Clerk se token nahi mila.');
        const user = await loginWithClerk(token, role);
        if (!cancelled) navigate(homeFor(user?.role), { replace: true });
      } catch (err) {
        if (cancelled) return;
        // Letting them retry is the only useful move: the Clerk session is
        // fine, it is the exchange that failed.
        exchanged.current = false;
        setError(err?.message || 'Sign in poora nahi ho paya. Dobara koshish karein.');
      }
    })();

    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken, loginWithClerk, navigate, role]);

  if (currentUser) return <Navigate to={homeFor(currentUser.role)} replace />;

  if (!isLoaded || isSignedIn) {
    return (
      <AuthShell title="Ek minute..." subtitle="Aapka account taiyaar kiya ja raha hai.">
        <div className="flex flex-col items-center gap-4 py-6">
          {error ? (
            <p role="alert" className="flex items-start gap-2 text-sm font-medium text-danger">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              {error}
            </p>
          ) : (
            <Loader2 className="animate-spin text-primary" size={28} />
          )}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={role ? `${ROLES[role].label} sign in` : 'Sign in'}
      subtitle="Mobile number, Google ya email — jo aasan lage."
    >
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-in"
        // Come back here afterwards; this page finishes the job. Clerk's own
        // redirect would drop the visitor on a route with no NEXGram session.
        fallbackRedirectUrl={role ? `/sign-in?role=${role}` : '/sign-in'}
        appearance={{ elements: { rootBox: 'w-full', card: 'shadow-none border-0 bg-transparent' } }}
      />
    </AuthShell>
  );
}
