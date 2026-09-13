import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Landing } from './Landing';
import { ROLES } from '../constants/roles';

/**
 * The front door.
 *
 * Signing in used to be reachable only by typing /login, and the page offered
 * two of the three roles. A returning shopkeeper should not have to know the
 * URL of their own app, and a household should not have to guess that the
 * product includes them.
 */
const login = vi.fn();
const loginAsDemo = vi.fn();
let currentUser = null;

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ login, loginAsDemo, currentUser }),
}));

const renderLanding = () => render(
  <MemoryRouter initialEntries={['/']}>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<p>Login chooser</p>} />
      <Route path="/login/:role" element={<p>Role login</p>} />
      <Route path="/retailer/dashboard" element={<p>Retailer home</p>} />
      <Route path="/distributor/dashboard" element={<p>Distributor home</p>} />
      <Route path="/shop" element={<p>Customer home</p>} />
    </Routes>
  </MemoryRouter>,
);

describe('Landing', () => {
  beforeEach(() => {
    login.mockReset();
    loginAsDemo.mockReset();
    currentUser = null;
    localStorage.clear();
  });

  it('offers a way in for all three roles', () => {
    renderLanding();

    expect(screen.getByText(ROLES.retailer.tagline)).toBeInTheDocument();
    expect(screen.getByText(ROLES.distributor.tagline)).toBeInTheDocument();
    expect(screen.getByText(ROLES.customer.tagline)).toBeInTheDocument();
  });

  it('links each role to its own login page', () => {
    renderLanding();

    const links = screen.getAllByRole('link', { name: 'Login karein' });
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/login/retailer', '/login/distributor', '/login/customer',
    ]);
  });

  it('has a plain login entry in the nav', () => {
    renderLanding();
    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login');
  });

  it('opens a demo with a role and no credentials', async () => {
    // The browser used to post the demo account's mobile and password. It now
    // asks for a role and the server decides which account that is, so the
    // button cannot fail as "wrong password" when a database is simply empty.
    loginAsDemo.mockResolvedValue({ id: 'u1', role: 'customer' });
    const user = userEvent.setup();

    renderLanding();
    await user.click(screen.getAllByRole('button', { name: /Demo kholo/ })[2]);

    await waitFor(() => expect(loginAsDemo).toHaveBeenCalledWith('customer'));
    expect(login).not.toHaveBeenCalled();
    expect(await screen.findByText('Customer home')).toBeInTheDocument();
  });

  it('routes a demo by what the server returned', async () => {
    // Guards against the button, not the account, deciding the destination.
    loginAsDemo.mockResolvedValue({ id: 'u1', role: 'distributor' });
    const user = userEvent.setup();

    renderLanding();
    await user.click(screen.getAllByRole('button', { name: /Demo kholo/ })[0]);

    expect(await screen.findByText('Distributor home')).toBeInTheDocument();
  });

  it('reports a failed demo rather than doing nothing', async () => {
    loginAsDemo.mockRejectedValue(new Error('Backend down'));
    const user = userEvent.setup();

    renderLanding();
    await user.click(screen.getAllByRole('button', { name: /Demo kholo/ })[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent('Backend down');
  });

  it('sends an already signed-in user to their own home', async () => {
    currentUser = { id: 'u1', role: 'customer' };

    renderLanding();

    expect(await screen.findByText('Customer home')).toBeInTheDocument();
  });

  /**
   * The page had grown three ways to start the same demo and two copies of the
   * same diagram. These hold it to saying each thing once.
   */
  describe('says each thing once', () => {
    it('offers each demo from exactly one place', () => {
      // handleDemo was reachable from eight buttons: the three hero cards, a
      // funding section, and a story section — all landing in the same app.
      renderLanding();

      expect(screen.getAllByRole('button', { name: /Demo kholo/ })).toHaveLength(3);
      // And no other button on the page, which is what the extra CTAs were.
      expect(screen.getAllByRole('button')).toHaveLength(3);
    });

    it('draws the demand-to-supply flow once, not once per breakpoint', () => {
      // It was written out twice — a `hidden md:block` grid and a `md:hidden`
      // stack — and the two copies had already drifted apart.
      renderLanding();

      expect(screen.getAllByText('Retailers')).toHaveLength(1);
      expect(screen.getAllByText('Distributors')).toHaveLength(1);
    });

    it('points at the explanation from one link', () => {
      // "Explore NEXGram" scrolled to the same section from the nav, the hero
      // and the closing CTA.
      renderLanding();

      const inPage = screen.getAllByRole('link')
        .filter((a) => a.getAttribute('href')?.startsWith('#'));

      expect(inPage).toHaveLength(1);
    });
  });
});
