import { fetchApi } from './client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * The in-app assistant.
 *
 * `chat` does not go through `fetchApi` because that reads the whole body
 * before returning, which would throw away the streaming the endpoint exists
 * for: the point is text on screen in a few hundred milliseconds, not a
 * complete answer a few seconds later.
 *
 * EventSource cannot be used either - it is GET-only and cannot carry an
 * Authorization header - so this reads the SSE frames off a fetch body itself.
 */
export const assistantApi = {
  /** Whether a key is configured, so the UI can hide rather than fail. */
  getStatus: () => fetchApi('/assistant/status'),

  /**
   * Streams a reply.
   *
   * @param messages  [{ role: 'user' | 'assistant', text }]
   * @param handlers  { onChunk(text), onError(message), signal }
   * @returns the full reply text once the stream closes
   */
  chat: async (messages, { onChunk, onError, signal, includeContext = true } = {}) => {
    const token = localStorage.getItem('nexgram_access_token');

    const response = await fetch(`${API_BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages, include_context: includeContext }),
      signal,
    });

    if (!response.ok) {
      // The stream never started, so the failure is still an HTTP status.
      const detail = await response.json().catch(() => ({}));
      const message = detail.detail || 'Assistant se baat nahi ho payi.';
      onError?.(message);
      return '';
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    // SSE frames are separated by a blank line and can be split across reads,
    // so whatever is left after the last separator is held back for the next
    // chunk rather than parsed as a truncated frame.
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        const event = /^event:\s*(.+)$/m.exec(frame)?.[1]?.trim();
        const dataLine = /^data:\s*(.*)$/m.exec(frame)?.[1];
        if (!dataLine) continue;

        let payload;
        try {
          payload = JSON.parse(dataLine);
        } catch {
          continue;
        }

        if (event === 'chunk' && payload.text) {
          full += payload.text;
          onChunk?.(payload.text);
        } else if (event === 'error') {
          // Google refused after the response had already begun, so this
          // arrives as data rather than as a status code.
          onError?.(payload.message || 'Assistant jawab nahi de paya.');
        }
      }
    }

    return full;
  },
};
