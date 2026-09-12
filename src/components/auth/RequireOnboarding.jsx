import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Keeps users out of the app until their profile can actually be scored.
 *
 * Onboarding is where demand signals are captured, so a retailer who skips it
 * contributes nothing to the intelligence layer and sees an empty dashboard.
 * The backend already decides what "complete" means and returns it as
 * `profile_complete` on the profile payload; this just honours that answer.
 */
export function RequireOnboarding() {
  const { currentUser, profile } = useAuth();
  const location = useLocation();

  const onboardingPath = `/${currentUser.role}/onboarding`;

  // Already there, or the profile hasn't loaded yet — nothing to redirect.
  if (location.pathname === onboardingPath || !profile) {
    return <Outlet />;
  }

  if (!profile.profile_complete) {
    return <Navigate to={onboardingPath} replace />;
  }

  return <Outlet />;
}
