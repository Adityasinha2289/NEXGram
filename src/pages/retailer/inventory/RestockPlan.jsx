import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Section } from '../../../components/ui/Section';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { Stat, StatGroup } from '../../../components/ui/Stat';
import { useApiResource } from '../../../hooks/useApiResource';
import { inventoryApi } from '../../../services/api/inventoryApi';

const rupees = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;

/**
 * What the shop should buy next, and why.
 *
 * Three different questions on one screen — what is running out, what will
 * spoil before it sells, and what the area is asking for that this shop does
 * not carry. Every line carries the sentence that produced it, because a
 * quantity without a reason is a number nobody acts on.
 */
export function RestockPlan() {
  const navigate = useNavigate();
  const fetcher = useCallback(() => inventoryApi.getRestockPlan(), []);
  const { data, isLoading, error, reload } = useApiResource(fetcher);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <SkeletonList rows={5} />
      </div>
    );
  }
  if (error) return <ErrorState description={error} onRetry={reload} />;
  if (!data) return null;

  const { reorder, expiring, newProducts, summary } = data;
  const nothingToDo = reorder.length === 0 && expiring.length === 0 && newProducts.length === 0;

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        eyebrow="Aage kya"
        title="Kya mangwana hai"
        description="Aapki apni sale ki raftaar, shelf life aur area ki demand — teeno dekh kar."
        action={
          reorder.length > 0 && (
            <Button icon={Truck} onClick={() => navigate('/retailer/sourcing')}>
              Sabse sasta kahan
            </Button>
          )
        }
      />

      {nothingToDo ? (
        <EmptyState
          icon={CheckCircle2}
          title="Abhi kuch mangwane ki zaroorat nahi"
          description="Na koi stock kam hai, na kuch expire ho raha hai. Sale hoti rahegi to yeh screen khud bata degi."
          actionLabel="Shelf dekhein"
          onAction={() => navigate('/retailer/inventory')}
        />
      ) : (
        <>
          <StatGroup>
            <Stat
              label="Mangwana hai"
              value={summary.linesToReorder}
              caption={summary.urgentLines ? `${summary.urgentLines} turant` : 'koi jaldi nahi'}
              tone={summary.urgentLines ? 'caution' : 'default'}
            />
            <Stat label="Kitne ka" value={rupees(summary.estimatedCost)} caption="anumaan" tone="brand" />
            <Stat
              label="Kharab ho sakta"
              value={rupees(summary.wastageAtRisk)}
              caption="expiry se pehle nahi bikega"
              tone={summary.wastageAtRisk > 0 ? 'negative' : 'positive'}
            />
          </StatGroup>

          {/*
            * Expiry leads when there is any. It is the only section with a
            * deadline attached — a restock can wait a day, a crate of curd
            * cannot.
            */}
          {expiring.length > 0 && (
            <Section
              title="Pehle yeh nikaalein"
              description="Yeh stock expire hone wala hai. Aaj discount par bech dena nuksan se behtar hai."
            >
              <ul className="panel divide-y divide-border overflow-hidden">
                {expiring.map((item) => (
                  <li key={item.inventoryId} className="flex items-start gap-3 px-4 py-3.5">
                    <span className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-warning-bg text-warning">
                      <CalendarClock size={15} strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-text-primary">{item.name}</h4>
                        <Badge variant={item.daysLeft <= 1 ? 'danger' : 'warning'} dot>
                          {item.daysLeft <= 0 ? 'Aaj' : `${item.daysLeft} din`}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm leading-snug text-text-secondary">{item.action}</p>
                      <p className="num mt-1 text-2xs leading-snug text-text-muted">{item.reason}</p>
                    </div>
                    {item.costValue > 0 && (
                      <span className="num flex-shrink-0 text-right text-sm font-semibold text-danger">
                        −{rupees(item.costValue)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {reorder.length > 0 && (
            <Section
              title="Stock kam ho raha hai"
              description="Aapki apni sale ki raftaar se nikala gaya — kitna aur kab tak chalega."
            >
              <ul className="panel divide-y divide-border overflow-hidden">
                {reorder.map((item) => (
                  <li key={item.inventoryId} className="flex items-start gap-3 px-4 py-3.5">
                    <span
                      className={`mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg ${
                        item.urgent ? 'bg-danger-bg text-danger' : 'bg-primary-light text-primary'
                      }`}
                    >
                      <TrendingUp size={15} strokeWidth={2} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-text-primary">{item.name}</h4>
                        {item.urgent && <Badge variant="danger" dot>Turant</Badge>}
                      </div>

                      {/* The reason, not a restatement of the numbers beside it. */}
                      <p className="mt-1 max-w-[62ch] text-sm leading-snug text-text-secondary">
                        {item.reason}
                      </p>

                      <p className="num mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-2xs text-text-muted">
                        <span>{item.onHand} bache</span>
                        {item.available ? (
                          <span className="flex items-center gap-1">
                            <Truck size={11} /> {item.distributorName} · {rupees(item.unitPrice)}
                          </span>
                        ) : (
                          <span className="text-warning">{item.supplyNote}</span>
                        )}
                      </p>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <p className="num text-lg font-bold leading-none text-text-primary">
                        {item.suggestedQuantity}
                      </p>
                      <p className="mt-0.5 text-2xs text-text-muted">mangwayein</p>
                      {item.estimatedCost != null && (
                        <p className="num mt-1 text-2xs font-medium text-text-secondary">
                          {rupees(item.estimatedCost)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/*
            * The one section no stock rule can produce: a shop cannot observe
            * demand for something it has never sold.
            */}
          {newProducts.length > 0 && (
            <Section
              title="Yeh rakhna shuru karein"
              description="Aapke area ke doosre shops ise maang rahe hain aur aap abhi nahi rakhte."
            >
              <ul className="panel divide-y divide-border overflow-hidden">
                {newProducts.map((item) => (
                  <li key={item.productId} className="flex items-start gap-3 px-4 py-3.5">
                    <span className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-secondary-subtle text-secondary">
                      <Sparkles size={15} strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="eyebrow">{item.category}</p>
                      <h4 className="mt-0.5 text-sm font-semibold text-text-primary">{item.name}</h4>
                      <p className="mt-1 max-w-[62ch] text-sm leading-snug text-text-secondary">
                        {item.reason}
                      </p>
                      {item.available && (
                        <p className="num mt-1.5 flex items-center gap-1 text-2xs text-text-muted">
                          <Truck size={11} /> {item.distributorName} · {rupees(item.unitPrice)}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="num text-lg font-bold leading-none text-text-primary">
                        {item.suggestedQuantity}
                      </p>
                      <p className="mt-0.5 text-2xs text-text-muted">se shuru</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {reorder.some((i) => !i.available) && (
            <p className="flex items-start gap-2 rounded-lg bg-warning-bg px-3.5 py-3 text-sm leading-snug text-text-secondary">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-warning" strokeWidth={2} />
              Kuch products aapke district mein koi distributor abhi stock nahi karta. Yeh
              khud ek signal hai — woh unhe list karenge to yahaan dikh jayega.
            </p>
          )}
        </>
      )}
    </div>
  );
}
