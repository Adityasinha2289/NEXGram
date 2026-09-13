import { useCallback, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bike,
  Check,
  MapPin,
  Phone,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FilterChips } from '../../../components/ui/FilterChips';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { useApiResource } from '../../../hooks/useApiResource';
import { storefrontApi } from '../../../services/api/storefrontApi';
import { consumerStatusFor } from '../../../utils/consumerOrderStatus';

const rupees = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;

/**
 * What the shopkeeper can do next, mirrored from the server's transition table
 * so a button never offers a move the API is going to refuse.
 */
const MOVES = {
  placed: [
    { to: 'accepted', label: 'Accept karein', tone: 'primary', needsRunner: false },
    { to: 'rejected', label: 'Mana karein', tone: 'ghost', needsRunner: false },
  ],
  accepted: [
    { to: 'out_for_delivery', label: 'Bhej dein', tone: 'primary', needsRunner: true },
    { to: 'cancelled', label: 'Cancel', tone: 'ghost', needsRunner: false },
  ],
  out_for_delivery: [
    { to: 'delivered', label: 'Pahunch gaya', tone: 'primary', needsRunner: false },
  ],
};

const FILTERS = [
  { value: 'all', label: 'Sab' },
  { value: 'placed', label: 'Naye' },
  { value: 'accepted', label: 'Taiyar karein' },
  { value: 'out_for_delivery', label: 'Raaste mein' },
  { value: 'delivered', label: 'Ho gaye' },
];

/**
 * The shop's delivery desk.
 *
 * Accepting is the moment the goods are committed, so it decrements the same
 * shelf the counter sells from — which is why an order can be refused at accept
 * time if a walk-in customer bought the last of it first.
 */
export function Deliveries() {
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [runnerFormOpen, setRunnerFormOpen] = useState(false);

  const ordersFetcher = useCallback(() => storefrontApi.getShopOrders(), []);
  const { data: orders, isLoading, error: loadError, reload } =
    useApiResource(ordersFetcher, { initialData: [] });

  const runnersFetcher = useCallback(() => storefrontApi.getRunners(), []);
  const { data: runners, reload: reloadRunners } =
    useApiResource(runnersFetcher, { initialData: [] });

  const activeRunners = useMemo(
    () => (runners || []).filter((r) => r.isActive),
    [runners],
  );

  const counts = useMemo(() => {
    const tally = { all: (orders || []).length };
    (orders || []).forEach((o) => { tally[o.status] = (tally[o.status] || 0) + 1; });
    return tally;
  }, [orders]);

  const visible = useMemo(
    () => (filter === 'all' ? orders || [] : (orders || []).filter((o) => o.status === filter)),
    [orders, filter],
  );

  const move = async (order, to, runnerId) => {
    setBusyId(order.id);
    setError(null);
    try {
      await storefrontApi.updateOrderStatus(order.id, {
        status: to,
        runner_id: runnerId,
      });
      reload();
    } catch (err) {
      setError(err.message || 'Status badal nahi paya.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex animate-fade-in flex-col gap-5">
      <PageHeader
        eyebrow="Home delivery"
        title="Ghar tak ke order"
        description="Aas-paas ke customers ne aapke shelf se jo mangwaya hai. Accept karte hi stock kam ho jata hai."
        action={
          <Button variant="outline" icon={Bike} onClick={() => setRunnerFormOpen(true)}>
            Delivery waale
          </Button>
        }
      />

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2.5 text-sm leading-snug text-danger">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" strokeWidth={2} />
          {error}
        </p>
      )}

      {/*
        * A shop with no runner cannot dispatch anything, so this is said before
        * they hit a disabled button and wonder why.
        */}
      {activeRunners.length === 0 && (orders || []).length > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-warning-bg px-3.5 py-3 text-sm leading-snug text-text-secondary">
          <Bike size={16} className="mt-0.5 flex-shrink-0 text-warning" strokeWidth={2} />
          Abhi koi delivery waala add nahi kiya. Order bhejne ke liye kam se kam ek chahiye.
        </p>
      )}

      {loadError ? (
        <ErrorState description={loadError} onRetry={reload} />
      ) : isLoading ? (
        <SkeletonList rows={4} />
      ) : (orders || []).length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Abhi koi online order nahi"
          description="Jo stock aapne online list kiya hai, woh aas-paas ke customers ko dikhta hai. Order aate hi yahaan aa jayega."
        />
      ) : (
        <>
          <FilterChips
            name="delivery-status"
            label="Status se filter karein"
            options={FILTERS.filter((f) => f.value === 'all' || counts[f.value])
              .map((f) => ({ ...f, count: counts[f.value] || 0 }))}
            value={filter}
            onChange={setFilter}
          />

          {visible.length === 0 ? (
            <EmptyState title="Is status mein kuch nahi" description="Koi doosra status chunein." />
          ) : (
            <ul className="flex flex-col gap-3">
              {visible.map((order) => {
                const status = consumerStatusFor(order.status);
                const moves = MOVES[order.status] || [];
                const isBusy = busyId === order.id;

                return (
                  <li key={order.id} className="panel overflow-hidden">
                    <div className="flex items-start justify-between gap-3 border-b border-border bg-surface-muted px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="num text-sm font-semibold text-text-primary">
                            {order.orderNumber}
                          </span>
                          <Badge variant={status.variant} dot>{status.label}</Badge>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-text-secondary">
                          {order.customer?.name}
                          {order.distanceKm != null && ` · ${order.distanceKm} km`}
                          {` · ${order.deliveryEstimate}`}
                        </p>
                      </div>
                      <span className="num flex-shrink-0 text-base font-bold text-text-primary">
                        {rupees(order.total)}
                      </span>
                    </div>

                    <ul className="divide-y divide-border">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                          <span className="min-w-0 text-sm text-text-primary">
                            {item.name}
                            {item.variant && <span className="text-text-muted"> {item.variant}</span>}
                          </span>
                          <span className="num flex-shrink-0 text-2xs text-text-muted">
                            {item.quantity} × {rupees(item.unitPrice)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* The runner needs somewhere to go and a number to call. */}
                    <div className="flex flex-col gap-1 border-t border-border px-4 py-3">
                      <p className="flex items-start gap-1.5 text-sm leading-snug text-text-secondary">
                        <MapPin size={14} className="mt-0.5 flex-shrink-0 text-text-muted" />
                        {order.customer?.address || 'Address nahi diya'}
                        {order.customer?.landmark && ` — ${order.customer.landmark}`}
                      </p>
                      {order.customer?.mobile && (
                        <a
                          href={`tel:${order.customer.mobile}`}
                          className="num flex w-fit items-center gap-1.5 text-sm font-medium text-primary"
                        >
                          <Phone size={13} /> {order.customer.mobile}
                        </a>
                      )}
                      {order.note && (
                        <p className="mt-0.5 text-2xs italic leading-snug text-text-muted">
                          “{order.note}”
                        </p>
                      )}
                      {order.runner && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-2xs text-text-muted">
                          <Bike size={12} /> {order.runner.name} le kar gaya hai
                        </p>
                      )}
                    </div>

                    {moves.length > 0 && (
                      <div className="flex flex-col gap-2 border-t border-border bg-surface-muted p-3 sm:flex-row-reverse">
                        {moves.map((m) => (
                          <Button
                            key={m.to}
                            variant={m.tone === 'primary' ? 'primary' : 'ghost'}
                            fullWidth
                            size="sm"
                            icon={m.tone === 'primary' ? Check : X}
                            isLoading={isBusy}
                            disabled={isBusy || (m.needsRunner && activeRunners.length === 0)}
                            onClick={() => move(
                              order, m.to,
                              m.needsRunner ? activeRunners[0]?.id : undefined,
                            )}
                          >
                            {m.label}
                            {m.needsRunner && activeRunners[0] && ` (${activeRunners[0].name})`}
                          </Button>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {runnerFormOpen && (
        <RunnerManager
          runners={runners || []}
          onClose={() => setRunnerFormOpen(false)}
          onChanged={reloadRunners}
        />
      )}
    </div>
  );
}

/** Who delivers for this shop. A bicycle is the whole logistics network. */
function RunnerManager({ runners, onClose, onChanged }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [mode, setMode] = useState('cycle');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const add = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      await storefrontApi.addRunner({ name: name.trim(), mobile: mobile.trim() || undefined, mode });
      setName('');
      setMobile('');
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Add nahi ho paya');
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id) => {
    setError(null);
    try {
      await storefrontApi.removeRunner(id);
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Hata nahi paye');
    }
  };

  const active = runners.filter((r) => r.isActive);

  return (
    <Modal title="Delivery waale" onClose={onClose}>
      <div className="flex flex-col gap-4 p-4">
        {active.length > 0 ? (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {active.map((runner) => (
              <li key={runner.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{runner.name}</p>
                  <p className="num text-2xs text-text-muted">
                    {runner.mode === 'cycle' ? 'Cycle par' : 'Paidal'}
                    {runner.mobile && ` · ${runner.mobile}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(runner.id)}
                  aria-label={`${runner.name} ko hatayein`}
                  className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-md text-text-muted transition-colors hover:bg-danger-bg hover:text-danger"
                >
                  <Trash2 size={15} strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg bg-surface-muted px-3 py-2.5 text-sm text-text-muted">
            Abhi koi nahi. Ek add karein taaki order bheje ja sakein.
          </p>
        )}

        <form onSubmit={add} className="flex flex-col gap-3 border-t border-border pt-4">
          <Input label="Naam" placeholder="e.g. Chotu" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Mobile (optional)"
            type="tel"
            inputMode="numeric"
            placeholder="10 digit"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text-secondary">Kaise jaate hain</span>
            <select
              className="h-[42px] w-full cursor-pointer rounded-md border border-border-strong bg-surface px-3 text-text-primary transition-colors hover:border-text-faint focus:border-primary focus:outline-none"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="cycle">Cycle par</option>
              <option value="walk">Paidal</option>
            </select>
          </label>
          {error && <p role="alert" className="text-2xs text-danger">{error}</p>}
          <Button type="submit" icon={Plus} fullWidth isLoading={isSaving} disabled={!name.trim()}>
            Add karein
          </Button>
        </form>
      </div>
    </Modal>
  );
}
