import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Deliveries } from './Deliveries';
import { storefrontApi } from '../../../services/api/storefrontApi';

/** The shop-side shape, including the number the runner has to call. */
const ORDER = {
  id: 'ord-1',
  orderNumber: 'NXD-20260913-7188',
  status: 'placed',
  subtotal: 60,
  deliveryFee: 0,
  total: 60,
  distanceKm: 0.38,
  deliveryEstimate: '10-15 min',
  placedAt: '2026-09-13T04:00:00',
  note: 'Gate par de dena',
  runner: null,
  items: [
    { id: 'it-1', name: 'Milk', variant: '500ml', quantity: 2, unitPrice: 30, lineTotal: 60 },
  ],
  nextStatuses: ['accepted', 'rejected', 'cancelled'],
  customer: {
    name: 'Sunita Devi',
    mobile: '9500000001',
    address: 'Ward 4, Palampur',
    landmark: 'Peepal ped ke paas',
  },
};

const RUNNER = { id: 'run-1', name: 'Chotu', mobile: '9000009999', mode: 'cycle', isActive: true };

describe('Deliveries', () => {
  it('shows an incoming order with somewhere to go and someone to call', async () => {
    vi.spyOn(storefrontApi, 'getShopOrders').mockResolvedValue([ORDER]);
    vi.spyOn(storefrontApi, 'getRunners').mockResolvedValue([RUNNER]);

    render(<Deliveries />);

    expect(await screen.findByText('NXD-20260913-7188')).toBeInTheDocument();
    expect(screen.getByText(/Ward 4, Palampur/)).toBeInTheDocument();
    expect(screen.getByText('9500000001')).toBeInTheDocument();
  });

  it('accepts an order, which is what commits the stock', async () => {
    vi.spyOn(storefrontApi, 'getShopOrders').mockResolvedValue([ORDER]);
    vi.spyOn(storefrontApi, 'getRunners').mockResolvedValue([RUNNER]);
    const spy = vi.spyOn(storefrontApi, 'updateOrderStatus').mockResolvedValue({
      ...ORDER, status: 'accepted',
    });
    const user = userEvent.setup();

    render(<Deliveries />);
    await user.click(await screen.findByRole('button', { name: /Accept karein/ }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith('ord-1', {
      status: 'accepted', runner_id: undefined,
    }));
  });

  it('assigns the runner when dispatching', async () => {
    vi.spyOn(storefrontApi, 'getShopOrders').mockResolvedValue([
      { ...ORDER, status: 'accepted' },
    ]);
    vi.spyOn(storefrontApi, 'getRunners').mockResolvedValue([RUNNER]);
    const spy = vi.spyOn(storefrontApi, 'updateOrderStatus').mockResolvedValue({});
    const user = userEvent.setup();

    render(<Deliveries />);
    await user.click(await screen.findByRole('button', { name: /Bhej dein \(Chotu\)/ }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith('ord-1', {
      status: 'out_for_delivery', runner_id: 'run-1',
    }));
  });

  it('cannot dispatch with nobody to carry it, and says why', async () => {
    vi.spyOn(storefrontApi, 'getShopOrders').mockResolvedValue([
      { ...ORDER, status: 'accepted' },
    ]);
    vi.spyOn(storefrontApi, 'getRunners').mockResolvedValue([]);

    render(<Deliveries />);

    expect(
      await screen.findByText(/Abhi koi delivery waala add nahi kiya/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bhej dein/ })).toBeDisabled();
  });

  it('offers no further moves once an order is delivered', async () => {
    vi.spyOn(storefrontApi, 'getShopOrders').mockResolvedValue([
      { ...ORDER, status: 'delivered' },
    ]);
    vi.spyOn(storefrontApi, 'getRunners').mockResolvedValue([RUNNER]);

    render(<Deliveries />);

    expect(await screen.findByText('Mil gaya')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Accept karein/ })).not.toBeInTheDocument();
  });

  it('surfaces a refused transition with the server reason', async () => {
    // Accepting fails when the counter sold the last one first.
    vi.spyOn(storefrontApi, 'getShopOrders').mockResolvedValue([ORDER]);
    vi.spyOn(storefrontApi, 'getRunners').mockResolvedValue([RUNNER]);
    vi.spyOn(storefrontApi, 'updateOrderStatus').mockRejectedValue(
      new Error('Milk: sirf 1 bache hain, order accept nahi ho sakta'),
    );
    const user = userEvent.setup();

    render(<Deliveries />);
    await user.click(await screen.findByRole('button', { name: /Accept karein/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('sirf 1 bache hain');
  });

  it('shows an empty state before the first online order', async () => {
    vi.spyOn(storefrontApi, 'getShopOrders').mockResolvedValue([]);
    vi.spyOn(storefrontApi, 'getRunners').mockResolvedValue([]);

    render(<Deliveries />);

    expect(await screen.findByText('Abhi koi online order nahi')).toBeInTheDocument();
  });
});
