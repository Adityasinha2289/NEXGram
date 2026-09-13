import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Shops } from './Shops';
import { storefrontApi } from '../../services/api/storefrontApi';

/**
 * The household's home screen: the shops close enough to walk a delivery from.
 *
 * Captured from the running API. One shop, which is the normal case in a
 * village and the reason the radius has to explain itself.
 */
const SHOPS = [
  {
    shopId: 'ret_01',
    name: 'Gupta Kirana Store',
    businessType: 'General Store',
    area: 'Palampur Market',
    distanceKm: 0.38,
    distanceLabel: 'Aapke paas hi',
    itemsAvailable: 8,
    deliveryEstimate: '10-15 min',
  },
];

const renderShops = () => render(
  <MemoryRouter initialEntries={['/shop']}>
    <Routes>
      <Route path="/shop" element={<Shops />} />
      <Route path="/shop/address" element={<p>Address page</p>} />
      <Route path="/shop/:shopId" element={<p>Shop catalogue</p>} />
    </Routes>
  </MemoryRouter>,
);

describe('Shops', () => {
  it('lists the shops that can deliver here', async () => {
    vi.spyOn(storefrontApi, 'getShops').mockResolvedValue(SHOPS);

    renderShops();

    expect(await screen.findByText('Gupta Kirana Store')).toBeInTheDocument();
    expect(screen.getByText('Aapke paas hi')).toBeInTheDocument();
    expect(screen.getByText('10-15 min')).toBeInTheDocument();
  });

  it('says what kind of shop it is', async () => {
    // businessType rode in on every payload and the row dropped it — it is the
    // one fact that says whether they sell what the household came for.
    vi.spyOn(storefrontApi, 'getShops').mockResolvedValue(SHOPS);

    renderShops();

    expect(await screen.findByText('General Store')).toBeInTheDocument();
  });

  it('explains the short list under it, where the question gets asked', async () => {
    vi.spyOn(storefrontApi, 'getShops').mockResolvedValue(SHOPS);

    renderShops();
    await screen.findByText('Gupta Kirana Store');

    expect(screen.getByText(/cycle ya paidal karta hai/)).toBeInTheDocument();
  });

  it('offers to fix the address when nothing is in range', async () => {
    vi.spyOn(storefrontApi, 'getShops').mockResolvedValue([]);

    renderShops();

    expect(await screen.findByText('Aapke paas koi dukaan online nahi hai')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Address theek karein/ })).toBeInTheDocument();
  });

  it('does not explain a radius when there is no list to explain', async () => {
    vi.spyOn(storefrontApi, 'getShops').mockResolvedValue([]);

    renderShops();
    await screen.findByText('Aapke paas koi dukaan online nahi hai');

    expect(screen.queryByText(/cycle ya paidal karta hai/)).not.toBeInTheDocument();
  });
});
