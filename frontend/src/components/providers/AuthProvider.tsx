"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { authApi } from "@/lib/api/auth";
import { Loader2 } from "lucide-react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout, setHydrating, isHydrating, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hasAttemptedHydration, setHasAttemptedHydration] = useState(false);

  useEffect(() => {
    const hydrateAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        logout();
        setHydrating(false);
        setHasAttemptedHydration(true);
        return;
      }

      try {
        const user = await authApi.getMe();
        login({
          id: user.id,
          name: user.name,
          role: user.role,
          profile_id: user.profile_id,
          profile_complete: user.profile_complete,
        });
      } catch (error) {
        // If getting the current user fails (e.g. 401), we clear the token.
        logout();
      } finally {
        setHydrating(false);
        setHasAttemptedHydration(true);
      }
    };

    hydrateAuth();
  }, [login, logout, setHydrating]);

  // Handle protected route redirects
  useEffect(() => {
    if (isHydrating || !hasAttemptedHydration) return;

    const isAuthRoute = pathname.startsWith("/login") || pathname === "/";
    const isProtectedRoute = pathname.startsWith("/retailer") || pathname.startsWith("/distributor");

    if (!isAuthenticated && isProtectedRoute) {
      router.push("/login");
    } else if (isAuthenticated && isAuthRoute) {
      // If they are logged in and trying to access login page, redirect them to dashboard
      const { role } = useAuthStore.getState().user || {};
      if (role === "retailer") router.push("/retailer");
      if (role === "distributor") router.push("/distributor");
    }
  }, [isAuthenticated, isHydrating, hasAttemptedHydration, pathname, router]);

  // While checking auth state on initial load, prevent rendering children to avoid queries firing prematurely
  if (isHydrating && !hasAttemptedHydration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  // If they are not authenticated and trying to access a protected route, render nothing while redirecting
  const isProtectedRoute = pathname.startsWith("/retailer") || pathname.startsWith("/distributor");
  if (!isAuthenticated && isProtectedRoute) {
    return null;
  }

  return <>{children}</>;
}
