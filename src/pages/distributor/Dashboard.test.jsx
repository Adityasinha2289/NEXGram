import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DistributorDashboard } from './Dashboard';
import { intelligenceApi } from '../../services/api/intelligenceApi';

/**
 * The supplier's home screen.
 *
 * Captured from the running API. The two category-level Dairy signals are the
 * interesting part: they arrive with `product` set to the category name, so the
 * old row rendered them as two entries both titled "Dairy" with nothing visible
 * to tell them apart.
 */
const DASHBOARD = {
  businessName: 'Himachal Dairy Co',
  location: { area: 'Palampur Market', district: 'Kangra' },
  snapshot: {
    opportunityScore: '88/100',
    opportunityLabel: 'Bahut achha scope hai',
    opportunityTier: 'Strong',
    opportunityVariant: 'success',
    retailersLooking: 25,
    retailersLabel: 'Aapke district mein demand',
  },
  demandGaps: [
    {
      id: 'g1',
      category: 'Dairy',
      product: 'Paneer',
      demand: 'High',
      retailers: 14,
      supply: 'Limited (1 supplier)',
      opportunity: 'Strong',
      badgeVariant: 'success',
      score: 88.2,
      confidence: 'High',
    },
    {
      id: 'g2',
      category: 'Dairy',
      product: 'Dairy',
      demand: 'High',
      retailers: 14,
      supply: 'Available (3 suppliers)',
      opportunity: 'Good',
      badgeVariant: 'primary',
      score: 70.8,
      confidence: 'High',
    },
    {
      id: 'g3',
      category: 'Dairy',
      product: 'Dairy',
      demand: 'Medium-High',
      retailers: 5,
      supply: 'Koi supplier nahi',
      opportunity: 'Moderate',
      badgeVariant: 'warning',
      score: 62,
      confidence: 'Medium',
    },
  ],
  retailerDemand: [
    { id: 'cat_dairy', category: 'Dairy', count: 21 },
    { id: 'cat_staples', category: 'Staples', count: 20 },
    { id: 'cat_household', category: 'Household', count: 2 },
  ],
  orders: { pending: 1, ready: 1, completed: 8 },
  catalogue: { totalProducts: 3, totalCategories: 1 },
  opportunityCount: 7,
};

const renderDashboard = () => render(
  <MemoryRouter initialEntries={['/distributor/dashboard']}>
    <Routes>
      <Route path="/distributor/dashboard" element={<DistributorDashboard />} />
      <Route path="/distributor/catalogue" element={<p>Catalogue</p>} />
      <Route path="/distributor/opportunities" element={<p>Opportunities</p>} />
      <Route path="/distributor/orders" element={<p>Orders page</p>} />
    </Routes>
  </MemoryRouter>,
);

const positionOf = (text) => document.body.textContent.indexOf(text);

describe('DistributorDashboard', () => {
  it('renders the live payload', async () => {
    vi.spyOn(intelligenceApi, 'getDistributorDashboard').mockResolvedValue(DASHBOARD);

    renderDashboard();

    expect(await screen.findByText('Namaste, Himachal Dairy Co')).toBeInTheDocument();
    expect(screen.getByText('88/100')).toBeInTheDocument();
  });

  it('puts the readings above the analysis', async () => {
    vi.spyOn(intelligenceApi, 'getDistributorDashboard').mockResolvedValue(DASHBOARD);

    renderDashboard();
    await screen.findByText('Namaste, Himachal Dairy Co');

    expect(positionOf('Top score')).toBeLessThan(positionOf('Local demand gaps'));
  });

  it('tells two category-level signals apart', async () => {
    // Both arrive titled "Dairy". Hiding the eyebrow in that case left them
    // looking like the same row rendered twice.
    vi.spyOn(intelligenceApi, 'getDistributorDashboard').mockResolvedValue(DASHBOARD);

    renderDashboard();

    expect(await screen.findAllByText('Poori category')).toHaveLength(2);
    expect(screen.getByText('Available (3 suppliers)')).toBeInTheDocument();
    expect(screen.getByText('Koi supplier nahi')).toBeInTheDocument();
  });

  it('says how many opportunities the link leads to', async () => {
    // The count rode in on every payload and the link said "Sab dekho".
    vi.spyOn(intelligenceApi, 'getDistributorDashboard').mockResolvedValue(DASHBOARD);

    renderDashboard();

    expect(await screen.findByRole('button', { name: /Sab 7/ })).toBeInTheDocument();
  });

  it('shows orders as three figures, not three rows to the same page', async () => {
    // It was a list of three tappable rows that all went to /orders, followed
    // by a sentence restating two of the numbers.
    vi.spyOn(intelligenceApi, 'getDistributorDashboard').mockResolvedValue(DASHBOARD);

    renderDashboard();
    await screen.findByText('Namaste, Himachal Dairy Co');

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.queryByText(/intezaar kar rahe hain/)).not.toBeInTheDocument();
  });

  it('does not draw the navigation a second time', async () => {
    // The "Shortcuts" block listed catalogue, opportunities and schemes — all
    // three already sit in the sidebar nav beside this page.
    vi.spyOn(intelligenceApi, 'getDistributorDashboard').mockResolvedValue(DASHBOARD);

    renderDashboard();
    await screen.findByText('Namaste, Himachal Dairy Co');

    expect(screen.queryByText('Shortcuts')).not.toBeInTheDocument();
    expect(screen.queryByText('Catalogue manage karo')).not.toBeInTheDocument();
    expect(screen.queryByText('Sarkari schemes')).not.toBeInTheDocument();
  });

  it('still reaches the orders page and the catalogue', async () => {
    vi.spyOn(intelligenceApi, 'getDistributorDashboard').mockResolvedValue(DASHBOARD);
    const user = userEvent.setup();

    renderDashboard();
    await user.click(await screen.findByRole('button', { name: /Dekho/ }));

    expect(await screen.findByText('Orders page')).toBeInTheDocument();
  });

  it('opens the catalogue from the header action', async () => {
    vi.spyOn(intelligenceApi, 'getDistributorDashboard').mockResolvedValue(DASHBOARD);
    const user = userEvent.setup();

    renderDashboard();
    await user.click(await screen.findByRole('button', { name: /Product add karo/ }));

    expect(await screen.findByText('Catalogue')).toBeInTheDocument();
  });
});
