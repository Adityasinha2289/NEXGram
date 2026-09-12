import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));

import { useAuth } from '../../context/AuthContext';
import { RequireOnboarding } from './RequireOnboarding';

/**
 * Onboarding is where demand is captured, so a user who slips past it
 * contributes nothing to the intelligence layer and sees an empty app.
 */

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/retailer" element={<RequireOnboarding />}>
          <Route path="onboarding" element={<p>onboarding</p>} />
          <Route path="dashboard" element={<p>dashboard</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireOnboarding', () => {
  it('sends an incomplete profile to onboarding', () => {
    useAuth.mockReturnValue({
      currentUser: { role: 'retailer' },
      profile: { profile_complete: false },
    });

    renderAt('/retailer/dashboard');
    expect(screen.getByText('onboarding')).toBeInTheDocument();
  });

  it('lets a complete profile through', () => {
    useAuth.mockReturnValue({
      currentUser: { role: 'retailer' },
      profile: { profile_complete: true },
    });

    renderAt('/retailer/dashboard');
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });

  it('does not redirect onboarding to itself', () => {
    // Guarding the page it redirects to would loop forever.
    useAuth.mockReturnValue({
      currentUser: { role: 'retailer' },
      profile: { profile_complete: false },
    });

    renderAt('/retailer/onboarding');
    expect(screen.getByText('onboarding')).toBeInTheDocument();
  });

  it('waits rather than redirecting while the profile is still loading', () => {
    // Redirecting on a null profile would bounce every user through onboarding
    // on each page load before their profile arrives.
    useAuth.mockReturnValue({ currentUser: { role: 'retailer' }, profile: null });

    renderAt('/retailer/dashboard');
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });
});
