import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { homeFor } from '../../constants/roles';

/**
 * Keeps each side of the market inside its own part of the app.
 *
 * This used to silently sign the visitor into a demo account whenever it found
 * them signed out, which made the app impossible to leave: pressing exit ended
 * the session, the guard saw a signed-out user a frame later, and signed them
 * straight back in. The home page now offers all three demos in one tap, so
 * the auto-login bought nothing and cost the exit.
 *
 * A signed-out visitor goes to the login chooser. Someone in the wrong wing of
 * the app goes to their own home rather than being told off.
 */
export function ProtectedRoute({ allowedRoles }) {
  const { currentUser, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={homeFor(currentUser.role)} replace />;
  }

  return <Outlet />;
}
