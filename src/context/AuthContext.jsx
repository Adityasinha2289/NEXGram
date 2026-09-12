import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api/authApi';
import { profilesApi } from '../services/api/profilesApi';
import { DEMO_ACCOUNTS } from '../constants/demoAccounts';
import { IS_EXPLORATION_MODE } from '../constants/config';
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
        }
        setProfile(profData);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setProfile(readSessionCache()?.profile ?? null);
      }

      writeSessionCache(user, profData);
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
      }
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

  const login = async (mobile, password) => {
    const res = await authApi.login(mobile, password);
    if (res.access_token) {
      localStorage.setItem('nexgram_access_token', res.access_token);
      await fetchCurrentUser();
    }
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

  /**
   * Exploration Mode: Switch session to a seeded development account
   * for either retailer or distributor seamlessly with a real backend JWT.
   */
  const switchRole = async (targetRole) => {
    const account = DEMO_ACCOUNTS[targetRole];
    if (!account) return;
    setIsLoading(true);
    try {
      await login(account.mobile, account.password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      profile,
      setProfile,
      isLoading,
      isAuthenticated: !!currentUser,
      login,
      register,
      logout,
      switchRole,
      isExplorationMode: IS_EXPLORATION_MODE,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
