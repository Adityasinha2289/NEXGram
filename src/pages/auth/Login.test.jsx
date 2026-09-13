import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Login } from './Login';
import { ROLES } from '../../constants/roles';

/**
 * Signing in, one screen per side of the market.
 *
 * The role in the path is a hint for the *screen*. What the account actually
 * is comes back from the server, and that is what decides where the user
 * lands — a distributor signing in on the retailer page must not be dropped on
 * a dashboard they have no profile for.
 */
const login = vi.fn();

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ login }),
}));

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/login/:role" element={<Login />} />
      <Route path="/retailer/dashboard" element={<p>Retailer home</p>} />
      <Route path="/distributor/dashboard" element={<p>Distributor home</p>} />
      <Route path="/shop" element={<p>Customer home</p>} />
      <Route path="/register" element={<p>Register</p>} />
    </Routes>
  </MemoryRouter>,
);

describe('Login', () => {
  beforeEach(() => {
    login.mockReset();
    localStorage.clear();
  });

  describe('the chooser at /login', () => {
    it('asks which role before asking for a number', () => {
      renderAt('/login');

      expect(screen.getByText('Aap kaun hain?')).toBeInTheDocument();
      expect(screen.queryByLabelText('Mobile number')).not.toBeInTheDocument();
    });

    it('offers all three sides of the market', () => {
      renderAt('/login');

      expect(screen.getByRole('link', { name: /Retailer/ })).toHaveAttribute('href', '/login/retailer');
      expect(screen.getByRole('link', { name: /Distributor/ })).toHaveAttribute('href', '/login/distributor');
      expect(screen.getByRole('link', { name: /Customer/ })).toHaveAttribute('href', '/login/customer');
    });
  });

  describe('a role-specific page', () => {
    it('names the role it is for', () => {
      renderAt('/login/distributor');

      expect(screen.getByRole('heading', { name: 'Distributor login' })).toBeInTheDocument();
      expect(screen.getByLabelText('Mobile number')).toBeInTheDocument();
    });

    it('offers only that role’s demo account', () => {
      renderAt('/login/customer');

      expect(
        screen.getByRole('button', { name: `${ROLES.customer.demo.label} se khol dein` }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Gupta Kirana Store/ }),
      ).not.toBeInTheDocument();
    });

    it('lets the user go back and pick a different role', () => {
      renderAt('/login/retailer');
      expect(screen.getByRole('link', { name: 'Badlein' })).toHaveAttribute('href', '/login');
    });

    it('signs in and lands on that role’s home', async () => {
      login.mockResolvedValue({ id: 'u1', role: 'distributor' });
      const user = userEvent.setup();

      renderAt('/login/distributor');
      await user.type(screen.getByLabelText('Mobile number'), '9100000002');
      await user.type(screen.getByLabelText('Password'), 'demo1234');
      await user.click(screen.getByRole('button', { name: 'Login' }));

      expect(await screen.findByText('Distributor home')).toBeInTheDocument();
    });

    it('routes by what the server says, not by which page was used', async () => {
      // Distributor credentials typed on the retailer page.
      login.mockResolvedValue({ id: 'u1', role: 'distributor' });
      const user = userEvent.setup();

      renderAt('/login/retailer');
      await user.type(screen.getByLabelText('Mobile number'), '9100000002');
      await user.type(screen.getByLabelText('Password'), 'demo1234');
      await user.click(screen.getByRole('button', { name: 'Login' }));

      expect(await screen.findByText('Distributor home')).toBeInTheDocument();
    });

    it('sends a customer to the storefront', async () => {
      login.mockResolvedValue({ id: 'u1', role: 'customer' });
      const user = userEvent.setup();

      renderAt('/login/customer');
      await user.click(
        screen.getByRole('button', { name: `${ROLES.customer.demo.label} se khol dein` }),
      );

      expect(await screen.findByText('Customer home')).toBeInTheDocument();
    });

    it('surfaces a rejected sign-in', async () => {
      login.mockRejectedValue(new Error('Mobile number ya password galat hai'));
      const user = userEvent.setup();

      renderAt('/login/retailer');
      await user.type(screen.getByLabelText('Mobile number'), '9000000001');
      await user.type(screen.getByLabelText('Password'), 'wrong');
      await user.click(screen.getByRole('button', { name: 'Login' }));

      expect(await screen.findByRole('alert'))
        .toHaveTextContent('Mobile number ya password galat hai');
    });

    it('uses the demo credentials the seed actually created', async () => {
      login.mockResolvedValue({ id: 'u1', role: 'retailer' });
      const user = userEvent.setup();

      renderAt('/login/retailer');
      await user.click(
        screen.getByRole('button', { name: `${ROLES.retailer.demo.label} se khol dein` }),
      );

      await waitFor(() => expect(login).toHaveBeenCalledWith(
        ROLES.retailer.demo.mobile, ROLES.retailer.demo.password,
      ));
    });
  });

  it('treats an unknown role in the path as a typo, not a fourth role', () => {
    renderAt('/login/banker');
    expect(screen.getByText('Aap kaun hain?')).toBeInTheDocument();
  });
});
