import { CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent } from './Card';

export function OptionCard({ 
  title, 
  description, 
  icon: Icon, 
  selected = false, 
  onClick,
  multiSelect = false
}) {
  return (
    <Card 
      interactive 
      onClick={onClick}
      className={`border-2 transition-colors ${selected ? 'border-primary bg-primary-light' : 'border-transparent'}`}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className={`p-2 rounded-lg ${selected ? 'bg-primary text-text-inverse' : 'bg-surface-muted text-text-muted'}`}>
              <Icon size={24} />
            </div>
          )}
          <div>
            <h4 className="font-bold text-md">{title}</h4>
            {description && <p className="text-sm text-text-muted mt-1">{description}</p>}
          </div>
        </div>
        <div className="text-primary flex-shrink-0 ml-2">
          {selected ? (
            <CheckCircle2 size={24} className="fill-primary text-surface" />
          ) : multiSelect ? (
            <div className="w-6 h-6 border-2 border-text-muted rounded flex-shrink-0"></div>
          ) : (
            <Circle size={24} className="text-text-muted" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
