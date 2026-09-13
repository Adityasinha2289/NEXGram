import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceSale } from './VoiceSale';
import { inventoryApi } from '../../../services/api/inventoryApi';

/**
 * The counter microphone screen.
 *
 * The typed box is the path under test because it is the one that has to work
 * everywhere: jsdom has no SpeechRecognition, which is exactly the situation on
 * Firefox and most of iOS. If this screen only worked with a mic, this file
 * would be untestable *and* unusable for a large share of real shops.
 */

const APPLIED = {
  transcript: 'do packet doodh',
  applied: [
    {
      inventoryId: 'inv-milk',
      name: 'Milk 500ml',
      quantity: 2,
      remaining: 38,
      unitPrice: 28,
      lineTotal: 56,
    },
  ],
  needsConfirmation: [],
  totalValue: 56,
  understood: 1,
  unresolved: 0,
};

const AMBIGUOUS = {
  transcript: 'do packet doodh',
  applied: [],
  needsConfirmation: [
    {
      heard: 'do packet doodh',
      phrase: 'doodh',
      quantity: 2,
      matched: true,
      confident: false,
      ambiguous: true,
      inStock: true,
      inventoryId: 'inv-milk',
      name: 'Milk 500ml',
      available: 40,
      confidence: 0.64,
      reason: 'Ek se zyada product match hue - kaunsa tha?',
      candidates: [
        { inventoryId: 'inv-milk', name: 'Milk 500ml', confidence: 0.64, available: 40 },
        { inventoryId: 'inv-milk-1l', name: 'Milk 1L', confidence: 0.61, available: 12 },
      ],
    },
  ],
  totalValue: 0,
  understood: 0,
  unresolved: 1,
};

describe('VoiceSale', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('offers a typed box where the browser has no microphone', () => {
    render(<VoiceSale />);

    expect(screen.getByText('Is browser mein mic support nahi hai')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stock se kam karein' })).toBeInTheDocument();
  });

  it('sends the typed sentence and reports what came off the shelf', async () => {
    const spy = vi.spyOn(inventoryApi, 'voiceSale').mockResolvedValue(APPLIED);
    const user = userEvent.setup();

    render(<VoiceSale />);
    await user.type(screen.getByLabelText('Kya becha?'), 'do packet doodh');
    await user.click(screen.getByRole('button', { name: 'Stock se kam karein' }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith('do packet doodh', undefined));
    expect(await screen.findByText(/1 item stock se kam hue/)).toBeInTheDocument();
    expect(screen.getByText(/ab 38 bache/)).toBeInTheDocument();
  });

  it('fills the box from an example so the format is never a guess', async () => {
    const user = userEvent.setup();
    render(<VoiceSale />);

    await user.click(screen.getByRole('button', { name: 'do packet doodh' }));

    expect(screen.getByLabelText('Kya becha?')).toHaveValue('do packet doodh');
  });

  it('will not submit an empty sentence', () => {
    render(<VoiceSale />);
    expect(screen.getByRole('button', { name: 'Stock se kam karein' })).toBeDisabled();
  });

  it('asks rather than guessing when the match is ambiguous', async () => {
    vi.spyOn(inventoryApi, 'voiceSale').mockResolvedValue(AMBIGUOUS);
    const user = userEvent.setup();

    render(<VoiceSale />);
    await user.type(screen.getByLabelText('Kya becha?'), 'do packet doodh');
    await user.click(screen.getByRole('button', { name: 'Stock se kam karein' }));

    expect(await screen.findByText(/kaunsa product tha/)).toBeInTheDocument();
    expect(screen.getByText('Milk 500ml')).toBeInTheDocument();
    expect(screen.getByText('Milk 1L')).toBeInTheDocument();
  });

  it('resends with the confirmed row when one is tapped', async () => {
    const spy = vi.spyOn(inventoryApi, 'voiceSale')
      .mockResolvedValueOnce(AMBIGUOUS)
      .mockResolvedValueOnce(APPLIED);
    const user = userEvent.setup();

    render(<VoiceSale />);
    await user.type(screen.getByLabelText('Kya becha?'), 'do packet doodh');
    await user.click(screen.getByRole('button', { name: 'Stock se kam karein' }));
    await screen.findByText(/kaunsa product tha/);

    await user.click(screen.getByRole('button', { name: /Milk 500ml.*40 stock mein/s }));

    await waitFor(() => expect(spy).toHaveBeenLastCalledWith(
      'do packet doodh', { doodh: 'inv-milk' },
    ));
  });

  it('cannot confirm a candidate the shop does not have enough of', async () => {
    vi.spyOn(inventoryApi, 'voiceSale').mockResolvedValue({
      ...AMBIGUOUS,
      needsConfirmation: [{
        ...AMBIGUOUS.needsConfirmation[0],
        quantity: 50,
        candidates: [
          { inventoryId: 'inv-milk', name: 'Milk 500ml', confidence: 0.64, available: 3 },
        ],
      }],
    });
    const user = userEvent.setup();

    render(<VoiceSale />);
    await user.type(screen.getByLabelText('Kya becha?'), 'pachas packet doodh');
    await user.click(screen.getByRole('button', { name: 'Stock se kam karein' }));

    await screen.findByText(/kaunsa product tha/);
    expect(screen.getByRole('button', { name: /Milk 500ml/s })).toBeDisabled();
  });

  it('surfaces a failure rather than silently doing nothing', async () => {
    vi.spyOn(inventoryApi, 'voiceSale').mockRejectedValue(new Error('Stock kam hai'));
    const user = userEvent.setup();

    render(<VoiceSale />);
    await user.type(screen.getByLabelText('Kya becha?'), 'do packet doodh');
    await user.click(screen.getByRole('button', { name: 'Stock se kam karein' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Stock kam hai');
  });

  it('keeps a running list of what was sold this session', async () => {
    vi.spyOn(inventoryApi, 'voiceSale').mockResolvedValue(APPLIED);
    const user = userEvent.setup();

    render(<VoiceSale />);
    await user.type(screen.getByLabelText('Kya becha?'), 'do packet doodh');
    await user.click(screen.getByRole('button', { name: 'Stock se kam karein' }));

    expect(await screen.findByText('Abhi tak')).toBeInTheDocument();
    expect(screen.getByText('“do packet doodh”')).toBeInTheDocument();
  });
});
