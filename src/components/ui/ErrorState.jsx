import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export function ErrorState({ 
  title = "Kuch galat ho gaya", 
  description = "System error, kripya thodi der baad try karein.", 
  onRetry 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-danger-bg rounded-lg border border-danger">
      <AlertTriangle size={48} className="text-danger mb-4" />
      <h3 className="text-lg font-bold text-danger mb-2">{title}</h3>
      <p className="text-sm text-danger opacity-80 mb-6 max-w-[250px]">{description}</p>
      {onRetry && (
        <Button variant="danger" onClick={onRetry}>Dobara Try Karein</Button>
      )}
    </div>
  );
}
