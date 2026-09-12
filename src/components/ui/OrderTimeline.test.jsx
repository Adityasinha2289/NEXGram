import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrderTimeline } from './OrderTimeline';

/**
 * The timeline answers "where is my order", so the steps still to come matter
 * as much as the ones already taken.
 */

const at = (iso) => ({ created_at: iso });

const history = (...statuses) =>
  statuses.map((status, i) => ({
    id: `h${i}`,
    new_status: status,
    previous_status: statuses[i - 1] ?? 'draft',
    ...at(`2026-09-0${i + 1}T10:00:00Z`),
  }));

describe('OrderTimeline', () => {
  it('shows steps that have not happened yet', () => {
    render(<OrderTimeline history={history('requested')} currentStatus="requested" />);

    expect(screen.getByText('Order bheja')).toBeInTheDocument();
    expect(screen.getByText('Poora hua')).toBeInTheDocument();
  });

  it('marks the next step rather than leaving it blank', () => {
    render(<OrderTimeline history={history('requested')} currentStatus="requested" />);
    expect(screen.getByText('Agla step')).toBeInTheDocument();
  });

  it('timestamps the steps that have happened', () => {
    render(<OrderTimeline history={history('requested', 'accepted')} currentStatus="accepted" />);

    // Two reached steps carry a time; the remaining three say they are pending.
    expect(screen.getAllByText('Abhi baaki hai').length).toBe(2);
    expect(screen.getByText('Agla step')).toBeInTheDocument();
  });

  it('stops the chain on a rejection instead of promising a next step', () => {
    render(
      <OrderTimeline
        history={[...history('requested'), { id: 'r', new_status: 'rejected', ...at('2026-09-02T10:00:00Z') }]}
        currentStatus="rejected"
      />,
    );

    expect(screen.getByText('Distributor ne reject kiya')).toBeInTheDocument();
    // A rejected order is not "preparing next".
    expect(screen.queryByText('Taiyari ho rahi hai')).not.toBeInTheDocument();
    expect(screen.queryByText('Agla step')).not.toBeInTheDocument();
  });

  it('stops the chain on a cancellation', () => {
    render(
      <OrderTimeline
        history={[...history('requested', 'accepted'), { id: 'c', new_status: 'cancelled', ...at('2026-09-03T10:00:00Z') }]}
        currentStatus="cancelled"
      />,
    );

    expect(screen.getByText('Cancel ho gaya')).toBeInTheDocument();
    expect(screen.getByText('Distributor ne accept kiya')).toBeInTheDocument();
    expect(screen.queryByText('Poora hua')).not.toBeInTheDocument();
  });

  it('shows every step as done for a completed order', () => {
    render(
      <OrderTimeline
        history={history('requested', 'accepted', 'preparing', 'ready', 'completed')}
        currentStatus="completed"
      />,
    );

    expect(screen.queryByText('Abhi baaki hai')).not.toBeInTheDocument();
    expect(screen.queryByText('Agla step')).not.toBeInTheDocument();
  });

  it('does not list a passed step as still to come', () => {
    // Real histories skip states: an order can go straight from accepted to
    // completed. The steps in between have happened, whether or not anyone
    // wrote a row for them, so they must not read as pending.
    render(
      <OrderTimeline
        history={history('requested', 'accepted', 'completed')}
        currentStatus="completed"
      />,
    );

    expect(screen.getByText('Taiyari ho rahi hai')).toBeInTheDocument();
    expect(screen.queryByText('Abhi baaki hai')).not.toBeInTheDocument();
    expect(screen.queryByText('Agla step')).not.toBeInTheDocument();
  });

  it('renders without history rather than crashing', () => {
    render(<OrderTimeline history={[]} currentStatus="requested" />);
    expect(screen.getByText('Order Kahan Hai?')).toBeInTheDocument();
  });

  it('shows the reason a step was taken when one was given', () => {
    render(
      <OrderTimeline
        history={[{ id: 'r', new_status: 'rejected', reason: 'Stock khatam ho gaya', ...at('2026-09-02T10:00:00Z') }]}
        currentStatus="rejected"
      />,
    );
    expect(screen.getByText('Stock khatam ho gaya')).toBeInTheDocument();
  });
});
