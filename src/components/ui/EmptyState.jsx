import { PackageOpen } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({ 
  icon: Icon = PackageOpen, 
  title = "Yahan kuch nahi hai", 
  description = "Abhi data available nahi hai.", 
  actionLabel, 
  onAction 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-surface rounded-lg border border-border">
      <div className="p-4 bg-surface-muted rounded-full mb-4 text-text-muted">
        <Icon size={48} strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-muted mb-6 max-w-[250px]">{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
