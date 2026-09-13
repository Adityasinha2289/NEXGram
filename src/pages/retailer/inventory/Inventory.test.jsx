import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Inventory } from './Inventory';
import { inventoryApi } from '../../../services/api/inventoryApi';

/** The endpoint's real shape, from a seeded shelf. */
const CURD = {
  id: 'inv-curd',
  productId: 'prod_curd',
  productVariantId: 'var_curd_400g',
  name: 'Curd',
  variant: '400g',
  unit: 'g',
  quantity: 1,
  unitCost: 30,
  sellingPrice: 40,
  reorderLevel: 6,
  shelfLifeDays: 5,
  isListedOnline: true,
  isLow: true,
  salesPerDay: 2.167,
  daysOfCover: 0.5,
  expiringQuantity: 1,
  expiredQuantity: 0,
  nextExpiry: '2026-09-17',
  batches: [],
};

const SALT = {
  ...CURD,
  id: 'inv-salt',
  productId: 'prod_salt',
  name: 'Salt',
  variant: '1kg',
  quantity: 30,
  unitCost: 20,
  sellingPrice: 26,
  isLow: false,
  salesPerDay: 0.6,
  daysOfCover: 50,
  expiringQuantity: 0,
  expiredQuantity: 0,
  nextExpiry: null,
  isListedOnline: false,
};

const renderInventory = () => render(<MemoryRouter><Inventory /></MemoryRouter>);

describe('Inventory', () => {
  it('lists the shelf with how long each line will last', async () => {
    vi.spyOn(inventoryApi, 'getInventory').mockResolvedValue([CURD, SALT]);

    renderInventory();

    expect(await screen.findByText('Curd')).toBeInTheDocument();
    expect(screen.getByText('0.5 din bachega')).toBeInTheDocument();
    expect(screen.getByText('50 din bachega')).toBeInTheDocument();
  });

  it('values the shelf at cost, not at what it might sell for', async () => {
    // 1 curd at 30 + 30 salt at 20 = 630.
    vi.spyOn(inventoryApi, 'getInventory').mockResolvedValue([CURD, SALT]);

    renderInventory();

    expect(await screen.findByText('₹630')).toBeInTheDocument();
  });

  it('filters to what is running low', async () => {
    vi.spyOn(inventoryApi, 'getInventory').mockResolvedValue([CURD, SALT]);
    const user = userEvent.setup();

    renderInventory();
    await screen.findByText('Curd');
    await user.click(screen.getByRole('radio', { name: /Kam hai/ }));

    expect(screen.getByText('Curd')).toBeInTheDocument();
    expect(screen.queryByText('Salt')).not.toBeInTheDocument();
  });

  it('shows whether a line is on the consumer storefront', async () => {
    vi.spyOn(inventoryApi, 'getInventory').mockResolvedValue([CURD, SALT]);

    renderInventory();

    expect(await screen.findByText('Online bik raha hai')).toBeInTheDocument();
    expect(screen.getByText('Online nahi hai')).toBeInTheDocument();
  });

  it('toggles a line on and off the storefront', async () => {
    vi.spyOn(inventoryApi, 'getInventory').mockResolvedValue([CURD]);
    const spy = vi.spyOn(inventoryApi, 'updateItem').mockResolvedValue(CURD);
    const user = userEvent.setup();

    renderInventory();
    await user.click(await screen.findByText('Online bik raha hai'));

    await waitFor(() => expect(spy).toHaveBeenCalledWith('inv-curd', {
      is_listed_online: false,
    }));
  });

  it('records a recount as a stock-take correction', async () => {
    vi.spyOn(inventoryApi, 'getInventory').mockResolvedValue([CURD]);
    const spy = vi.spyOn(inventoryApi, 'adjustStock').mockResolvedValue(CURD);
    const user = userEvent.setup();

    renderInventory();
    await user.click(await screen.findByRole('button', { name: 'Curd ka stock theek karein' }));

    const field = screen.getByLabelText('Kitne hain (gin kar)');
    await user.clear(field);
    await user.type(field, '4');
    await user.click(screen.getByRole('button', { name: /Save/ }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith('inv-curd', 4, 'Stock take'));
  });

  it('offers to clear stock that is already past its date', async () => {
    vi.spyOn(inventoryApi, 'getInventory').mockResolvedValue([
      { ...CURD, expiredQuantity: 3 },
    ]);
    const spy = vi.spyOn(inventoryApi, 'writeOffExpired').mockResolvedValue({
      writtenOff: [], totalQuantity: 3, totalCostValue: 90,
    });
    const user = userEvent.setup();

    renderInventory();
    await user.click(await screen.findByRole('button', { name: /Hata dein/ }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent('₹90 ka nuksan record hua');
  });

  it('shows an empty state before any stock is added', async () => {
    vi.spyOn(inventoryApi, 'getInventory').mockResolvedValue([]);

    renderInventory();

    expect(await screen.findByText('Abhi shelf khaali hai')).toBeInTheDocument();
  });

  it('surfaces a failed load instead of an empty shelf', async () => {
    vi.spyOn(inventoryApi, 'getInventory').mockRejectedValue(new Error('Server down'));

    renderInventory();

    expect(await screen.findByText('Server down')).toBeInTheDocument();
  });
});
