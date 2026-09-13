import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RetailerDashboard } from './Dashboard';
import { intelligenceApi } from '../../services/api/intelligenceApi';

/**
 * The shopkeeper's home screen.
 *
 * The payload below is the demo shop's real response, captured from the running
 * API — including the parts that made the old layout look cluttered: four
 * recommended products whose availability badge says the same thing every time,
 * and a suggested quantity that is capped by the supplier's stock without ever
 * saying so.
 */
const DASHBOARD = {
  businessName: 'Gupta Kirana Store',
  location: { area: 'Palampur Market', district: 'Kangra' },
  developerPack: {
    title: 'Starter Pack for Your Shop',
    description: 'Aapke area ki demand aur budget ke hisaab se suggested products.',
    items: [
      {
        id: 'cat_dist_sharma_paneer_200g',
        name: 'Paneer',
        variant: '200g',
        unit: 'g',
        suggestedQuantity: 140,
        lineTotal: 8680,
        stockCapped: true,
        distributorName: 'Sharma Distributors',
      },
      {
        id: 'cat_dist_verma_biscuits_box',
        name: 'Biscuits',
        variant: 'Box of 12',
        unit: 'packs',
        suggestedQuantity: 13,
        lineTotal: 3120,
        stockCapped: false,
        distributorName: 'Verma Traders',
      },
    ],
    estimatedTotal: 14914,
    budget: { min: 25000, max: 50000 },
  },
  snapshot: {
    health: 'Achha',
    healthLabel: 'Business profile complete',
    demand: 'High',
    demandLabel: 'Area mein demand strong hai',
    opportunity: '4',
    opportunityLabel: 'Products worth checking',
  },
  recommendedProducts: [
    {
      id: 'p1',
      name: 'Paneer',
      category: 'Dairy',
      demand: 'High',
      demandBadge: 'success',
      availability: 'Limited',
      availabilityBadge: 'warning',
      retailers: 14,
      suppliers: 1,
    },
    {
      id: 'p2',
      name: 'Biscuits',
      category: 'Snacks',
      demand: 'Low',
      demandBadge: 'primary',
      availability: 'Limited',
      availabilityBadge: 'warning',
      retailers: 1,
      suppliers: 0,
    },
  ],
  reorderItems: [{ id: 'prod_milk', name: 'Milk', lastOrdered: '5 days ago' }],
  nearbyDistributors: [
    {
      id: 'dist_sharma',
      name: 'Sharma Distributors',
      categories: 'Dairy',
      distance: 'Aapke area mein',
      delivery: 'Khud delivery karte hain',
    },
  ],
};

const renderDashboard = () => render(
  <MemoryRouter initialEntries={['/retailer/dashboard']}>
    <Routes>
      <Route path="/retailer/dashboard" element={<RetailerDashboard />} />
      <Route path="/retailer/voice-sale" element={<p>Voice sale</p>} />
      <Route path="/retailer/inventory" element={<p>Inventory</p>} />
      <Route path="/retailer/report-demand" element={<p>Report demand</p>} />
      <Route path="/retailer/developer-pack" element={<p>Pack</p>} />
      <Route path="/retailer/reorder" element={<p>Reorder</p>} />
      <Route path="/retailer/distributors" element={<p>Distributors</p>} />
    </Routes>
  </MemoryRouter>,
);

/** Where each string first appears in the rendered page, in reading order. */
const positionOf = (text) => document.body.textContent.indexOf(text);

describe('RetailerDashboard', () => {
  it('renders the live payload', async () => {
    vi.spyOn(intelligenceApi, 'getRetailerDashboard').mockResolvedValue(DASHBOARD);

    renderDashboard();

    expect(await screen.findByText('Namaste, Gupta Kirana Store')).toBeInTheDocument();
    expect(screen.getByText('Palampur Market, Kangra')).toBeInTheDocument();
  });

  it('puts the readings and the daily controls above the lists', async () => {
    // Both used to live in the right-hand column, which a phone renders last:
    // the health of the business was at the bottom of the scroll, under four
    // sections, on the device this user actually owns.
    vi.spyOn(intelligenceApi, 'getRetailerDashboard').mockResolvedValue(DASHBOARD);

    renderDashboard();
    await screen.findByText('Namaste, Gupta Kirana Store');

    expect(positionOf('Health')).toBeLessThan(positionOf('Bol kar bechein'));
    expect(positionOf('Bol kar bechein')).toBeLessThan(positionOf('Aaj ka suggestion'));
    expect(positionOf('Aaj ka suggestion')).toBeLessThan(positionOf('Dobara order'));
  });

  it('offers the three daily actions as one strip', async () => {
    // They were drawn three different ways — one tinted, one plain, one in a
    // terracotta banner with its own heading — so three equivalent actions read
    // as three unrelated features.
    vi.spyOn(intelligenceApi, 'getRetailerDashboard').mockResolvedValue(DASHBOARD);
    const user = userEvent.setup();

    renderDashboard();
    await user.click(await screen.findByRole('button', { name: /Demand batayein/ }));

    expect(await screen.findByText('Report demand')).toBeInTheDocument();
  });

  it('opens the voice sale from the accented tile', async () => {
    vi.spyOn(intelligenceApi, 'getRetailerDashboard').mockResolvedValue(DASHBOARD);
    const user = userEvent.setup();

    renderDashboard();
    await user.click(await screen.findByRole('button', { name: /Bol kar bechein/ }));

    expect(await screen.findByText('Voice sale')).toBeInTheDocument();
  });

  it('says why a suggested quantity is lower than the demand', async () => {
    // stockCapped rode in on every payload and the row threw it away, which
    // left the number looking arbitrary.
    vi.spyOn(intelligenceApi, 'getRetailerDashboard').mockResolvedValue(DASHBOARD);

    renderDashboard();

    expect(await screen.findByText(/supplier ke stock tak/)).toBeInTheDocument();
  });

  it('puts the pack total next to the budget it has to fit', async () => {
    vi.spyOn(intelligenceApi, 'getRetailerDashboard').mockResolvedValue(DASHBOARD);

    renderDashboard();

    expect(await screen.findByText('₹14,914')).toBeInTheDocument();
    expect(screen.getByText('Aapka budget ₹25,000–₹50,000')).toBeInTheDocument();
  });

  it('states a signal as evidence rather than a row of chips', async () => {
    // Every row carried a Demand chip and a Supply chip. On live data five of
    // the eight said "Supply Limited" — a wall of identical orange carrying no
    // information. The numbers underneath are what actually differ.
    vi.spyOn(intelligenceApi, 'getRetailerDashboard').mockResolvedValue(DASHBOARD);

    renderDashboard();

    expect(await screen.findByText('High demand')).toBeInTheDocument();
    expect(screen.getByText('1 local supplier')).toBeInTheDocument();
    expect(screen.getByText('koi local supplier nahi')).toBeInTheDocument();
  });

  it('does not label a row with the heading it already sits under', async () => {
    // Each reorder row ended in the words "Dobara order", inside a section
    // titled "Dobara order", next to a chevron already saying it leads on.
    vi.spyOn(intelligenceApi, 'getRetailerDashboard').mockResolvedValue(DASHBOARD);

    renderDashboard();
    await screen.findByText('Namaste, Gupta Kirana Store');

    expect(screen.getAllByText('Dobara order')).toHaveLength(1);
  });

  it('keeps every destination the old layout reached', async () => {
    vi.spyOn(intelligenceApi, 'getRetailerDashboard').mockResolvedValue(DASHBOARD);

    renderDashboard();
    await screen.findByText('Namaste, Gupta Kirana Store');

    for (const label of [/Bol kar bechein/, /Mera stock/, /Demand batayein/, /Pack dekho/]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByText('Sharma Distributors')).toBeInTheDocument();
    expect(screen.getByText('Milk')).toBeInTheDocument();
  });
});
