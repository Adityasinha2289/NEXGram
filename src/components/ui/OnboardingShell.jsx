import { ArrowLeft } from 'lucide-react';
import { ProgressIndicator } from './ProgressIndicator';

export function OnboardingShell({ 
  children, 
  currentStep, 
  totalSteps, 
  onBack,
  title = "Aage Badho"
}) {
  return (
    <div className="flex flex-col h-100vh w-full bg-background max-w-desktop mx-auto shadow-sm relative overflow-x-hidden">
      <header className="flex flex-col gap-3 p-4 bg-surface border-b border-border z-10 sticky top-0">
        <div className="flex items-center justify-between">
          {onBack ? (
            <button onClick={onBack} className="p-2 -ml-2 text-text-primary hover:bg-surface-muted rounded-full transition-colors" aria-label="Go back">
              <ArrowLeft size={24} />
            </button>
          ) : (
            <div className="w-10"></div> /* Spacer for alignment */
          )}
          <h1 className="font-bold text-lg">{title}</h1>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>
        <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="max-w-md mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
