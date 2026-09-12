export function ProgressIndicator({ currentStep, totalSteps }) {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div
      className="flex w-full flex-col gap-1.5"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label="Onboarding progress"
    >
      <div className="num flex items-center justify-between text-2xs font-medium text-text-muted">
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
