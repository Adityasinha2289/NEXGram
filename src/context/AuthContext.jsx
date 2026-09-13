import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api/authApi';
import { profilesApi } from '../services/api/profilesApi';
import { storefrontApi } from '../services/api/storefrontApi';
import { AuthContext } from './AuthContextCore';

const SESSION_CACHE_KEY = 'nexgram_session_cache';

/**
 * The last verified session, kept so a shop that loses signal stays signed in.
 *
 * It is a convenience copy for rendering, never an authority: the token is
 * still what the API checks, and a real 401 clears both.
 */
function readSessionCache() {
  try {
    const raw = localStorage.getItem(SESSION_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSessionCache(user, profile) {
  try {
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ user, profile }));
  } catch {
    // Private mode or a full quota: the app works, it just re-verifies online.
  }
}

function clearSessionCache() {
  try {
    localStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    // Nothing to do.
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem('nexgram_access_token')));

  const fetchCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('nexgram_access_token');
    if (!token) {
      setCurrentUser(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const user = await authApi.getMe();
      setCurrentUser(user);

      let profData = null;
      try {
        if (user.role === 'retailer') {
          profData = await profilesApi.getRetailerProfile();
        } else if (user.role === 'distributor') {
          profData = await profilesApi.getDistributorProfile();
        } else if (user.role === 'customer') {
          // A household has no business profile; the delivery address is the
          // only thing the app needs to know about them.
          profData = await storefrontApi.getMe();
        }
        setProfile(profData);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setProfile(readSessionCache()?.profile ?? null);
      }

      writeSessionCache(user, profData);
      return user;
    } catch (err) {
      // Only a rejected token ends the session. A network failure must not:
      // signing a shopkeeper out because their signal dropped would lose their
      // place every time they walk behind the counter.
      if (err.status === 401 || err.status === 403) {
        setCurrentUser(null);
        setProfile(null);
        localStorage.removeItem('nexgram_access_token');
        clearSessionCache();
      } else {
        const cached = readSessionCache();
        if (cached?.user) {
          setCurrentUser(cached.user);
          setProfile(cached.profile ?? null);
        }
        console.warn('Session could not be verified; using the last known one.', err);
        return readSessionCache()?.user ?? null;
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('nexgram_access_token');
    if (token) {
      authApi.getMe()
        .then(async (user) => {
          if (cancelled) return;
          setCurrentUser(user);
          let profData = null;
          try {
            if (user.role === 'retailer') {
              profData = await profilesApi.getRetailerProfile();
            } else if (user.role === 'distributor') {
              profData = await profilesApi.getDistributorProfile();
            } else if (user.role === 'customer') {
              profData = await storefrontApi.getMe();
            }
            if (!cancelled) setProfile(profData);
          } catch {
            if (!cancelled) setProfile(readSessionCache()?.profile ?? null);
          }
          writeSessionCache(user, profData);
        })
        .catch((err) => {
          if (cancelled) return;
          if (err.status === 401 || err.status === 403) {
            setCurrentUser(null);
            setProfile(null);
            localStorage.removeItem('nexgram_access_token');
            clearSessionCache();
          } else {
            const cached = readSessionCache();
            if (cached?.user) {
              setCurrentUser(cached.user);
              setProfile(cached.profile ?? null);
            }
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }

    // Listen for unauthorized events emitted by fetchApi
    const handleUnauthorized = () => {
      setCurrentUser(null);
      setProfile(null);
      localStorage.removeItem('nexgram_access_token');
      clearSessionCache();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      cancelled = true;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  /**
   * Signs in and returns the user the server actually recognised.
   *
   * The caller needs that to route: the login screen only *guesses* a role
   * from its own path, and distributor credentials typed on the retailer page
   * must still land on the distributor's dashboard rather than a screen that
   * user has no profile for.
   */
  const login = async (mobile, password) => {
    const res = await authApi.login(mobile, password);
    if (!res.access_token) return null;
    localStorage.setItem('nexgram_access_token', res.access_token);
    return fetchCurrentUser();
  };

  /**
   * Opens a demo account, and returns the user the server recognised.
   *
   * No credentials leave the browser. The role is a request, not an assertion:
   * the server picks which seeded account that means, and the session it hands
   * back is an ordinary one.
   */
  const loginAsDemo = async (role) => {
    const res = await authApi.demoLogin(role);
    if (!res.access_token) return null;
    localStorage.setItem('nexgram_access_token', res.access_token);
    return fetchCurrentUser();
  };

  /**
   * Signs in with an identity Clerk has already proved, and returns the user
   * the server recognised.
   *
   * Clerk's token is spent here and never stored. From this line on the session
   * is an ordinary NEXGram one — same token, same expiry, same offline
   * behaviour as a mobile+password sign-in, which is the whole reason the app
   * did not have to change around it.
   */
  const loginWithClerk = async (clerkToken, role) => {
    const res = await authApi.exchangeClerkToken(clerkToken, role);
    if (!res.access_token) return null;
    localStorage.setItem('nexgram_access_token', res.access_token);
    return fetchCurrentUser();
  };

  const register = async (userData) => {
    await authApi.register(userData);
    // Auto login after register
    await login(userData.mobile, userData.password);
  };

  const logout = () => {
    localStorage.removeItem('nexgram_access_token');
    clearSessionCache();
    setCurrentUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      profile,
      setProfile,
      isLoading,
      isAuthenticated: !!currentUser,
      login,
      loginAsDemo,
      loginWithClerk,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
