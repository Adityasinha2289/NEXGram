import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Sourcing } from './Sourcing';
import { procurementApi } from '../../../services/api/procurementApi';

/** The optimiser's real response shape, two suppliers deep. */
const BASKET = {
  lines: [
    {
      productId: 'prod_curd',
      name: 'Curd',
      requestedQuantity: 10,
      best: {
        catalogueItemId: 'cat-curd-sharma',
        distributorId: 'dist_sharma',
        distributorName: 'Sharma Distributors',
        quantity: 10,
        unitPrice: 38,
        lineTotal: 380,
        minimumOrderQuantity: 5,
        raisedToMoq: false,
        availableStock: 60,
      },
      worstLineTotal: 440,
      lineSaving: 60,
      supplierCount: 2,
      offers: [],
      why: 'Aap roz lagbhag 2.1 bechte hain - 1 stock 0.5 din chalega.',
      source: 'running_low',
    },
    {
      productId: 'prod_biscuit',
      name: 'Biscuits',
      requestedQuantity: 12,
      best: {
        catalogueItemId: 'cat-bisc-gupta',
        distributorId: 'dist_gupta',
        distributorName: 'Gupta Rural Supplies',
        quantity: 12,
        unitPrice: 22,
        lineTotal: 264,
        minimumOrderQuantity: 12,
        raisedToMoq: true,
        availableStock: 200,
      },
      worstLineTotal: 264,
      lineSaving: 0,
      supplierCount: 1,
      offers: [],
      why: 'Aapke area ke 9 shops ise maang rahe hain aur aap abhi yeh nahi rakhte.',
      source: 'local_demand',
    },
  ],
  unavailable: [
    { productId: 'prod_sabun', name: 'Sabun', requestedQuantity: 5, reason: 'Koi supplier stock nahi rakhta.' },
  ],
  split: {
    groups: [
      {
        distributorId: 'dist_sharma',
        distributorName: 'Sharma Distributors',
        items: [{
          productId: 'prod_curd', name: 'Curd', catalogueItemId: 'cat-curd-sharma',
          quantity: 10, unitPrice: 38, lineTotal: 380, raisedToMoq: false,
        }],
        subtotal: 380,
        itemCount: 1,
      },
      {
        distributorId: 'dist_gupta',
        distributorName: 'Gupta Rural Supplies',
        items: [{
          productId: 'prod_biscuit', name: 'Biscuits', catalogueItemId: 'cat-bisc-gupta',
          quantity: 12, unitPrice: 22, lineTotal: 264, raisedToMoq: true,
        }],
        subtotal: 264,
        itemCount: 1,
      },
    ],
    supplierCount: 2,
    subtotal: 644,
    platformMarginRate: 0.02,
    platformFee: 12.88,
    payable: 656.88,
  },
  singleSupplier: {
    distributorId: 'dist_gupta',
    distributorName: 'Gupta Rural Supplies',
    itemsCovered: 2,
    itemsRequested: 2,
    coversWholeList: true,
    total: 704,
    items: [
      { productId: 'prod_curd', name: 'Curd', catalogueItemId: 'cat-curd-gupta', quantity: 10, unitPrice: 44, lineTotal: 440, raisedToMoq: false },
      { productId: 'prod_biscuit', name: 'Biscuits', catalogueItemId: 'cat-bisc-gupta', quantity: 12, unitPrice: 22, lineTotal: 264, raisedToMoq: true },
    ],
    platformMarginRate: 0.02,
    platformFee: 14.08,
    payable: 718.08,
  },
  savingVsSingle: 60,
  savingVsWorst: 60,
  recommendation: '2 suppliers mein baantne se Rs 60 bachte hain.',
  basisSummary: { linesToReorder: 1, urgentLines: 1, estimatedCost: 380, wastageAtRisk: 0 },
  expiring: [],
};

const renderSourcing = () => render(<MemoryRouter><Sourcing /></MemoryRouter>);

describe('Sourcing', () => {
  it('builds the basket without anyone typing a list', async () => {
    vi.spyOn(procurementApi, 'getAutoBasket').mockResolvedValue(BASKET);

    renderSourcing();

    expect(await screen.findByText('Curd')).toBeInTheDocument();
    expect(screen.getByText('Biscuits')).toBeInTheDocument();
  });

  it('groups the split into one order per supplier', async () => {
    vi.spyOn(procurementApi, 'getAutoBasket').mockResolvedValue(BASKET);

    renderSourcing();

    expect(await screen.findByText('Sharma Distributors')).toBeInTheDocument();
    expect(screen.getAllByText('Gupta Rural Supplies').length).toBeGreaterThan(0);
  });

  it('states the platform cut in rupees rather than hiding it in the price', async () => {
    vi.spyOn(procurementApi, 'getAutoBasket').mockResolvedValue(BASKET);

    renderSourcing();

    expect(await screen.findByText(/NEXGram fee \(2%\)/)).toBeInTheDocument();
    expect(screen.getByText('₹13')).toBeInTheDocument();
    expect(screen.getByText('₹657')).toBeInTheDocument();
  });

  it('carries the reason each line is in the basket', async () => {
    vi.spyOn(procurementApi, 'getAutoBasket').mockResolvedValue(BASKET);

    renderSourcing();

    expect(await screen.findByText(/9 shops ise maang rahe hain/)).toBeInTheDocument();
    expect(screen.getByText('Area ki demand')).toBeInTheDocument();
  });

  it('flags a quantity raised to meet a supplier minimum', async () => {
    // The shopkeeper is buying more than they asked for; that should be visible.
    vi.spyOn(procurementApi, 'getAutoBasket').mockResolvedValue(BASKET);

    renderSourcing();

    expect(await screen.findByText('MOQ tak badhaya')).toBeInTheDocument();
  });

  it('names what nobody local can supply rather than dropping it', async () => {
    vi.spyOn(procurementApi, 'getAutoBasket').mockResolvedValue(BASKET);

    renderSourcing();

    expect(await screen.findByText('Yeh nahi mil raha')).toBeInTheDocument();
    expect(screen.getByText('Sabun')).toBeInTheDocument();
  });

  it('places the split plan by default', async () => {
    vi.spyOn(procurementApi, 'getAutoBasket').mockResolvedValue(BASKET);
    const spy = vi.spyOn(procurementApi, 'placeSplit').mockResolvedValue({
      placed: [{ orderId: 'o1', orderNumber: 'NEX-1', distributorName: 'Sharma', total: 380 }],
      failed: [],
      ordersPlaced: 1,
      totalValue: 380,
    });
    const user = userEvent.setup();

    renderSourcing();
    await user.click(await screen.findByRole('button', { name: /2 order bhejein/ }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][2]).toBe('split');
  });

  it('places the single-supplier plan when that is the one chosen', async () => {
    // Offering a choice and then overriding it is worse than not offering one.
    vi.spyOn(procurementApi, 'getAutoBasket').mockResolvedValue(BASKET);
    const spy = vi.spyOn(procurementApi, 'placeSplit').mockResolvedValue({
      placed: [], failed: [], ordersPlaced: 1, totalValue: 704,
    });
    const user = userEvent.setup();

    renderSourcing();
    await user.click(await screen.findByRole('button', { name: /Ek hi supplier/ }));
    await user.click(screen.getByRole('button', { name: /Order bhejein/ }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][2]).toBe('single');
  });

  it('cannot choose one supplier when none can cover the list', async () => {
    vi.spyOn(procurementApi, 'getAutoBasket').mockResolvedValue({
      ...BASKET,
      singleSupplier: { ...BASKET.singleSupplier, coversWholeList: false, itemsCovered: 1 },
      savingVsSingle: null,
    });

    renderSourcing();

    expect(await screen.findByRole('button', { name: /Ek hi supplier/ })).toBeDisabled();
  });

  it('reports a partial failure with the supplier that refused', async () => {
    vi.spyOn(procurementApi, 'getAutoBasket').mockResolvedValue(BASKET);
    vi.spyOn(procurementApi, 'placeSplit').mockResolvedValue({
      placed: [{ orderId: 'o1', orderNumber: 'NEX-1', distributorName: 'Sharma', total: 380 }],
      failed: [{ distributorName: 'Gupta Rural Supplies', reason: 'Insufficient stock' }],
      ordersPlaced: 1,
      totalValue: 380,
    });
    const user = userEvent.setup();

    renderSourcing();
    await user.click(await screen.findByRole('button', { name: /2 order bhejein/ }));

    expect(await screen.findByText(/Gupta Rural Supplies — Insufficient stock/)).toBeInTheDocument();
  });

  it('shows an empty state when the shop needs nothing', async () => {
    vi.spyOn(procurementApi, 'getAutoBasket').mockResolvedValue({
      ...BASKET, lines: [], split: { ...BASKET.split, groups: [] },
      recommendation: 'Koi item nahi bheja gaya.',
    });

    renderSourcing();

    expect(await screen.findByText('Abhi kuch mangwane ki zaroorat nahi')).toBeInTheDocument();
  });
});
