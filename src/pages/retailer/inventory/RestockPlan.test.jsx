import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RestockPlan } from './RestockPlan';
import { inventoryApi } from '../../../services/api/inventoryApi';

/**
 * "What do I buy next" answered from three directions at once.
 *
 * The payloads below are the endpoint's real shape, taken from a seeded
 * response — including the awkward parts, like a line no local supplier stocks.
 */
const PLAN = {
  reorder: [
    {
      inventoryId: 'inv-curd',
      productId: 'prod_curd',
      name: 'Curd',
      onHand: 1,
      salesPerDay: 2.167,
      daysOfCover: 0.5,
      suggestedQuantity: 10,
      urgent: true,
      shelfLifeDays: 5,
      reason: 'Aap roz lagbhag 2.167 bechte hain - 1 stock 0.5 din chalega.',
      available: true,
      catalogueItemId: 'cat-curd',
      distributorId: 'dist_sharma',
      distributorName: 'Sharma Distributors',
      unitPrice: 38,
      minimumOrderQuantity: 5,
      estimatedCost: 380,
      supplyNote: null,
    },
    {
      inventoryId: 'inv-sabun',
      productId: 'prod_sabun',
      name: 'Sabun',
      onHand: 0,
      salesPerDay: 0,
      daysOfCover: null,
      suggestedQuantity: 1,
      urgent: true,
      shelfLifeDays: null,
      reason: 'Stock khatam ho gaya hai.',
      available: false,
      distributorId: null,
      distributorName: null,
      unitPrice: null,
      minimumOrderQuantity: 1,
      estimatedCost: null,
      supplyNote: 'Aapke district mein abhi koi supplier ise stock nahi karta.',
    },
  ],
  expiring: [
    {
      inventoryId: 'inv-milk',
      name: 'Milk',
      quantity: 24,
      atRiskQuantity: 18,
      expiresOn: '2026-09-13',
      daysLeft: 1,
      costValue: 432,
      action: 'Aaj hi discount par nikalein',
      reason: '24 pieces 2026-09-13 ko expire ho rahe hain, aur aap roz lagbhag 5.5 bechte hain.',
    },
  ],
  newProducts: [
    {
      productId: 'prod_biscuit',
      name: 'Biscuits',
      category: 'Snacks',
      retailersAsking: 9,
      suggestedQuantity: 12,
      reason: 'Aapke area ke 9 shops ise maang rahe hain aur aap abhi yeh nahi rakhte.',
      available: true,
      distributorId: 'dist_gupta',
      distributorName: 'Gupta Rural Supplies',
      unitPrice: 22,
      minimumOrderQuantity: 12,
      estimatedCost: 264,
      supplyNote: null,
    },
  ],
  summary: {
    linesToReorder: 2,
    urgentLines: 2,
    estimatedCost: 380,
    wastageAtRisk: 432,
  },
};

const EMPTY = {
  reorder: [],
  expiring: [],
  newProducts: [],
  summary: { linesToReorder: 0, urgentLines: 0, estimatedCost: 0, wastageAtRisk: 0 },
};

const renderPlan = () => render(<MemoryRouter><RestockPlan /></MemoryRouter>);

describe('RestockPlan', () => {
  it('leads with stock that is about to spoil', async () => {
    vi.spyOn(inventoryApi, 'getRestockPlan').mockResolvedValue(PLAN);

    renderPlan();

    expect(await screen.findByText('Pehle yeh nikaalein')).toBeInTheDocument();
    expect(screen.getByText('Aaj hi discount par nikalein')).toBeInTheDocument();
  });

  it('prices the waste rather than only naming it', async () => {
    vi.spyOn(inventoryApi, 'getRestockPlan').mockResolvedValue(PLAN);

    renderPlan();

    expect(await screen.findByText('−₹432')).toBeInTheDocument();
  });

  it('shows the sentence behind every reorder quantity', async () => {
    // A number with no reason is a number nobody acts on.
    vi.spyOn(inventoryApi, 'getRestockPlan').mockResolvedValue(PLAN);

    renderPlan();

    expect(await screen.findByText(/Aap roz lagbhag 2.167 bechte hain/)).toBeInTheDocument();
  });

  it('names the supplier and the cost for a line it can source', async () => {
    vi.spyOn(inventoryApi, 'getRestockPlan').mockResolvedValue(PLAN);

    renderPlan();

    expect(await screen.findByText(/Sharma Distributors · ₹38/)).toBeInTheDocument();
    // Twice on purpose: once as the line's cost, once in the summary total.
    expect(screen.getAllByText('₹380')).toHaveLength(2);
  });

  it('says so when nobody local stocks a line, rather than dropping it', async () => {
    vi.spyOn(inventoryApi, 'getRestockPlan').mockResolvedValue(PLAN);

    renderPlan();

    expect(await screen.findByText('Sabun')).toBeInTheDocument();
    expect(
      screen.getByText('Aapke district mein abhi koi supplier ise stock nahi karta.'),
    ).toBeInTheDocument();
  });

  it('surfaces what the area wants that this shop does not carry', async () => {
    vi.spyOn(inventoryApi, 'getRestockPlan').mockResolvedValue(PLAN);

    renderPlan();

    expect(await screen.findByText('Yeh rakhna shuru karein')).toBeInTheDocument();
    expect(screen.getByText(/9 shops ise maang rahe hain/)).toBeInTheDocument();
  });

  it('says there is nothing to do rather than showing empty sections', async () => {
    vi.spyOn(inventoryApi, 'getRestockPlan').mockResolvedValue(EMPTY);

    renderPlan();

    expect(await screen.findByText('Abhi kuch mangwane ki zaroorat nahi')).toBeInTheDocument();
  });

  it('surfaces a failed request instead of looking empty', async () => {
    vi.spyOn(inventoryApi, 'getRestockPlan').mockRejectedValue(new Error('Server down'));

    renderPlan();

    expect(await screen.findByText('Server down')).toBeInTheDocument();
  });
});
