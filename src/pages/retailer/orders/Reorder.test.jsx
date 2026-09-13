import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BasketProvider } from '../../../context/BasketContext';
import { Reorder } from './Reorder';
import { intelligenceApi } from '../../../services/api/intelligenceApi';

/**
 * The reorder screen rendered nothing at all: it destructured `getQuantity`
 * from the basket context, which never exposed it, so the first row threw
 * "getQuantity is not a function". Underneath that it also gated its Add button
 * on `availableStock` — a field /intelligence/reorder does not return — so the
 * button stayed live for products no supplier stocks, and ordering one sent a
 * product id where the API wanted a catalogue item id.
 *
 * The rows below are the endpoint's real shape, taken from a seeded response.
 */
const LISTED = {
  id: 'cat_dist_sharma_paneer_200g',
  productId: 'prod_paneer',
  productVariantId: 'var_paneer_200g',
  name: 'Paneer',
  category: 'Dairy',
  variant: '200g',
  unit: 'g',
  price: 62,
  lastPaidPrice: 60,
  minimumOrderQuantity: 5,
  distributorId: 'dist_sharma',
  distributorName: 'Sharma Distributors',
  lastOrderedDate: '2026-09-07T00:00:00',
  daysAgo: 20,
  timesOrdered: 3,
  cadenceDays: 18,
  dueNow: true,
  available: true,
  suggestion: 'Aap har 18 din mein mangwate hain - 20 din ho gaye.',
};

const UNLISTED = {
  ...LISTED,
  id: 'prod_ghee',
  productId: 'prod_ghee',
  name: 'Ghee',
  variant: '1kg',
  price: null,
  lastPaidPrice: 480,
  distributorName: 'Verma Traders',
  dueNow: false,
  available: false,
  suggestion: '40 din pehle order kiya tha.',
};

const renderReorder = () => render(
  <MemoryRouter>
    <BasketProvider>
      <Reorder />
    </BasketProvider>
  </MemoryRouter>,
);

describe('Reorder', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the rows the API returns', async () => {
    vi.spyOn(intelligenceApi, 'getReorderSuggestions').mockResolvedValue([LISTED, UNLISTED]);

    renderReorder();

    expect(await screen.findByText('Paneer')).toBeInTheDocument();
    expect(screen.getByText('Ghee')).toBeInTheDocument();
  });

  it('counts what the cadence says is due', async () => {
    vi.spyOn(intelligenceApi, 'getReorderSuggestions').mockResolvedValue([LISTED, UNLISTED]);

    renderReorder();

    expect(await screen.findByText(/1 item .* due hain/)).toBeInTheDocument();
  });

  it('adds a listed product to that supplier basket at its MOQ', async () => {
    vi.spyOn(intelligenceApi, 'getReorderSuggestions').mockResolvedValue([LISTED]);
    const user = userEvent.setup();

    renderReorder();
    await user.click(await screen.findByRole('button', { name: 'Add' }));

    expect(await screen.findByText('5 added')).toBeInTheDocument();
  });

  it('will not let an unavailable product be ordered', async () => {
    // `id` is a product id when nothing is listed, which POST /orders rejects.
    vi.spyOn(intelligenceApi, 'getReorderSuggestions').mockResolvedValue([UNLISTED]);

    renderReorder();

    await waitFor(() => expect(screen.getByText('Ghee')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('says why an unavailable product cannot be reordered', async () => {
    vi.spyOn(intelligenceApi, 'getReorderSuggestions').mockResolvedValue([UNLISTED]);

    renderReorder();

    expect(
      await screen.findByText('Abhi koi local supplier stock nahi karta'),
    ).toBeInTheDocument();
  });

  it('falls back to the last paid price when nothing is listed today', async () => {
    vi.spyOn(intelligenceApi, 'getReorderSuggestions').mockResolvedValue([UNLISTED]);

    renderReorder();

    expect(await screen.findByText('₹480')).toBeInTheDocument();
  });

  it('shows an empty state rather than a crash when there is no history', async () => {
    vi.spyOn(intelligenceApi, 'getReorderSuggestions').mockResolvedValue([]);

    renderReorder();

    expect(await screen.findByText('Abhi koi past order nahi')).toBeInTheDocument();
  });

  it('surfaces a failed request instead of looking empty', async () => {
    vi.spyOn(intelligenceApi, 'getReorderSuggestions').mockRejectedValue(
      new Error('Server down'),
    );

    renderReorder();

    expect(await screen.findByText('Server down')).toBeInTheDocument();
  });
});
