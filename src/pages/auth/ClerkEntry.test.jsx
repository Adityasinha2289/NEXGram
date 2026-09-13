import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Login } from './Login';

/**
 * The Clerk entry point on a login page.
 *
 * Clerk itself is never loaded here — the SDK lives in its own lazy chunk and
 * the widget is Clerk's to render. What matters at this seam is that the button
 * appears only when there is an instance to sign in against, and that it does
 * not displace the password form most shopkeepers still use.
 *
 * The exchange behind it is tested in src/context/clerkExchange.test.jsx, which
 * needs the real auth context this file mocks away.
 */
vi.mock('../../config/clerk', () => ({
  isClerkEnabled: true,
  CLERK_PUBLISHABLE_KEY: 'pk_test_fake',
}));

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ login: vi.fn() }),
}));

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/login/:role" element={<Login />} />
      <Route path="/sign-in" element={<p>Clerk sign-in</p>} />
    </Routes>
  </MemoryRouter>,
);

describe('the Clerk entry point', () => {
  it('is offered when an instance is configured', () => {
    renderAt('/login/retailer');

    expect(
      screen.getByRole('button', { name: /OTP, Google ya email se sign in/ }),
    ).toBeInTheDocument();
  });

  it('opens the Clerk sign-in screen', async () => {
    const user = userEvent.setup();

    renderAt('/login/distributor');
    await user.click(screen.getByRole('button', { name: /OTP, Google ya email se sign in/ }));

    expect(await screen.findByText('Clerk sign-in')).toBeInTheDocument();
  });

  it('leaves mobile and password as the primary way in', () => {
    // Clerk is an addition, not a replacement.
    renderAt('/login/retailer');

    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Mobile/i)).toBeInTheDocument();
  });
});
