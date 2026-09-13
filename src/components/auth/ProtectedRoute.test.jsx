import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';

/**
 * The route guard.
 *
 * It used to silently sign a signed-out visitor into a demo account, which made
 * the app impossible to leave: exit ended the session, the guard saw a
 * signed-out user a frame later and signed them straight back in. The home page
 * now offers all three demos in one tap, so the auto-login bought nothing.
 */
let auth = { currentUser: null, isAuthenticated: false, isLoading: false };

vi.mock('../../context/useAuth', () => ({
  useAuth: () => auth,
}));

const renderGuard = (allowedRoles) => render(
  <MemoryRouter initialEntries={['/retailer/dashboard']}>
    <Routes>
      <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
        <Route path="/retailer/dashboard" element={<p>Retailer dashboard</p>} />
      </Route>
      <Route path="/login" element={<p>Login chooser</p>} />
      <Route path="/distributor/dashboard" element={<p>Distributor dashboard</p>} />
      <Route path="/shop" element={<p>Storefront</p>} />
    </Routes>
  </MemoryRouter>,
);

describe('ProtectedRoute', () => {
  it('sends a signed-out visitor to the login chooser', () => {
    auth = { currentUser: null, isAuthenticated: false, isLoading: false };

    renderGuard(['retailer']);

    expect(screen.getByText('Login chooser')).toBeInTheDocument();
  });

  it('does not sign anyone in on its own', () => {
    // The bug this replaced: an exit that undid itself a frame later.
    auth = { currentUser: null, isAuthenticated: false, isLoading: false };

    renderGuard(['retailer']);

    expect(screen.queryByText('Retailer dashboard')).not.toBeInTheDocument();
  });

  it('lets the right role through', () => {
    auth = {
      currentUser: { id: 'u1', role: 'retailer' },
      isAuthenticated: true,
      isLoading: false,
    };

    renderGuard(['retailer']);

    expect(screen.getByText('Retailer dashboard')).toBeInTheDocument();
  });

  it('sends the wrong role to their own home rather than telling them off', () => {
    auth = {
      currentUser: { id: 'u2', role: 'distributor' },
      isAuthenticated: true,
      isLoading: false,
    };

    renderGuard(['retailer']);

    expect(screen.getByText('Distributor dashboard')).toBeInTheDocument();
  });

  it('sends a household to the storefront', () => {
    auth = {
      currentUser: { id: 'u3', role: 'customer' },
      isAuthenticated: true,
      isLoading: false,
    };

    renderGuard(['retailer']);

    expect(screen.getByText('Storefront')).toBeInTheDocument();
  });

  it('waits rather than redirecting while the session is still resolving', () => {
    // Redirecting here would bounce a returning user off their own app on
    // every cold load.
    auth = { currentUser: null, isAuthenticated: false, isLoading: true };

    renderGuard(['retailer']);

    expect(screen.queryByText('Login chooser')).not.toBeInTheDocument();
    expect(screen.queryByText('Retailer dashboard')).not.toBeInTheDocument();
  });
});
