import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Package } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { List, ListRow, RowChevron } from '../../../components/ui/List';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { intelligenceApi } from '../../../services/api/intelligenceApi';
import { useApiResource } from '../../../hooks/useApiResource';

const rupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

export function Reorder() {
  const navigate = useNavigate();

  // Reorder candidates come from this shop's real order history, with the
  // cadence measured from the gaps between their own past purchases.
  const fetcher = useCallback(() => intelligenceApi.getReorderSuggestions(), []);
  const { data, isLoading, error, reload } = useApiResource(fetcher, { initialData: [] });
  const items = data || [];

  // Anything the cadence says is due goes first: that is the reason to open
  // this screen at all.
  const dueCount = items.filter((item) => item.dueNow).length;

  return (
    <div className="flex animate-fade-in flex-col gap-5">
      <PageHeader
        eyebrow="Reorder"
        title="Dobara order karein"
        description="Jo aap pehle mangwa chuke hain, apne hi order history ke cadence ke saath."
      />

      {error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : isLoading ? (
        <SkeletonList rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Abhi koi past order nahi"
          description="Pehla order poora hone ke baad yahaan cadence ke hisaab se suggestions aayenge."
          actionLabel="Products dekho"
          onAction={() => navigate('/retailer/distributors')}
        />
      ) : (
        <>
          {dueCount > 0 && (
            <p className="num rounded-lg bg-warning-bg px-3 py-2.5 text-sm leading-snug text-text-secondary">
              {dueCount} item{dueCount === 1 ? '' : 's'} aapke pichhle pattern ke hisaab se abhi
              due hain.
            </p>
          )}

          <List>
            {items.map((item, index) => (
              <ListRow
                key={`${item.id}-${index}`}
                onClick={() => navigate(`/retailer/distributors/${item.distributorId}`)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {item.name}
                      {item.variant && (
                        <span className="ml-1.5 font-normal text-text-muted">{item.variant}</span>
                      )}
                    </h3>
                    {item.dueNow && <Badge variant="warning" dot>Ab due hai</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-2xs text-text-muted">{item.distributorName}</p>
                  <p className="mt-1 flex items-center gap-1 text-2xs text-text-muted">
                    <Clock size={11} /> {item.suggestion}
                  </p>
                </div>

                <span className="flex-shrink-0 text-right">
                  <span className="num block text-sm font-semibold text-text-primary">
                    {rupees(item.price)}
                  </span>
                  <span className="block text-2xs text-text-muted">/ {item.unit}</span>
                </span>
                <RowChevron />
              </ListRow>
            ))}
          </List>
        </>
      )}
    </div>
  );
}
