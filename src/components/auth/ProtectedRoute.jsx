import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ allowedRoles }) {
  const { currentUser, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
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
