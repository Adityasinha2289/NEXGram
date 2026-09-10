export function ProgressIndicator({ currentStep, totalSteps }) {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex justify-between items-center text-xs text-text-muted font-medium">
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{percentage}% Complete</span>
      </div>
      <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
