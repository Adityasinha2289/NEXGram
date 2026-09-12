import { ArrowLeft } from 'lucide-react';
import { ProgressIndicator } from './ProgressIndicator';

/**
 * The frame around a multi-step signup.
 *
 * The wrapper used to ask for `h-100vh` and `max-w-desktop`, neither of which
 * Tailwind generates — the first is not a utility and the second reads a token
 * that lives in :root rather than @theme — so the shell had no height and no
 * width constraint at all.
 */
export function OnboardingShell({
  children,
  currentStep,
  totalSteps,
  onBack,
  title = 'Aage badho',
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label="Wapas jayein"
                className="-ml-2 grid h-10 w-10 flex-shrink-0 place-items-center rounded-full text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary"
              >
                <ArrowLeft size={20} strokeWidth={2} />
              </button>
            ) : (
              <span
                className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-text-inverse"
                aria-hidden="true"
              >
                N
              </span>
            )}
            <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-text-primary">
              {title}
            </h1>
          </div>
          <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto w-full max-w-[560px]">{children}</div>
      </main>
    </div>
  );
}
