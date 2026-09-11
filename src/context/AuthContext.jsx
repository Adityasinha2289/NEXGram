import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api/authApi';
import { profilesApi } from '../services/api/profilesApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
      
      // Fetch Profile
      try {
        let profData = null;
        if (user.role === 'retailer') {
          profData = await profilesApi.getRetailerProfile();
        } else if (user.role === 'distributor') {
          profData = await profilesApi.getDistributorProfile();
        }
        setProfile(profData);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
      
    } catch (err) {
      console.error('Failed to fetch user session:', err);
      setCurrentUser(null);
      setProfile(null);
      localStorage.removeItem('nexgram_access_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();

    // Listen for unauthorized events emitted by fetchApi
    const handleUnauthorized = () => {
      setCurrentUser(null);
      localStorage.removeItem('nexgram_access_token');
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [fetchCurrentUser]);

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
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
