import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assistantApi } from './assistantApi';

/**
 * Reading the assistant's reply off the wire.
 *
 * The failure this guards against is subtle: a network read boundary does not
 * respect SSE frame boundaries, so a chunk can arrive split down the middle of
 * a JSON payload. Parsing whatever happens to be in the buffer would drop that
 * frame — a word vanishing from the middle of an answer, with nothing logged.
 */

/** A response whose body yields exactly these byte groups, in order. */
function streamOf(...groups) {
  const encoder = new TextEncoder();
  let i = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () => (i < groups.length
          ? { done: false, value: encoder.encode(groups[i++]) }
          : { done: true, value: undefined }),
      }),
    },
  };
}

const frame = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

describe('assistantApi.chat', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('delivers each chunk as it arrives', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamOf(
      frame('chunk', { text: 'Doodh ' }),
      frame('chunk', { text: 'chaar packet.' }),
      frame('done', {}),
    )));
    const seen = [];

    const full = await assistantApi.chat(
      [{ role: 'user', text: 'kitna doodh' }],
      { onChunk: (t) => seen.push(t) },
    );

    expect(seen).toEqual(['Doodh ', 'chaar packet.']);
    expect(full).toBe('Doodh chaar packet.');
  });

  it('reassembles a frame split across two reads', async () => {
    const whole = frame('chunk', { text: 'Namaste' });
    const cut = Math.floor(whole.length / 2);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamOf(
      whole.slice(0, cut), whole.slice(cut), frame('done', {}),
    )));
    const seen = [];

    await assistantApi.chat([{ role: 'user', text: 'hi' }], { onChunk: (t) => seen.push(t) });

    expect(seen).toEqual(['Namaste']);
  });

  it('handles several frames arriving in one read', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamOf(
      frame('chunk', { text: 'a' }) + frame('chunk', { text: 'b' }) + frame('done', {}),
    )));
    const seen = [];

    await assistantApi.chat([{ role: 'user', text: 'hi' }], { onChunk: (t) => seen.push(t) });

    expect(seen).toEqual(['a', 'b']);
  });

  it('surfaces an error frame that arrived mid-stream', async () => {
    // Google can refuse after the response has already begun, so the failure
    // comes back as data rather than as an HTTP status.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamOf(
      frame('error', { message: 'Gemini ki limit lag gayi hai.' }),
    )));
    const onError = vi.fn();

    await assistantApi.chat([{ role: 'user', text: 'hi' }], { onError });

    expect(onError).toHaveBeenCalledWith('Gemini ki limit lag gayi hai.');
  });

  it('reports a request that never became a stream', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ detail: 'Could not validate credentials' }),
    }));
    const onError = vi.fn();

    const full = await assistantApi.chat([{ role: 'user', text: 'hi' }], { onError });

    expect(onError).toHaveBeenCalledWith('Could not validate credentials');
    expect(full).toBe('');
  });

  it('carries the bearer token', async () => {
    localStorage.setItem('nexgram_access_token', 'tok-123');
    const fetchMock = vi.fn().mockResolvedValue(streamOf(frame('done', {})));
    vi.stubGlobal('fetch', fetchMock);

    await assistantApi.chat([{ role: 'user', text: 'hi' }], {});

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok-123');
  });

  it('sends the conversation and the context flag', async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamOf(frame('done', {})));
    vi.stubGlobal('fetch', fetchMock);

    await assistantApi.chat(
      [{ role: 'user', text: 'capital of France?' }],
      { includeContext: false },
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.include_context).toBe(false);
    expect(body.messages).toHaveLength(1);
  });

  it('skips a frame whose payload is not JSON rather than failing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamOf(
      'event: chunk\ndata: {broken\n\n' + frame('chunk', { text: 'still here' }),
    )));
    const seen = [];

    await assistantApi.chat([{ role: 'user', text: 'hi' }], { onChunk: (t) => seen.push(t) });

    expect(seen).toEqual(['still here']);
  });
});
