import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/**
 * The pieces of Next.js a component reaches for that jsdom has no answer to.
 *
 * Navigation is the big one: every page in this app is a client component that
 * calls useRouter or Link, and both throw outside Next's own router. Stubbing
 * them here rather than in each test keeps the tests about the screens.
 */
const router = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => (
    <a href={typeof href === 'string' ? href : '#'} {...props}>{children}</a>
  ),
}));

/**
 * framer-motion animates with rAF and IntersectionObserver, neither of which
 * jsdom drives. `motion.div` becomes a plain div so a screen's content is in
 * the document rather than waiting on an animation that never runs.
 */
vi.mock('framer-motion', () => {
  const passthrough = new Proxy({} as Record<string, React.ComponentType>, {
    get: (_target, tag) => {
      const Tag = String(tag) as keyof React.JSX.IntrinsicElements;
      const Component = ({ children, ...props }: Record<string, unknown>) => {
        // Motion's own props are not valid DOM attributes; passing them through
        // would turn every screen's console into React warnings about unknown
        // attributes and drown out the ones this suite is looking for.
        const domProps = Object.fromEntries(
          Object.entries(props).filter(([key]) =>
            !/^(initial|animate|exit|transition|variants|while|layout|drag)/.test(key)),
        );
        return <Tag {...domProps}>{children as React.ReactNode}</Tag>;
      };
      Component.displayName = `motion.${String(tag)}`;
      return Component;
    },
  });
  return {
    motion: passthrough,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useReducedMotion: () => true,
  };
});

// Recharts measures its container, which is always 0x0 in jsdom.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Used by Radix/base-ui primitives for popovers and dialogs.
global.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = '';
  thresholds = [];
} as unknown as typeof IntersectionObserver;

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
}
