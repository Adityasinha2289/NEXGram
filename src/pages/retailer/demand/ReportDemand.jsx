import { useEffect, useMemo, useState } from 'react';
import { Check, Clock, MessageSquarePlus, Search, Send } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
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

  const loadReports = () =>
    intelligenceApi.getDemandReports()
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setIsLoading(false));

  useEffect(() => { loadReports(); }, []);

  useEffect(() => {
    if (selected || query.trim().length < 2) {
      setMatches([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(() => {
      productsApi.getProducts({ search: query, page_size: 12 })
        .then(res => { if (!cancelled) setMatches(res.items || []); })
        .catch(() => { if (!cancelled) setMatches([]); })
        .finally(() => { if (!cancelled) setIsSearching(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, selected]);

  const canSubmit = useMemo(
    () => Boolean(selected) || query.trim().length >= 2,
    [selected, query],
  );

  const submit = async () => {
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
    <div className="flex flex-col gap-5 pb-6 animate-fade-in">
      <header>
        <h2 className="text-2xl font-bold text-text-primary leading-tight">Kya Nahi Mila?</h2>
        <p className="text-sm text-text-muted mt-1">
          Jo cheez customer maangta hai par aapke paas nahi hai, woh yahan batayein.
          Aapke area ke distributors ko yeh signal turant dikhta hai.
        </p>
      </header>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex flex-col gap-3">
          {selected ? (
            <div className="bg-surface border border-primary/20 rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                  {selected.category?.name || 'Product'}
                </p>
                <p className="font-bold text-text-primary truncate">{selected.canonical_name}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-xs font-medium text-primary hover:underline flex-shrink-0"
              >
                Badlein
              </button>
            </div>
          ) : (
            <>
              <Input
                label="Product ka naam"
                icon={Search}
                placeholder="e.g. Paneer"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {isSearching && <LoadingSpinner size={18} />}
              {matches.length > 0 && (
                <div className="border border-border rounded-lg bg-surface max-h-48 overflow-y-auto divide-y divide-border">
                  {matches.map(product => (
                    <button
                      key={product.id}
                      onClick={() => { setSelected(product); setMatches([]); }}
                      className="w-full text-left p-3 hover:bg-surface-muted"
                    >
                      <span className="block text-[10px] uppercase font-bold tracking-wider text-text-muted">
                        {product.category?.name || 'Product'}
                      </span>
                      <span className="font-medium text-sm text-text-primary">{product.canonical_name}</span>
                    </button>
                  ))}
                </div>
              )}
              {!isSearching && query.trim().length >= 2 && matches.length === 0 && (
                <p className="text-xs text-text-muted">
                  List mein nahi mila? Koi baat nahi - aapka likha hua bhi signal banta hai.
                </p>
              )}
            </>
          )}

          <Input
            label="Kuch aur batana hai? (optional)"
            placeholder="e.g. roz 2-3 customer maangte hain"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button fullWidth icon={Send} onClick={submit} disabled={!canSubmit || isSaving}>
            {isSaving ? 'Bhej rahe hain...' : 'Report Bhejein'}
          </Button>

          {justSaved && (
            <p className="text-sm text-success flex items-center gap-1.5">
              <Check size={15} /> Report darj ho gayi. Aapke area ka signal update ho gaya.
            </p>
          )}
        </CardContent>
      </Card>

      <section>
        <h3 className="font-bold text-lg text-text-primary mb-3 flex items-center gap-2">
          <MessageSquarePlus size={18} className="text-primary" /> Aapki Reports
        </h3>

        {isLoading ? (
          <LoadingSpinner />
        ) : reports.length === 0 ? (
          <p className="text-sm text-text-muted">
            Abhi tak koi report nahi. Upar se pehli report bhejein.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {reports.map((report, index) => (
              <li key={`${report.reportedAt}-${index}`}>
                <Card className="border-border">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        {report.category && (
                          <p className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                            {report.category}
                          </p>
                        )}
                        <p className="font-semibold text-sm text-text-primary">
                          {report.product || report.note}
                        </p>
                        {report.product && report.note && (
                          <p className="text-xs text-text-muted mt-0.5">{report.note}</p>
                        )}
                      </div>
                      <span className="text-[11px] text-text-muted flex items-center gap-1 flex-shrink-0">
                        <Clock size={11} />
                        {new Date(report.reportedAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
