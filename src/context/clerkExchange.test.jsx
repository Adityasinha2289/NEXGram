import { useEffect } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';
import { authApi } from '../services/api/authApi';
import { profilesApi } from '../services/api/profilesApi';
import { storefrontApi } from '../services/api/storefrontApi';

/**
 * Trading a Clerk token for a NEXGram session.
 *
 * The point of the exchange is what is *not* kept. Clerk's session token lives
 * sixty seconds and its web SDK cannot refresh one without a network, so a shop
 * that loses signal behind the counter would start getting 401s mid-sale. What
 * the app stores is its own week-long token, and from that moment a Clerk
 * sign-in is indistinguishable from a password one.
 */
function probe() {
  // Captured in an effect rather than during render: assigning to an outer
  // variable mid-render is a side effect, and React is free to render twice.
  const held = { current: null };
  function Probe() {
    const auth = useAuth();
    useEffect(() => { held.current = auth; }, [auth]);
    return null;
  }
  render(<AuthProvider><Probe /></AuthProvider>);
  return () => held.current;
}

describe('loginWithClerk', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    // Signing in loads the role's profile next. Left real, that call reaches
    // the dev API, 401s on a fake token, and the app's own auth:unauthorized
    // handler clears the session this test is checking for.
    vi.spyOn(profilesApi, 'getRetailerProfile').mockResolvedValue({});
    vi.spyOn(profilesApi, 'getDistributorProfile').mockResolvedValue({});
    vi.spyOn(storefrontApi, 'getMe').mockResolvedValue({});
  });

  it('stores the NEXGram token, not the Clerk one', async () => {
    vi.spyOn(authApi, 'exchangeClerkToken').mockResolvedValue({
      access_token: 'nexgram-session-token',
      token_type: 'bearer',
    });
    vi.spyOn(authApi, 'getMe').mockResolvedValue({ id: 'u1', role: 'distributor' });

    const auth = probe();
    const user = await auth().loginWithClerk('clerk-token-abc', 'retailer');

    expect(authApi.exchangeClerkToken).toHaveBeenCalledWith('clerk-token-abc', 'retailer');
    expect(localStorage.getItem('nexgram_access_token')).toBe('nexgram-session-token');
    expect(user.role).toBe('distributor');
  });

  it('routes by what the server returned, not the role that was asked for', async () => {
    // The role in the URL is a hint for a first-time signup. An account that
    // already exists keeps what it is — the same rule the password form
    // follows, so arriving through the wrong door cannot change anyone's role.
    vi.spyOn(authApi, 'exchangeClerkToken').mockResolvedValue({
      access_token: 't', token_type: 'bearer',
    });
    vi.spyOn(authApi, 'getMe').mockResolvedValue({ id: 'u2', role: 'customer' });

    const auth = probe();
    const user = await auth().loginWithClerk('clerk-token', 'retailer');

    expect(user.role).toBe('customer');
  });

  it('leaves no session behind when the exchange is refused', async () => {
    vi.spyOn(authApi, 'exchangeClerkToken').mockRejectedValue(
      new Error('Clerk session valid nahi hai.'),
    );

    const auth = probe();

    await expect(auth().loginWithClerk('forged', 'retailer')).rejects.toThrow(/valid nahi/);
    expect(localStorage.getItem('nexgram_access_token')).toBeNull();
  });

  it('does not sign anyone in on an empty response', async () => {
    vi.spyOn(authApi, 'exchangeClerkToken').mockResolvedValue({});

    const auth = probe();
    const user = await auth().loginWithClerk('clerk-token', 'retailer');

    expect(user).toBeNull();
    expect(localStorage.getItem('nexgram_access_token')).toBeNull();
  });
});
