import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { IS_EXPLORATION_MODE } from '../../constants/config';

export function ProtectedRoute({ allowedRoles }) {
  const { currentUser, isAuthenticated, isLoading, switchRole } = useAuth();
  const targetRole = allowedRoles?.[0] || 'retailer';
  const attemptedAutoAuth = useRef(false);

  useEffect(() => {
    if (IS_EXPLORATION_MODE && (!isAuthenticated || (currentUser && !allowedRoles?.includes(currentUser.role)))) {
      if (!attemptedAutoAuth.current) {
        attemptedAutoAuth.current = true;
        switchRole(targetRole).catch((err) => {
          console.error('Exploration auto-auth failed:', err);
        });
      }
    }
  }, [isAuthenticated, currentUser, allowedRoles, targetRole, switchRole]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-primary" size={32} />
        {IS_EXPLORATION_MODE && (
          <p className="text-sm font-medium text-text-muted">
            Exploration mode: {targetRole} session load ho raha hai...
          </p>
        )}
      </div>
    );
  }

  if (!isAuthenticated) {
    if (IS_EXPLORATION_MODE) {
      // While auto-auth is firing in effect, show spinner
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      );
    }
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    if (IS_EXPLORATION_MODE) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      );
    }
    // If they are logged in but have wrong role, redirect to their own dashboard
    if (currentUser.role === 'retailer') {
      return <Navigate to="/retailer/dashboard" replace />;
    } else if (currentUser.role === 'distributor') {
      return <Navigate to="/distributor/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
