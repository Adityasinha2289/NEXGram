import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  Mic,
  PackagePlus,
  Search,
  Trash2,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FilterChips } from '../../../components/ui/FilterChips';
import { Input } from '../../../components/ui/Input';
import { List } from '../../../components/ui/List';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { Stat, StatGroup } from '../../../components/ui/Stat';
import { useApiResource } from '../../../hooks/useApiResource';
import { useDebounced } from '../../../hooks/useDebounced';
import { inventoryApi } from '../../../services/api/inventoryApi';
import { InventoryRow } from './components/InventoryRow';
import { ReceiveStockForm } from './components/ReceiveStockForm';

const rupees = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;

const FILTERS = [
  { value: 'all', label: 'Sab' },
  { value: 'low', label: 'Kam hai' },
  { value: 'expiring', label: 'Expire ho raha' },
];

/**
 * What is on the shop's shelf right now.
 *
 * Ordered by what needs attention rather than alphabetically: out of stock
 * first, then expiring, then low. A shopkeeper opens this to find a problem,
 * not to read a list.
 */
export function Inventory() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [notice, setNotice] = useState(null);

  const debounced = useDebounced(search, 300);
  const fetcher = useCallback(
    () => inventoryApi.getInventory({ search: debounced.trim() || undefined }),
    [debounced],
  );
  const { data, isLoading, error, reload } = useApiResource(fetcher, { initialData: [] });
  const items = useMemo(() => data || [], [data]);

  const counts = useMemo(() => ({
    all: items.length,
    low: items.filter((i) => i.isLow).length,
    expiring: items.filter((i) => i.expiringQuantity > 0).length,
  }), [items]);

  const visible = useMemo(() => {
    if (filter === 'low') return items.filter((i) => i.isLow);
    if (filter === 'expiring') return items.filter((i) => i.expiringQuantity > 0);
    return items;
  }, [items, filter]);

  // Stock value at cost: what is tied up on the shelf, not what it might sell
  // for. The second figure flatters, and a shopkeeper deciding how much to
  // spend this week needs the first.
  const stockValue = items.reduce((sum, i) => sum + (i.unitCost || 0) * i.quantity, 0);
  const expiredCount = items.reduce((sum, i) => sum + i.expiredQuantity, 0);

  const writeOff = async () => {
    setNotice(null);
    try {
      const result = await inventoryApi.writeOffExpired();
      setNotice(
        result.totalQuantity > 0
          ? `${result.totalQuantity} expired items hataye gaye — ${rupees(result.totalCostValue)} ka nuksan record hua.`
          : 'Koi expired stock nahi mila.',
      );
      reload();
    } catch (err) {
      setNotice(err.message || 'Write-off nahi ho paya.');
    }
  };

  return (
    <div className="flex animate-fade-in flex-col gap-5">
      <PageHeader
        eyebrow="Meri dukaan"
        title="Shelf stock"
        description="Jo abhi dukaan mein hai. Har sale — counter, aawaz ya online — yahin se kam hoti hai."
        action={
          <div className="flex gap-2">
            <Button variant="outline" icon={Mic} onClick={() => navigate('/retailer/voice-sale')}>
              Bol kar bechein
            </Button>
            <Button icon={PackagePlus} onClick={() => setIsFormOpen(true)}>
              Stock aaya
            </Button>
          </div>
        }
      />

      {error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : isLoading ? (
        <SkeletonList rows={6} />
      ) : items.length === 0 && !debounced ? (
        <EmptyState
          icon={Boxes}
          title="Abhi shelf khaali hai"
          description="Jo stock dukaan mein hai woh add karein — uske baad sale, expiry aur restock sab apne aap chalta hai."
          actionLabel="Pehla stock add karein"
          onAction={() => setIsFormOpen(true)}
        />
      ) : (
        <>
          <StatGroup>
            <Stat label="Products" value={items.length} caption="shelf par" />
            <Stat
              label="Stock value"
              value={rupees(stockValue)}
              caption="cost par"
              tone="brand"
            />
            <Stat
              label="Kam ho raha"
              value={counts.low}
              caption={counts.low ? 'abhi mangwana chahiye' : 'sab theek hai'}
              tone={counts.low ? 'caution' : 'positive'}
            />
          </StatGroup>

          {expiredCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/25 bg-danger-bg px-4 py-3">
              <p className="flex items-start gap-2 text-sm leading-snug text-text-secondary">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-danger" strokeWidth={2} />
                <span>
                  <span className="num font-semibold text-danger">{expiredCount}</span> items
                  expire ho chuke hain aur abhi bhi count mein hain.
                </span>
              </p>
              <Button variant="outline" size="sm" icon={Trash2} onClick={writeOff}>
                Hata dein
              </Button>
            </div>
          )}

          {notice && (
            <p role="status" className="rounded-lg bg-surface-muted px-3.5 py-2.5 text-sm text-text-secondary">
              {notice}
            </p>
          )}

          <Input
            icon={Search}
            type="search"
            placeholder="Product dhoondhein"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Inventory mein dhoondhein"
          />

          {counts.low + counts.expiring > 0 && (
            <FilterChips
              name="inventory-filter"
              label="Filter"
              options={FILTERS.map((f) => ({ ...f, count: counts[f.value] }))}
              value={filter}
              onChange={setFilter}
            />
          )}

          {visible.length === 0 ? (
            <EmptyState
              icon={filter === 'expiring' ? CalendarClock : Boxes}
              title={debounced ? 'Kuch nahi mila' : 'Is filter mein kuch nahi'}
              description={
                debounced
                  ? `"${debounced}" naam ka koi product shelf par nahi hai.`
                  : 'Koi doosra filter chunein.'
              }
            />
          ) : (
            <List>
              {visible.map((item) => (
                <InventoryRow key={item.id} item={item} onChanged={reload} />
              ))}
            </List>
          )}
        </>
      )}

      {isFormOpen && (
        <ReceiveStockForm
          onClose={() => setIsFormOpen(false)}
          onSaved={() => { setIsFormOpen(false); reload(); }}
        />
      )}
    </div>
  );
}
