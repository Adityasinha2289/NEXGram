import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Keyboard, Mic, MicOff, Undo2 } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Section } from '../../../components/ui/Section';
import { inventoryApi } from '../../../services/api/inventoryApi';
import { useSpeechRecognition } from '../../../hooks/useSpeechRecognition';

const rupees = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;

const EXAMPLES = ['do packet doodh', 'ek kilo chini aur do dahi', 'teen packet biscuit'];

/**
 * Selling at the counter without touching the phone.
 *
 * The shopkeeper says what the customer bought and the stock comes off the
 * shelf. Transcription happens on the device, so nothing is recorded and
 * nothing is uploaded.
 *
 * The typed box is not a degraded path — it is the primary one wherever the
 * browser has no speech API (Firefox, most iOS), and the one a shopkeeper
 * reaches for in a shop too loud to dictate in. Both post the same sentence to
 * the same endpoint.
 */
export function VoiceSale() {
  const [typed, setTyped] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  // Newest first, so the last thing said is the thing on screen.
  const [history, setHistory] = useState([]);

  const submit = useCallback(async (transcript, confirmations) => {
    const sentence = (transcript || '').trim();
    if (!sentence) return;

    setIsSaving(true);
    setError(null);
    try {
      const response = await inventoryApi.voiceSale(sentence, confirmations);
      setResult(response);
      setTyped('');
      if (response.applied.length) {
        setHistory((prev) => [
          { at: Date.now(), transcript: sentence, applied: response.applied, total: response.totalValue },
          ...prev,
        ].slice(0, 8));
      }
    } catch (err) {
      setError(err.message || 'Sale record nahi hui. Dobara try karein.');
    } finally {
      setIsSaving(false);
    }
  }, []);

  const { isSupported, isListening, interim, error: micError, start, stop } =
    useSpeechRecognition({ onResult: submit });

  // Autofocus the box wherever the mic is not an option, so the screen is
  // immediately usable rather than showing a disabled button.
  const inputRef = useRef(null);
  useEffect(() => {
    if (!isSupported) inputRef.current?.focus?.();
  }, [isSupported]);

  const confirmLine = (line, inventoryId) =>
    submit(line.heard, { [line.phrase]: inventoryId });

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        eyebrow="Counter sale"
        title="Bol kar bechein"
        description="Customer ne jo liya woh bol dein — stock apne aap kam ho jayega. Aawaz aapke phone se bahar nahi jaati."
      />

      <Card elevated clip>
        <div className="flex flex-col items-center gap-4 px-4 py-7">
          {isSupported ? (
            <>
              {/*
                * One large target. A shopkeeper taps this with one hand while
                * the other is handing over change, so it is sized for a thumb
                * and not for a cursor.
                */}
              <button
                type="button"
                onClick={isListening ? stop : start}
                disabled={isSaving}
                aria-label={isListening ? 'Sunna band karein' : 'Bolna shuru karein'}
                className={`grid h-24 w-24 place-items-center rounded-full transition-all disabled:opacity-60 ${
                  isListening
                    ? 'animate-pulse bg-danger text-text-inverse shadow-elevated'
                    : 'bg-primary text-text-inverse hover:bg-primary-hover'
                }`}
              >
                {isListening ? <MicOff size={34} strokeWidth={2} /> : <Mic size={34} strokeWidth={2} />}
              </button>

              <p className="text-center text-sm font-medium text-text-primary">
                {isListening ? 'Sun rahe hain…' : 'Tap karke bolein'}
              </p>
              {interim && (
                <p className="max-w-[36ch] text-center text-sm italic text-text-muted">
                  “{interim}”
                </p>
              )}
            </>
          ) : (
            <div className="flex max-w-[46ch] flex-col items-center gap-2 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-muted text-text-muted">
                <Keyboard size={22} strokeWidth={2} />
              </span>
              <p className="text-sm font-medium text-text-primary">
                Is browser mein mic support nahi hai
              </p>
              <p className="text-sm leading-snug text-text-muted">
                Koi baat nahi — neeche type kar dein, kaam bilkul waise hi hoga.
              </p>
            </div>
          )}

          {micError && (
            <p className="flex items-start gap-2 rounded-lg bg-warning-bg px-3 py-2 text-sm leading-snug text-text-secondary">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0 text-warning" strokeWidth={2} />
              {micError}
            </p>
          )}
        </div>

        <form
          onSubmit={(event) => { event.preventDefault(); submit(typed); }}
          className="flex flex-col gap-3 border-t border-border bg-surface-muted px-4 py-4"
        >
          <Input
            ref={inputRef}
            label={isSupported ? 'Ya yahaan type karein' : 'Kya becha?'}
            placeholder="e.g. do packet doodh"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setTyped(example)}
                className="rounded-md border border-border bg-surface px-2 py-1 text-2xs text-text-muted transition-colors hover:border-text-faint hover:text-text-primary"
              >
                {example}
              </button>
            ))}
          </div>
          <Button type="submit" fullWidth isLoading={isSaving} disabled={!typed.trim()}>
            Stock se kam karein
          </Button>
        </form>
      </Card>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2.5 text-sm leading-snug text-danger"
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" strokeWidth={2} />
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          {result.applied.length > 0 && (
            <div className="rounded-xl border border-success/25 bg-success-bg px-4 py-3.5">
              <p className="flex items-center gap-2 text-sm font-semibold text-success">
                <Check size={16} strokeWidth={2.5} />
                {result.applied.length} item stock se kam hue · {rupees(result.totalValue)}
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {result.applied.map((item) => (
                  <li key={item.inventoryId} className="num text-sm text-text-secondary">
                    {item.name} × {item.quantity}
                    <span className="text-text-muted"> — ab {item.remaining} bache</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/*
            * Anything it was not sure of. Nothing has been deducted for these:
            * a wrong guess costs the shopkeeper their trust in the stock count,
            * which is worth more than the tap it takes to confirm.
            */}
          {result.needsConfirmation.map((line) => (
            <Card key={line.heard} clip>
              <div className="border-b border-border bg-warning-bg px-4 py-3">
                <p className="text-sm font-semibold text-text-primary">
                  “{line.heard}” — kaunsa product tha?
                </p>
                <p className="mt-0.5 text-2xs leading-snug text-text-secondary">{line.reason}</p>
              </div>
              {line.candidates.length > 0 ? (
                <ul className="divide-y divide-border">
                  {line.candidates.map((candidate) => (
                    <li key={candidate.inventoryId}>
                      <button
                        type="button"
                        disabled={isSaving || candidate.available < line.quantity}
                        onClick={() => confirmLine(line, candidate.inventoryId)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted disabled:opacity-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-text-primary">
                            {candidate.name}
                          </span>
                          <span className="num block text-2xs text-text-muted">
                            {candidate.available} stock mein
                          </span>
                        </span>
                        <span className="flex flex-shrink-0 items-center gap-2">
                          <Badge variant="neutral">
                            {Math.round(candidate.confidence * 100)}%
                          </Badge>
                          <span className="text-sm font-semibold text-primary">
                            {line.quantity} bechein
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-4 text-sm text-text-muted">
                  Is naam ka koi product aapki inventory mein nahi hai.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <Section title="Abhi tak" description="Is session mein jo bola gaya.">
          <ul className="panel divide-y divide-border overflow-hidden">
            {history.map((entry) => (
              <li key={entry.at} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-text-primary">“{entry.transcript}”</p>
                  <p className="num mt-0.5 text-2xs text-text-muted">
                    {entry.applied.map((a) => `${a.name} ×${a.quantity}`).join(', ')}
                  </p>
                </div>
                <span className="num flex flex-shrink-0 items-center gap-1.5 text-sm font-semibold text-text-primary">
                  {rupees(entry.total)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <p className="flex items-start gap-2 text-2xs leading-snug text-text-muted">
        <Undo2 size={13} className="mt-0.5 flex-shrink-0" strokeWidth={2} />
        Galat kam ho gaya? Inventory screen par jaakar stock theek kar sakte hain — har
        change ledger mein dikhta hai.
      </p>
    </div>
  );
}
