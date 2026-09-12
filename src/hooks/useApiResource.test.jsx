import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useApiResource } from './useApiResource';

/**
 * This hook backs every screen that loads something, so its failure modes are
 * everyone's failure modes.
 */
describe('useApiResource', () => {
  it('loads and exposes the data', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useApiResource(fetcher));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual({ ok: true });
    expect(result.current.error).toBeNull();
  });

  it('reports a failure instead of rendering as empty', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useApiResource(fetcher));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('network down');
  });

  it('clears a previous error on a successful retry', async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useApiResource(fetcher));
    await waitFor(() => expect(result.current.error).toBe('down'));

    await act(async () => { await result.current.reload(); });
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual({ ok: true });
  });

  it('does not fetch when disabled', async () => {
    const fetcher = vi.fn();
    const { result } = renderHook(() => useApiResource(fetcher, { enabled: false }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('ignores a slow response that a newer request has superseded', async () => {
    // Otherwise typing in a search box can end with an older result on screen.
    let resolveFirst;
    const fetcher = vi.fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockResolvedValueOnce('second');

    const { result } = renderHook(() => useApiResource(fetcher));
    await act(async () => { result.current.reload(); });
    await act(async () => { resolveFirst('first'); });

    expect(result.current.data).toBe('second');
  });
})
