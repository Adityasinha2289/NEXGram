import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatWidget } from './ChatWidget';
import { assistantApi } from '../../services/api/assistantApi';

/**
 * The assistant widget.
 *
 * The behaviour worth protecting is what happens *before* a complete answer
 * exists: text painted as it streams, a stop control while it runs, and a
 * refusal shown rather than swallowed. A widget that only works once the whole
 * reply has arrived is the thing streaming was built to avoid.
 */

const configured = () =>
  vi.spyOn(assistantApi, 'getStatus').mockResolvedValue({
    configured: true, model: 'gemini-2.0-flash',
  });

const open = async (user) => {
  await user.click(screen.getByRole('button', { name: 'Assistant se poochhein' }));
  await screen.findByText('NEXGram Assistant');
};

describe('ChatWidget', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts as a button, not a panel taking up the screen', () => {
    configured();
    render(<ChatWidget role="retailer" />);

    expect(screen.getByRole('button', { name: 'Assistant se poochhein' })).toBeInTheDocument();
    expect(screen.queryByText('NEXGram Assistant')).not.toBeInTheDocument();
  });

  it('offers openers suited to the role', async () => {
    configured();
    const user = userEvent.setup();

    render(<ChatWidget role="distributor" />);
    await open(user);

    expect(screen.getByText('Mere paas kitne orders pending hain?')).toBeInTheDocument();
  });

  it('paints the reply as it streams rather than after it', async () => {
    configured();
    let emit;
    vi.spyOn(assistantApi, 'chat').mockImplementation(async (_messages, { onChunk }) => {
      emit = onChunk;
      // Held open: the assertion below runs while the reply is still arriving.
      await new Promise((resolve) => setTimeout(resolve, 40));
      return 'Chaar packet';
    });
    const user = userEvent.setup();

    render(<ChatWidget role="retailer" />);
    await open(user);
    await user.type(screen.getByLabelText('Apna sawaal likhein'), 'kitna doodh');
    await user.click(screen.getByRole('button', { name: 'Bhejein' }));

    await waitFor(() => expect(emit).toBeDefined());
    // Wrapped in act(): this is a React state update driven from outside the
    // component, which is exactly what a streamed chunk is.
    await act(async () => { emit('Chaar '); });

    // On screen while `chat` is still pending - the whole point of streaming.
    expect(screen.getByText('Chaar')).toBeInTheDocument();
  });

  it('shows the question immediately, without waiting on the answer', async () => {
    configured();
    vi.spyOn(assistantApi, 'chat').mockResolvedValue('ok');
    const user = userEvent.setup();

    render(<ChatWidget role="retailer" />);
    await open(user);
    await user.type(screen.getByLabelText('Apna sawaal likhein'), 'kitna doodh hai');
    await user.click(screen.getByRole('button', { name: 'Bhejein' }));

    expect(await screen.findByText('kitna doodh hai')).toBeInTheDocument();
  });

  it('sends the whole conversation so the model has the thread', async () => {
    configured();
    const spy = vi.spyOn(assistantApi, 'chat').mockResolvedValue('haan');
    const user = userEvent.setup();

    render(<ChatWidget role="retailer" />);
    await open(user);
    await user.type(screen.getByLabelText('Apna sawaal likhein'), 'pehla');
    await user.click(screen.getByRole('button', { name: 'Bhejein' }));
    await screen.findByText('haan');

    await user.type(screen.getByLabelText('Apna sawaal likhein'), 'doosra');
    await user.click(screen.getByRole('button', { name: 'Bhejein' }));

    await waitFor(() => {
      const history = spy.mock.calls[1][0];
      expect(history.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    });
  });

  it('offers a stop while the answer is still coming', async () => {
    configured();
    vi.spyOn(assistantApi, 'chat').mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve('done'), 200)),
    );
    const user = userEvent.setup();

    render(<ChatWidget role="retailer" />);
    await open(user);
    await user.type(screen.getByLabelText('Apna sawaal likhein'), 'lambi baat');
    await user.click(screen.getByRole('button', { name: 'Bhejein' }));

    expect(await screen.findByRole('button', { name: 'Rokein' })).toBeInTheDocument();
  });

  it('shows a refusal instead of swallowing it', async () => {
    configured();
    vi.spyOn(assistantApi, 'chat').mockImplementation(async (_m, { onError }) => {
      onError('Gemini API key galat ya expired hai.');
      return '';
    });
    const user = userEvent.setup();

    render(<ChatWidget role="retailer" />);
    await open(user);
    await user.type(screen.getByLabelText('Apna sawaal likhein'), 'hi');
    await user.click(screen.getByRole('button', { name: 'Bhejein' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Gemini API key galat');
  });

  it('says how to switch it on rather than offering a box that cannot work', async () => {
    vi.spyOn(assistantApi, 'getStatus').mockResolvedValue({ configured: false, model: null });
    const user = userEvent.setup();

    render(<ChatWidget role="retailer" />);
    await open(user);

    expect(await screen.findByText('Assistant set nahi hua')).toBeInTheDocument();
    expect(screen.queryByLabelText('Apna sawaal likhein')).not.toBeInTheDocument();
  });

  it('will not send an empty question', async () => {
    configured();
    const user = userEvent.setup();

    render(<ChatWidget role="retailer" />);
    await open(user);

    expect(screen.getByRole('button', { name: 'Bhejein' })).toBeDisabled();
  });

  it('closes back to the button', async () => {
    configured();
    const user = userEvent.setup();

    render(<ChatWidget role="retailer" />);
    await open(user);
    await user.click(screen.getByRole('button', { name: 'Band karein' }));

    expect(screen.getByRole('button', { name: 'Assistant se poochhein' })).toBeInTheDocument();
  });
});
