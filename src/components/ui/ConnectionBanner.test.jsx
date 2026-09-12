import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConnectionBanner } from './ConnectionBanner';

/**
 * The product's claim is that its numbers are traceable, so showing cached
 * intelligence without saying so undercuts it more than a banner costs.
 */
describe('ConnectionBanner', () => {
  it('stays out of the way when everything is fine', () => {
    render(<ConnectionBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('warns when the connection drops', () => {
    render(<ConnectionBanner />);
    act(() => { window.dispatchEvent(new Event('offline')); });

    expect(screen.getByRole('status')).toHaveTextContent('Internet nahi hai');
  });

  it('says orders will not go through while offline', () => {
    // A shopkeeper tapping "order" into the void is the failure to avoid.
    render(<ConnectionBanner />);
    act(() => { window.dispatchEvent(new Event('offline')); });

    expect(screen.getByRole('status')).toHaveTextContent('naye order abhi nahi ja payenge');
  });

  it('clears once the connection returns', () => {
    render(<ConnectionBanner />);
    act(() => { window.dispatchEvent(new Event('offline')); });
    act(() => { window.dispatchEvent(new Event('online')); });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('flags stale data separately from being offline', () => {
    render(<ConnectionBanner />);
    act(() => {
      window.dispatchEvent(new CustomEvent('api:stale', { detail: { stale: true } }));
    });

    expect(screen.getByRole('status')).toHaveTextContent('purane ho sakte hain');
  });
})
