import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Tests for the Next.js app.
 *
 * No @vitejs/plugin-react: it wants a newer @babel/core than the one shadcn
 * pins here, and esbuild transforms TSX perfectly well on its own. The Vite app
 * in this repo already does the same thing for the same reason.
 *
 * `@/` has to be repeated here because vitest reads this file, not tsconfig's
 * paths.
 */
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.tsx'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
