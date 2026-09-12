import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Clock, Search, Send } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input } from '../../../components/ui/Input';
import { List } from '../../../components/ui/List';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Section } from '../../../components/ui/Section';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { intelligenceApi } from '../../../services/api/intelligenceApi';
import { productsApi } from '../../../services/api/productsApi';

/**
 * "A customer asked for this and I could not supply it."
 *
 * This is where the product loop starts. Onboarding captures unmet demand once;
 * without this screen a shop's signal is frozen at signup and the intelligence
 * layer slowly goes stale. Reporting here recomputes the pipeline, so the
 * distributors nearby see it straight away.
 */
export function ReportDemand() {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');

  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState(null);

  const loadReports = () => intelligenceApi.getDemandReports()
    .then(setReports)
    .catch(() => setReports([]))
    .finally(() => setIsLoading(false));

  useEffect(() => { loadReports(); }, []);

  useEffect(() => {
    if (selected || query.trim().length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setIsSearching(true);
      productsApi.getProducts({ search: query, page_size: 12 })
        .then((res) => { if (!cancelled) setMatches(res.items || []); })
        .catch(() => { if (!cancelled) setMatches([]); })
        .finally(() => { if (!cancelled) setIsSearching(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, selected]);

  const activeMatches = useMemo(
    () => (selected || query.trim().length < 2 ? [] : matches),
    [selected, query, matches],
  );

  const canSubmit = useMemo(
    () => Boolean(selected) || query.trim().length >= 2,
    [selected, query],
  );

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSaving(true);
    setError(null);
    try {
      await intelligenceApi.reportDemand({
        product_id: selected?.id || null,
        // Unrecognised products still count: the engine keyword-scans the text,
        // and rejecting them would drop exactly the new demand worth hearing.
        product_name: selected ? null : query.trim(),
        note: note.trim(),
      });
      setSelected(null);
      setQuery('');
      setNote('');
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 4000);
      await loadReports();
    } catch (err) {
      setError(err.message || 'Report save nahi hui');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        eyebrow="Demand report"
        title="Kya nahi mila?"
        description="Jo cheez customer maangta hai par aapke paas nahi hai, woh yahaan batayein. Aapke area ke distributors ko yeh signal turant dikhta hai."
      />

      <Card elevated clip>
        <form onSubmit={submit} className="flex flex-col gap-4 p-4">
          {selected ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary-light px-3 py-2.5">
              <div className="min-w-0">
                <p className="eyebrow">{selected.category?.name || 'Product'}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
                  {selected.canonical_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex-shrink-0 rounded-md px-2 py-1.5 text-2xs font-semibold text-primary transition-colors hover:bg-surface"
              >
                Badlein
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Input
                label="Product ka naam"
                icon={Search}
                type="search"
                placeholder="e.g. Paneer"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              {isSearching && <SkeletonList rows={2} className="border-0" />}

              {activeMatches.length > 0 && (
                <div className="max-h-52 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                  {activeMatches.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => { setSelected(product); setMatches([]); }}
                      className="w-full px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
                    >
                      <span className="eyebrow block">
                        {product.category?.name || 'Product'}
                      </span>
                      <span className="mt-0.5 block text-sm font-medium text-text-primary">
                        {product.canonical_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {!isSearching && query.trim().length >= 2 && activeMatches.length === 0 && (
                <p className="text-2xs leading-snug text-text-muted">
                  List mein nahi mila? Koi baat nahi — aapka likha hua bhi signal banta hai.
                </p>
              )}
            </div>
          )}

          <Input
            label="Kuch aur batana hai? (optional)"
            placeholder="e.g. roz 2-3 customer maangte hain"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2.5 text-sm leading-snug text-danger"
            >
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" strokeWidth={2} />
              {error}
            </p>
          )}

          <Button type="submit" size="lg" fullWidth icon={Send} disabled={!canSubmit} isLoading={isSaving}>
            Report bhejein
          </Button>

          {justSaved && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-lg bg-success-bg px-3 py-2.5 text-sm leading-snug text-success"
            >
              <Check size={16} className="mt-0.5 flex-shrink-0" strokeWidth={2.5} />
              Report darj ho gayi. Aapke area ka signal update ho gaya.
            </p>
          )}
        </form>
      </Card>

      <Section
        title="Aapki reports"
        description="Jo aapne ab tak bheja hai. Yehi aapke area ka demand signal banata hai."
      >
        {isLoading ? (
          <SkeletonList rows={3} />
        ) : reports.length === 0 ? (
          <EmptyState
            title="Abhi tak koi report nahi"
            description="Upar se pehli report bhejein — ek report bhi aapke area ke signal ko badal deti hai."
          />
        ) : (
          <List>
            {reports.map((report, index) => (
              <div
                key={`${report.reportedAt}-${index}`}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  {report.category && <p className="eyebrow">{report.category}</p>}
                  <p className="mt-0.5 text-sm font-medium text-text-primary">
                    {report.product || report.note}
                  </p>
                  {report.product && report.note && (
                    <p className="mt-0.5 text-2xs leading-snug text-text-muted">{report.note}</p>
                  )}
                </div>
                <span className="num flex flex-shrink-0 items-center gap-1 text-2xs text-text-muted">
                  <Clock size={11} />
                  {new Date(report.reportedAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short',
                  })}
                </span>
              </div>
            ))}
          </List>
        )}
      </Section>
    </div>
  );
}
