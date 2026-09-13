import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Info,
  PackageSearch,
  Split,
  Store,
  TrendingDown,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Section } from '../../../components/ui/Section';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { Stat, StatGroup } from '../../../components/ui/Stat';
import { useApiResource } from '../../../hooks/useApiResource';
import { procurementApi } from '../../../services/api/procurementApi';

const rupees = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;

/**
 * One basket, priced across every local distributor at once.
 *
 * The reason a shopkeeper visits four suppliers is that each is cheapest on
 * something and nobody is cheapest on everything. This screen does that
 * comparison and then shows both answers — the cheapest split and the best
 * single supplier — because one delivery and one relationship is worth
 * something real, and the shopkeeper is the one who knows how much.
 */
export function Sourcing() {
  const navigate = useNavigate();
  const [isPlacing, setIsPlacing] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [placeError, setPlaceError] = useState(null);
  const [plan, setPlan] = useState('split');

  const fetcher = useCallback(() => procurementApi.getAutoBasket(), []);
  const { data, isLoading, error, reload } = useApiResource(fetcher);

  const items = useMemo(
    () => (data?.lines || []).map((line) => ({
      product_id: line.productId,
      quantity: line.best.quantity,
    })),
    [data],
  );

  const placeOrders = async () => {
    setIsPlacing(true);
    setPlaceError(null);
    try {
      // The plan the shopkeeper actually chose, not whichever is cheapest:
      // offering a choice and then overriding it is worse than not offering one.
      const result = await procurementApi.placeSplit(
        items,
        plan === 'single'
          ? 'Ek hi supplier se — NEXGram'
          : 'NEXGram se sabse sasta chuna gaya',
        plan,
      );
      setPlaced(result);
      if (result.failed.length) {
        setPlaceError(
          `${result.ordersPlaced} order gaye. ${result.failed.length} nahi ja paye: ` +
          result.failed.map((f) => `${f.distributorName} — ${f.reason}`).join('; '),
        );
      }
    } catch (err) {
      setPlaceError(err.message || 'Order nahi ja paya. Dobara try karein.');
    } finally {
      setIsPlacing(false);
    }
  };

  if (isLoading) return <div className="flex flex-col gap-5"><SkeletonList rows={6} /></div>;
  if (error) return <ErrorState description={error} onRetry={reload} />;
  if (!data) return null;

  const { lines, unavailable, split, singleSupplier, savingVsSingle, savingVsWorst } = data;

  if (placed && placed.ordersPlaced > 0) {
    return (
      <div className="flex animate-fade-in flex-col gap-5 pt-6">
        <EmptyState
          icon={CheckCircle2}
          title={`${placed.ordersPlaced} order bhej diye`}
          description={`Kul ${rupees(placed.totalValue)} ke order ${placed.ordersPlaced} supplier ko gaye hain.`}
          actionLabel="Orders dekhein"
          onAction={() => navigate('/retailer/orders')}
        />
        {placeError && (
          <p role="alert" className="rounded-lg bg-warning-bg px-3.5 py-3 text-sm leading-snug text-text-secondary">
            {placeError}
          </p>
        )}
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex animate-fade-in flex-col gap-5">
        <PageHeader
          eyebrow="Sourcing"
          title="Sabse saste daam par"
          description="Aapki zaroorat ko poore district ke distributors se compare karke."
        />
        <EmptyState
          icon={PackageSearch}
          title="Abhi kuch mangwane ki zaroorat nahi"
          description={data.recommendation || 'Jab stock kam hoga, yeh list khud ban jayegi.'}
          actionLabel="Shelf dekhein"
          onAction={() => navigate('/retailer/inventory')}
        />
      </div>
    );
  }

  const activeGroups = plan === 'split'
    ? split.groups
    : (singleSupplier ? [{
        distributorId: singleSupplier.distributorId,
        distributorName: singleSupplier.distributorName,
        items: singleSupplier.items,
        subtotal: singleSupplier.total,
        itemCount: singleSupplier.items.length,
      }] : []);

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        eyebrow="Sourcing"
        title="Sabse saste daam par"
        description="Yeh list aapke shelf aur area ki demand se khud bani hai. Har product ke liye sabse sasta supplier chuna gaya."
      />

      <StatGroup>
        <Stat label="Products" value={lines.length} caption="is list mein" />
        <Stat label="Kul" value={rupees(split.subtotal)} caption="sabse saste daam par" tone="brand" />
        <Stat
          label="Bachat"
          value={rupees(savingVsWorst)}
          caption="sabse mehnge supplier ke muqable"
          tone={savingVsWorst > 0 ? 'positive' : 'default'}
        />
      </StatGroup>

      {/*
        * Two plans, stated as a choice rather than a recommendation dressed up
        * as one. Splitting is usually cheaper; one supplier is one delivery and
        * one person to call when something is wrong.
        */}
      <Card elevated clip>
        <div className="border-b border-border bg-primary-subtle px-4 py-3.5">
          <p className="eyebrow">Kaise mangwayein</p>
          <p className="mt-1 max-w-[64ch] text-sm leading-snug text-text-secondary">
            {data.recommendation}
          </p>
        </div>

        <div className="grid gap-px bg-border sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setPlan('split')}
            className={`flex flex-col gap-1 px-4 py-3.5 text-left transition-colors ${
              plan === 'split' ? 'bg-primary-light' : 'bg-surface hover:bg-surface-muted'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Split size={15} strokeWidth={2} /> Alag-alag ({split.supplierCount})
              {plan === 'split' && <Badge variant="primary">Chuna hua</Badge>}
            </span>
            <span className="num text-lg font-bold leading-none text-text-primary">
              {rupees(split.subtotal)}
            </span>
            <span className="text-2xs text-text-muted">Har product sabse saste supplier se</span>
          </button>

          <button
            type="button"
            onClick={() => singleSupplier && setPlan('single')}
            disabled={!singleSupplier?.coversWholeList}
            className={`flex flex-col gap-1 px-4 py-3.5 text-left transition-colors disabled:cursor-not-allowed ${
              plan === 'single' ? 'bg-primary-light' : 'bg-surface hover:bg-surface-muted disabled:hover:bg-surface'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Store size={15} strokeWidth={2} /> Ek hi supplier
              {plan === 'single' && <Badge variant="primary">Chuna hua</Badge>}
            </span>
            {singleSupplier?.coversWholeList ? (
              <>
                <span className="num text-lg font-bold leading-none text-text-primary">
                  {rupees(singleSupplier.total)}
                </span>
                <span className="text-2xs text-text-muted">
                  {singleSupplier.distributorName} — ek hi delivery
                  {savingVsSingle > 0 && `, ${rupees(savingVsSingle)} mehnga`}
                </span>
              </>
            ) : (
              <span className="text-2xs leading-snug text-text-muted">
                Koi ek supplier poori list nahi de sakta
                {singleSupplier && ` — sabse zyada ${singleSupplier.distributorName} (${singleSupplier.itemsCovered}/${singleSupplier.itemsRequested})`}
              </span>
            )}
          </button>
        </div>
      </Card>

      {activeGroups.map((group) => (
        <Section
          key={group.distributorId}
          title={group.distributorName}
          description={`${group.itemCount} product · ${rupees(group.subtotal)}`}
        >
          <ul className="panel divide-y divide-border overflow-hidden">
            {group.items.map((item) => {
              const line = lines.find((l) => l.productId === item.productId);
              return (
                <li key={item.catalogueItemId} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">{item.name}</p>
                      {item.raisedToMoq && (
                        <Badge variant="neutral">MOQ tak badhaya</Badge>
                      )}
                      {line?.source === 'local_demand' && (
                        <Badge variant="secondary" dot>Area ki demand</Badge>
                      )}
                    </div>
                    {line?.why && (
                      <p className="mt-1 max-w-[62ch] text-2xs leading-snug text-text-muted">
                        {line.why}
                      </p>
                    )}
                    {line && line.supplierCount > 1 && (
                      <p className="num mt-1 flex items-center gap-1 text-2xs text-success">
                        <TrendingDown size={11} />
                        {line.supplierCount} suppliers compare kiye
                        {line.lineSaving > 0 && ` · ${rupees(line.lineSaving)} bachaya`}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="num text-sm font-semibold text-text-primary">
                      {rupees(item.lineTotal)}
                    </p>
                    <p className="num mt-0.5 text-2xs text-text-muted">
                      {item.quantity} × {rupees(item.unitPrice)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      ))}

      {unavailable.length > 0 && (
        <Section
          title="Yeh nahi mil raha"
          description="Aapke district mein abhi koi supplier itna stock nahi rakhta."
        >
          <ul className="panel divide-y divide-border overflow-hidden">
            {unavailable.map((item) => (
              <li key={item.productId} className="px-4 py-3">
                <p className="text-sm font-medium text-text-primary">{item.name}</p>
                <p className="mt-0.5 text-2xs leading-snug text-text-muted">{item.reason}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {placeError && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2.5 text-sm leading-snug text-danger"
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" strokeWidth={2} />
          {placeError}
        </p>
      )}

      {/*
        * Margin in rupees, next to the button, before the money moves. Folding
        * it into the prices above would make this a marketplace pretending to
        * be a price comparison.
        */}
      <Card>
        <div className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Products</span>
            <span className="num text-text-primary">
              {rupees(plan === 'split' ? split.subtotal : singleSupplier?.total || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-text-muted">
              NEXGram fee ({Math.round(split.platformMarginRate * 100)}%)
              <Info size={12} className="text-text-faint" />
            </span>
            <span className="num text-text-primary">
              {rupees(plan === 'split' ? split.platformFee : singleSupplier?.platformFee || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-sm font-semibold text-text-primary">Dena hoga</span>
            <span className="num text-xl font-bold text-text-primary">
              {rupees(plan === 'split' ? split.payable : singleSupplier?.payable || 0)}
            </span>
          </div>
          <p className="text-2xs leading-snug text-text-muted">
            Yeh fee upar ke daam mein chhupi nahi hai — daam wahi hain jo distributor ne
            list kiye.
          </p>
          <Button
            fullWidth
            size="lg"
            icon={ArrowRight}
            className="mt-1"
            isLoading={isPlacing}
            onClick={placeOrders}
          >
            {plan === 'split' && split.supplierCount > 1
              ? `${split.supplierCount} order bhejein`
              : 'Order bhejein'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
