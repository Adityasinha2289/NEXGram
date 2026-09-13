import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],

  server: {
    // Bind every interface, not just `localhost`.
    //
    // Vite's default resolves to IPv6 `[::1]` on Windows, so the dev server
    // listened on `[::1]:5173` and nothing at all on `127.0.0.1:5173` - opening
    // the site by IP failed outright, and `localhost` failed too wherever the
    // browser resolved it to IPv4 first.
    //
    // It also puts the app on the machine's LAN address, which is how you open
    // it on an actual phone - the only way to try the counter microphone.
    host: true,
  },

  // Vitest transforms test files through esbuild rather than the React plugin,
  // so the automatic JSX runtime has to be stated or every .test.jsx fails with
  // "React is not defined".
  //
  // Scoped to test mode because the production build transforms with oxc, which
  // already defaults to the automatic runtime and warned on every build when
  // both were set: "Both esbuild and oxc options were set."
  ...(mode === 'test' ? { esbuild: { jsx: 'automatic' } } : {}),

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // The service worker and Vite's import.meta.env both need a browser-ish
    // environment; anything under src that ends .test.jsx is a component test.
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/test/**', 'src/main.jsx', '**/*.test.{js,jsx}'],
    },
  },
}))
