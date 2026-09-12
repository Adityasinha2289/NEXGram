import { Calculator, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';

export function PackSummary({ packItems, totalEstimatedPrice, budget, budgetStatus }) {
  const isOverBudget = budgetStatus === 'Over budget';

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-border">
        <CardContent className="p-4">
          <h3 className="font-bold text-lg text-text-primary mb-3 flex items-center gap-2">
            <Calculator size={18} className="text-primary" /> Pack Summary
          </h3>
          
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <span className="text-text-muted text-sm">Products</span>
              <span className="font-bold text-text-primary">{packItems.length}</span>
            </div>
            
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <span className="text-text-muted text-sm">Estimated Total</span>
              <span className={`font-bold text-lg ${isOverBudget ? 'text-danger' : 'text-primary'}`}>
                ₹{totalEstimatedPrice.toLocaleString('en-IN')}
              </span>
            </div>
            
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <span className="text-text-muted text-sm">Your Budget</span>
              <span className="font-medium text-text-primary">
                {budget?.max
                  ? `₹${(budget.min || 0).toLocaleString('en-IN')} – ₹${budget.max.toLocaleString('en-IN')}`
                  : budget?.min
                    ? `₹${budget.min.toLocaleString('en-IN')}+`
                    : 'Set nahi kiya'}
              </span>
            </div>

            <div className="flex justify-between items-center mt-1">
              <span className="text-text-muted text-sm">Status</span>
              <Badge variant={isOverBudget ? 'danger' : 'success'} className="flex items-center gap-1">
                {isOverBudget ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />} 
                {budgetStatus}
              </Badge>
            </div>
          </div>
          
          <div className="mt-4 p-2 bg-warning-light rounded-md flex gap-2">
            <Info size={14} className="text-warning flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-text-primary leading-tight">
              Final price distributor ke hisaab se change ho sakta hai. Yeh sirf estimate hai.
            </p>
          </div>
        </CardContent>
      </Card>

      {packItems.length > 0 && (
        <Card className="border-border bg-surface-muted/50">
          <CardContent className="p-4">
            <h3 className="font-bold text-md text-text-primary mb-3 flex items-center gap-2">
              Yeh Pack Kyun?
            </h3>
            <ul className="flex flex-col gap-3">
              {packItems.map(item => (
                <li key={`reason-${item.id}`} className="text-sm border-l-2 border-primary pl-3 py-1">
                  <span className="font-bold text-text-primary block text-xs">{item.name}</span>
                  <span className="text-text-muted text-xs leading-snug block mt-0.5">{item.reason}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
