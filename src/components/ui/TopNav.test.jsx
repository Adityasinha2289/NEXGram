import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopNav } from './TopNav';

/**
 * The header.
 *
 * The role switcher that used to live here signed you into a different demo
 * account in place — a shopkeeper does not become a distributor, so swapping
 * identity mid-screen read as a fault. Leaving is now an explicit exit to the
 * home page, which is where the three demos live.
 */
const logout = vi.fn();
let currentUser = { id: 'u1', name: 'Ashok', role: 'retailer' };

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ currentUser, logout }),
}));

vi.mock('./AlertsBell', () => ({
  AlertsBell: () => <button type="button" aria-label="Alerts">bell</button>,
}));

const renderNav = (props = {}) => render(
  <MemoryRouter initialEntries={['/retailer/dashboard']}>
    <Routes>
      <Route path="/retailer/dashboard" element={<TopNav title="Home" {...props} />} />
      <Route path="/" element={<p>Landing page</p>} />
      <Route path="/retailer/profile" element={<p>Profile page</p>} />
    </Routes>
  </MemoryRouter>,
);

describe('TopNav', () => {
  beforeEach(() => {
    logout.mockReset();
    currentUser = { id: 'u1', name: 'Ashok', role: 'retailer' };
  });

  it('no longer offers a role switcher', () => {
    renderNav();

    expect(screen.queryByText('Retailer')).not.toBeInTheDocument();
    expect(screen.queryByText('Distributor')).not.toBeInTheDocument();
  });

  it('offers a way out of the demo', () => {
    renderNav();
    expect(screen.getByRole('button', { name: 'Bahar niklein' })).toBeInTheDocument();
  });

  it('ends the session on the way out', async () => {
    // The landing page bounces a signed-in user back to their dashboard, so
    // exiting has to actually log out or the click appears to do nothing.
    const user = userEvent.setup();

    renderNav();
    await user.click(screen.getByRole('button', { name: 'Bahar niklein' }));

    await waitFor(() => expect(logout).toHaveBeenCalled());
  });

  it('lands on the home page, where the other demos are', async () => {
    const user = userEvent.setup();

    renderNav();
    await user.click(screen.getByRole('button', { name: 'Bahar niklein' }));

    expect(await screen.findByText('Landing page')).toBeInTheDocument();
  });

  it('opens the profile for a business account', async () => {
    const user = userEvent.setup();

    renderNav();
    await user.click(screen.getByRole('button', { name: 'Mera profile' }));

    expect(await screen.findByText('Profile page')).toBeInTheDocument();
  });

  it('hides alerts from a household, who has none', () => {
    // The endpoint refuses a customer; offering the bell would only 403.
    currentUser = { id: 'u2', name: 'Sunita', role: 'customer' };

    renderNav();

    expect(screen.queryByRole('button', { name: 'Alerts' })).not.toBeInTheDocument();
  });

  it('shows alerts to a shop', () => {
    renderNav();
    expect(screen.getByRole('button', { name: 'Alerts' })).toBeInTheDocument();
  });

  it('shows nothing but the title when signed out', () => {
    currentUser = null;

    renderNav();

    expect(screen.queryByRole('button', { name: 'Bahar niklein' })).not.toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});
