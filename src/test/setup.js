import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Unmount between tests so a leaked component cannot answer the next one's query.
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

// jsdom has no service worker; components must not crash without one.
if (!('serviceWorker' in navigator)) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { addEventListener() {}, removeEventListener() {}, register: () => Promise.resolve() },
    configurable: true,
  });
}
