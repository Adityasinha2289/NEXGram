import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, MessageCircle, Send, Sparkles, Square, X } from 'lucide-react';
import { assistantApi } from '../../services/api/assistantApi';

const SUGGESTIONS = {
  retailer: [
    'Kaunsa stock kam ho raha hai?',
    'Paneer ka margin kaise badhaun?',
    'GST number kaise banta hai?',
  ],
  distributor: [
    'Mere paas kitne orders pending hain?',
    'Naye retailers kaise jodun?',
    'Cold chain ka kharcha kaise kam karein?',
  ],
  customer: [
    'Paas ki dukaan kitni door hai?',
    'Order kitni der mein aayega?',
    'Paneer fresh kaise pehchanein?',
  ],
};

/**
 * The assistant, on every screen.
 *
 * A floating button rather than a page: a question arrives while the
 * shopkeeper is looking at something else, and making them navigate away to
 * ask it means they mostly will not.
 *
 * The reply is painted as it streams. Waiting for a complete answer before
 * showing anything is the difference between "fast" and "it froze" on a rural
 * connection, and it is the whole reason the endpoint streams at all.
 */
export function ChatWidget({ role = 'retailer' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Asked once, on open. A shop with no key configured should not be offered a
  // chat box that can only fail.
  useEffect(() => {
    if (!isOpen || status) return;
    assistantApi.getStatus()
      .then(setStatus)
      .catch(() => setStatus({ configured: false }));
  }, [isOpen, status]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Follow the answer as it arrives.
  //
  // Assigning scrollTop rather than calling scrollTo: the latter is missing in
  // jsdom and in older mobile WebViews, where it throws instead of degrading.
  // Smooth scrolling is also wrong here - it fights text that is still
  // streaming in and lands behind it.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  const send = useCallback(async (text) => {
    const question = (text ?? draft).trim();
    if (!question || isBusy) return;

    const history = [...messages, { role: 'user', text: question }];
    setMessages(history);
    setDraft('');
    setStreaming('');
    setError(null);
    setIsBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const reply = await assistantApi.chat(history, {
        signal: controller.signal,
        onChunk: (chunk) => setStreaming((prev) => prev + chunk),
        onError: setError,
      });
      if (reply) setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      // An aborted request is the user pressing stop, not a failure.
      if (err.name !== 'AbortError') {
        setError(err.message || 'Assistant se baat nahi ho payi.');
      }
    } finally {
      setStreaming('');
      setIsBusy(false);
      abortRef.current = null;
    }
  }, [draft, isBusy, messages]);

  const stop = () => abortRef.current?.abort();

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Assistant se poochhein"
        className="fixed bottom-20 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-text-inverse shadow-elevated transition-transform hover:scale-105 md:bottom-6"
      >
        <MessageCircle size={24} strokeWidth={2} />
      </button>
    );
  }

  const unconfigured = status && !status.configured;

  return (
    <div className="fixed bottom-20 right-4 z-40 flex h-[min(560px,72vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-elevated md:bottom-6">
      <header className="flex items-center gap-2.5 border-b border-border bg-primary-subtle px-4 py-3">
        <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-primary text-text-inverse">
          <Sparkles size={15} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary">NEXGram Assistant</p>
          <p className="truncate text-2xs text-text-muted">
            {unconfigured ? 'Abhi set nahi hai' : 'Kuch bhi poochhein — Hindi ya English'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Band karein"
          className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
        >
          <X size={17} strokeWidth={2} />
        </button>
      </header>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {unconfigured ? (
          <div className="m-auto max-w-[30ch] text-center">
            <p className="text-sm font-medium text-text-primary">Assistant set nahi hua</p>
            <p className="mt-1 text-2xs leading-snug text-text-muted">
              Backend ke <code className="rounded bg-surface-muted px-1">.env</code> mein
              <code className="mx-1 rounded bg-surface-muted px-1">GEMINI_API_KEY</code>
              daal kar server restart karein.
            </p>
          </div>
        ) : messages.length === 0 && !streaming ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm leading-snug text-text-muted">
              Apne business ke baare mein ya kuch bhi aur poochh sakte hain.
            </p>
            {(SUGGESTIONS[role] || SUGGESTIONS.retailer).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:border-primary hover:text-text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {messages.map((message, i) => (
          <div
            key={`${i}-${message.role}`}
            className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-snug ${
              message.role === 'user'
                ? 'self-end bg-primary text-text-inverse'
                : 'self-start bg-surface-muted text-text-primary'
            }`}
          >
            {message.text}
          </div>
        ))}

        {/* The in-flight answer, painted as it arrives. */}
        {streaming && (
          <div className="max-w-[85%] self-start whitespace-pre-wrap rounded-xl bg-surface-muted px-3 py-2 text-sm leading-snug text-text-primary">
            {streaming}
          </div>
        )}

        {isBusy && !streaming && (
          <div className="flex gap-1 self-start rounded-xl bg-surface-muted px-3 py-3">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-faint"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 self-start rounded-lg bg-danger-bg px-3 py-2 text-2xs leading-snug text-danger"
          >
            <AlertCircle size={13} className="mt-px flex-shrink-0" strokeWidth={2.25} />
            {error}
          </p>
        )}
      </div>

      {!unconfigured && (
        <form
          onSubmit={(event) => { event.preventDefault(); send(); }}
          className="flex items-end gap-2 border-t border-border p-3"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter is a new line. On a phone the send
              // button is the target, so this is for the counter's laptop.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Kuch bhi poochhein…"
            aria-label="Apna sawaal likhein"
            className="max-h-24 min-h-[42px] flex-1 resize-none rounded-md border border-border-strong bg-surface px-3 py-2.5 text-sm text-text-primary transition-colors focus:border-primary focus:outline-none"
          />
          {isBusy ? (
            <button
              type="button"
              onClick={stop}
              aria-label="Rokein"
              className="grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-md bg-surface-muted text-text-secondary transition-colors hover:bg-border"
            >
              <Square size={15} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Bhejein"
              className="grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-md bg-primary text-text-inverse transition-colors hover:bg-primary-hover disabled:opacity-40"
            >
              <Send size={16} strokeWidth={2} />
            </button>
          )}
        </form>
      )}
    </div>
  );
}
