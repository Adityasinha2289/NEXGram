import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ShopCatalogue } from './ShopCatalogue';
import { storefrontApi } from '../../services/api/storefrontApi';

/**
 * A household ordering from the kirana two streets away.
 *
 * The quantity caps are the interesting part: this is the same shelf the
 * counter sells from, so someone walking in can take the last one while this
 * basket is open.
 */
const SHOP = {
  shopId: 'ret_01',
  name: 'Gupta Kirana Store',
  area: 'Palampur Market',
  items: [
    {
      inventoryId: 'inv-milk',
      name: 'Milk',
      variant: '500ml',
      unit: 'ml',
      category: 'Dairy',
      price: 30,
      available: 6,
    },
    {
      inventoryId: 'inv-atta',
      name: 'Atta',
      variant: '5kg',
      unit: 'kg',
      category: 'Staples',
      price: 245,
      available: 2,
    },
  ],
};

const renderCatalogue = () => render(
  <MemoryRouter initialEntries={['/shop/ret_01']}>
    <Routes>
      <Route path="/shop/:shopId" element={<ShopCatalogue />} />
      <Route path="/shop/orders/:orderId" element={<p>Order placed</p>} />
    </Routes>
  </MemoryRouter>,
);

describe('ShopCatalogue', () => {
  it('shows what the shop has on the shelf right now', async () => {
    vi.spyOn(storefrontApi, 'getShop').mockResolvedValue(SHOP);

    renderCatalogue();

    expect(await screen.findByText('Gupta Kirana Store')).toBeInTheDocument();
    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText(/₹30 · 6 bache/)).toBeInTheDocument();
  });

  it('adds an item and totals the basket', async () => {
    vi.spyOn(storefrontApi, 'getShop').mockResolvedValue(SHOP);
    const user = userEvent.setup();

    renderCatalogue();
    await user.click((await screen.findAllByRole('button', { name: 'Add' }))[0]);

    expect(await screen.findByText('₹30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Order karein/ })).toBeInTheDocument();
  });

  it('will not let a customer order more than the shop has', async () => {
    vi.spyOn(storefrontApi, 'getShop').mockResolvedValue(SHOP);
    const user = userEvent.setup();

    renderCatalogue();
    // Atta has two on the shelf.
    await user.click((await screen.findAllByRole('button', { name: 'Add' }))[1]);
    await user.click(screen.getByRole('button', { name: 'Atta aur lein' }));

    expect(screen.getByRole('button', { name: 'Atta aur lein' })).toBeDisabled();
  });

  it('places the order and goes to it', async () => {
    vi.spyOn(storefrontApi, 'getShop').mockResolvedValue(SHOP);
    const spy = vi.spyOn(storefrontApi, 'placeOrder').mockResolvedValue({ id: 'ord-1' });
    const user = userEvent.setup();

    renderCatalogue();
    await user.click((await screen.findAllByRole('button', { name: 'Add' }))[0]);
    await user.click(screen.getByRole('button', { name: /Order karein/ }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith({
      shop_id: 'ret_01',
      items: [{ inventory_id: 'inv-milk', quantity: 1 }],
      note: undefined,
    }));
    expect(await screen.findByText('Order placed')).toBeInTheDocument();
  });

  it('shows the server reason when an order is refused', async () => {
    // The counter may have sold the last one between browsing and ordering.
    vi.spyOn(storefrontApi, 'getShop').mockResolvedValue(SHOP);
    vi.spyOn(storefrontApi, 'placeOrder').mockRejectedValue(
      new Error('Milk: sirf 1 available hain'),
    );
    const user = userEvent.setup();

    renderCatalogue();
    await user.click((await screen.findAllByRole('button', { name: 'Add' }))[0]);
    await user.click(screen.getByRole('button', { name: /Order karein/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Milk: sirf 1 available hain');
  });

  it('says so when a shop has nothing listed online', async () => {
    vi.spyOn(storefrontApi, 'getShop').mockResolvedValue({ ...SHOP, items: [] });

    renderCatalogue();

    expect(
      await screen.findByText('Is dukaan ne abhi kuch online nahi rakha'),
    ).toBeInTheDocument();
  });

  it('surfaces a failed load instead of an empty shop', async () => {
    vi.spyOn(storefrontApi, 'getShop').mockRejectedValue(new Error('Yeh dukaan nahi mili'));

    renderCatalogue();

    expect(await screen.findByText('Yeh dukaan nahi mili')).toBeInTheDocument();
  });
});
