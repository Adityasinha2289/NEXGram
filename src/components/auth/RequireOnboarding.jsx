import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { IS_EXPLORATION_MODE } from '../../constants/config';

/**
 * Keeps users out of the app until their profile can actually be scored.
 *
 * In Exploration Mode (development), this check allows direct access to all
 * feature areas while preserving onboarding routes for manual testing.
 * In Production mode, it strictly gates users on profile completion.
 */
export function RequireOnboarding() {
  const { currentUser, profile } = useAuth();
  const location = useLocation();

  const onboardingPath = `/${currentUser?.role || 'retailer'}/onboarding`;

  // Already on onboarding, or in exploration mode, or profile hasn't loaded yet
  if (location.pathname === onboardingPath || IS_EXPLORATION_MODE || !profile) {
    return <Outlet />;
  }

  if (!profile.profile_complete) {
    return <Navigate to={onboardingPath} replace />;
  }

  return <Outlet />;
}
