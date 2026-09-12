import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../services/api/intelligenceApi', () => ({
  intelligenceApi: { getDeveloperPack: vi.fn() },
}));

import { intelligenceApi } from '../../../../services/api/intelligenceApi';
import { useDeveloperPack } from './useDeveloperPack';

/**
 * The stock plan is money advice, so the totals and the budget verdict have to
 * be right, and a line the shopkeeper removed must stay removed.
 */

const line = (id, lineTotal, extra = {}) => ({
  id, name: id, lineTotal, price: lineTotal, suggestedQuantity: 1,
  minimumOrderQuantity: 1, unit: 'pack', ...extra,
});

const pack = (items, budget = { min: 10000, max: 50000 }) => ({
  items, budget, skipped: [], distributorMatches: [],
});

describe('useDeveloperPack', () => {
  beforeEach(() => {
    intelligenceApi.getDeveloperPack.mockReset();
  });

  it('totals the line totals, not the unit prices', async () => {
    intelligenceApi.getDeveloperPack.mockResolvedValue(
      pack([line('a', 1000), line('b', 2500)]),
    );

    const { result } = renderHook(() => useDeveloperPack());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.totalEstimatedPrice).toBe(3500);
  });

  it('reports being under budget', async () => {
    intelligenceApi.getDeveloperPack.mockResolvedValue(pack([line('a', 500)]));

    const { result } = renderHook(() => useDeveloperPack());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.budgetStatus).toBe('Under budget');
  });

  it('reports being over budget', async () => {
    intelligenceApi.getDeveloperPack.mockResolvedValue(pack([line('a', 99999)]));

    const { result } = renderHook(() => useDeveloperPack());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.budgetStatus).toBe('Over budget');
  });

  it('reports being within budget', async () => {
    intelligenceApi.getDeveloperPack.mockResolvedValue(pack([line('a', 20000)]));

    const { result } = renderHook(() => useDeveloperPack());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.budgetStatus).toBe('Budget ke andar');
  });

  it('treats an open-ended budget as never over', async () => {
    intelligenceApi.getDeveloperPack.mockResolvedValue(
      pack([line('a', 500000)], { min: 0, max: null }),
    );

    const { result } = renderHook(() => useDeveloperPack());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.budgetStatus).not.toBe('Over budget');
  });

  it('removes a line and drops it from the total', async () => {
    intelligenceApi.getDeveloperPack.mockResolvedValue(
      pack([line('a', 1000), line('b', 2000)]),
    );

    const { result } = renderHook(() => useDeveloperPack());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.removeProduct('a'));

    expect(result.current.packItems.map((i) => i.id)).toEqual(['b']);
    expect(result.current.totalEstimatedPrice).toBe(2000);
  });

  it('restores a removed line rather than duplicating it', async () => {
    intelligenceApi.getDeveloperPack.mockResolvedValue(pack([line('a', 1000)]));

    const { result } = renderHook(() => useDeveloperPack());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.removeProduct('a'));
    act(() => result.current.addProduct(line('a', 1000)));

    expect(result.current.packItems).toHaveLength(1);
  });

  it('adds a product the plan did not suggest', async () => {
    intelligenceApi.getDeveloperPack.mockResolvedValue(pack([line('a', 1000)]));

    const { result } = renderHook(() => useDeveloperPack());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.addProduct(line('z', 400)));

    expect(result.current.packItems.map((i) => i.id)).toEqual(['a', 'z']);
    expect(result.current.totalEstimatedPrice).toBe(1400);
  });

  it('will not add the same product twice', async () => {
    intelligenceApi.getDeveloperPack.mockResolvedValue(pack([line('a', 1000)]));

    const { result } = renderHook(() => useDeveloperPack());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.addProduct(line('a', 1000)));

    expect(result.current.packItems).toHaveLength(1);
  });

  it('surfaces a load failure instead of showing an empty plan', async () => {
    intelligenceApi.getDeveloperPack.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useDeveloperPack());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('network down');
    expect(result.current.packItems).toEqual([]);
  });

  it('exposes what the plan could not source', async () => {
    intelligenceApi.getDeveloperPack.mockResolvedValue({
      ...pack([]),
      skipped: [{ name: 'Paneer', reason: 'Koi local distributor nahi' }],
    });

    const { result } = renderHook(() => useDeveloperPack());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.skipped[0].name).toBe('Paneer');
  });
});
