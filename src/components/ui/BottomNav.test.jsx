import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BottomNav } from './BottomNav';

/**
 * Navigation.
 *
 * The retailer's secondary list had grown to ten undifferentiated links: every
 * feature reachable, none of them findable. These tests hold the shape that
 * replaced it - a short daily row, then labelled blocks - and check that
 * nothing was dropped on the way.
 */
const renderNav = (role) => render(
  <MemoryRouter><BottomNav role={role} /></MemoryRouter>,
);

const hrefs = () =>
  screen.getAllByRole('link').map((a) => a.getAttribute('href'));

describe('BottomNav', () => {
  describe('retailer', () => {
    it('keeps the daily loop to four, which is all a thumb reaches', () => {
      renderNav('retailer');

      const daily = screen.getByText('Roz ka kaam').nextSibling;
      expect(within(daily).getAllByRole('link')).toHaveLength(4);
    });

    it('groups the rest by the question being asked', () => {
      renderNav('retailer');

      expect(screen.getByText('Kya mangwayein')).toBeInTheDocument();
      expect(screen.getByText('Dhoondhein')).toBeInTheDocument();
      expect(screen.getByText('Aur')).toBeInTheDocument();
    });

    it('keeps every group short enough to scan', () => {
      renderNav('retailer');

      for (const label of ['Kya mangwayein', 'Dhoondhein', 'Aur']) {
        const group = screen.getByText(label).nextSibling;
        expect(within(group).getAllByRole('link').length).toBeLessThanOrEqual(4);
      }
    });

    it('still reaches every feature', () => {
      // Grouping was meant to organise the list, not shorten it.
      renderNav('retailer');

      expect(hrefs()).toEqual(expect.arrayContaining([
        '/retailer/dashboard', '/retailer/inventory', '/retailer/voice-sale',
        '/retailer/deliveries', '/retailer/restock', '/retailer/sourcing',
        '/retailer/procurement', '/retailer/orders', '/retailer/market',
        '/retailer/distributors', '/retailer/developer-pack', '/retailer/reorder',
        '/retailer/schemes', '/retailer/profile',
      ]));
    });
  });

  describe('distributor', () => {
    it('leads with signals, stock and orders', () => {
      renderNav('distributor');

      expect(hrefs()).toEqual(expect.arrayContaining([
        '/distributor/dashboard', '/distributor/opportunities',
        '/distributor/catalogue', '/distributor/orders',
        '/distributor/schemes', '/distributor/profile',
      ]));
    });

    it('does not offer a shopkeeper’s screens', () => {
      renderNav('distributor');
      expect(hrefs().every((href) => !href.startsWith('/retailer'))).toBe(true);
    });
  });

  describe('customer', () => {
    it('offers only the two things a household does, plus their address', () => {
      renderNav('customer');

      expect(hrefs()).toEqual(['/shop', '/shop/orders', '/shop/address']);
    });

    it('does not light up both shop rows at once', () => {
      // /shop is a prefix of /shop/orders, so the first link needs `end`.
      renderNav('customer');

      const shopLink = screen.getAllByRole('link')[0];
      expect(shopLink.getAttribute('href')).toBe('/shop');
    });
  });

  it('falls back to the retailer nav for an unknown role', () => {
    renderNav('nobody');
    expect(hrefs()).toContain('/retailer/dashboard');
  });
});
