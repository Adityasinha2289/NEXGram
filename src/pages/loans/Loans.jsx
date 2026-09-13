import { useCallback, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Info,
  Landmark,
  X,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Section } from '../../components/ui/Section';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useApiResource } from '../../hooks/useApiResource';
import { useDebounced } from '../../hooks/useDebounced';
import { loansApi } from '../../services/api/loansApi';
import { schemesApi } from '../../services/api/schemesApi';
import { ApplyForm } from './components/ApplyForm';

const rupees = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;

const CHECK_STATE = {
  met: { icon: Check, className: 'text-success', label: 'Poora hota hai' },
  not_met: { icon: X, className: 'text-danger', label: 'Poora nahi hota' },
  self_declare: { icon: Info, className: 'text-warning', label: 'Khud declare karein' },
};

const STATUS_VARIANT = {
  submitted: 'primary',
  under_review: 'warning',
  approved: 'success',
  rejected: 'danger',
  withdrawn: 'neutral',
  draft: 'neutral',
};

// `applyAt` is prose for the schemes applied for in person ("Nearest bank
// branch or https://..."), so the URL is lifted out rather than used as an href.
const URL_IN_TEXT = /https?:\/\/[^\s,)]+/;
const applyLink = (scheme) =>
  URL_IN_TEXT.exec(scheme.applyAt || '')?.[0]
  || URL_IN_TEXT.exec(scheme.source || '')?.[0]
  || null;
const applyNote = (scheme) =>
  (scheme.applyAt || '').replace(URL_IN_TEXT, '').replace(/\s*or\s*$/i, '').trim() || null;

/**
 * Government loan schemes, matched against the profile the user already filled
 * in — and the application that follows.
 *
 * The amount box is the point. A shopkeeper in a tier-3 town does not ask
 * "which facilities exist", they ask "who will lend me thirty thousand rupees",
 * and a Rs 1 crore scheme at the top of the list is a wasted trip to a bank.
 *
 * Deliberately never says "you are eligible". Each scheme shows which stated
 * criteria the profile appears to meet, which it does not, and which the user
 * has to declare themselves. The bank decides.
 */
export function Loans() {
  const [amountInput, setAmountInput] = useState('');
  const [openId, setOpenId] = useState(null);
  const [applyingTo, setApplyingTo] = useState(null);

  const debouncedAmount = useDebounced(amountInput, 400);
  const amount = Number(debouncedAmount) > 0 ? Number(debouncedAmount) : undefined;

  const schemesFetcher = useCallback(() => schemesApi.getSchemes({ amount }), [amount]);
  const { data, isLoading, error, reload } = useApiResource(schemesFetcher);

  const appsFetcher = useCallback(() => loansApi.getApplications(), []);
  const { data: appsData, reload: reloadApps } = useApiResource(appsFetcher, {
    initialData: { items: [] },
  });

  const schemes = data?.schemes || [];
  const applications = useMemo(() => appsData?.items || [], [appsData]);
  // Schemes with a live application, so the button can say so instead of
  // offering an apply the server would refuse as a duplicate.
  const appliedIds = useMemo(
    () => new Set(applications.filter((a) => a.canWithdraw).map((a) => a.schemeId)),
    [applications],
  );

  const withdraw = async (id) => {
    try {
      await loansApi.withdraw(id);
      reloadApps();
    } catch {
      // The list reloads either way; a failed withdraw leaves the row as it was.
      reloadApps();
    }
  };

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        eyebrow="Sarkari schemes"
        title="Business ke liye loan"
        description="Aapke profile ke hisaab se kaun si scheme ka criteria poora hota hai — aur kitna EMI banega."
      />

      <p className="flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning-bg px-3.5 py-3 text-sm leading-snug text-text-secondary">
        <Info size={16} className="mt-0.5 flex-shrink-0 text-warning" strokeWidth={2} />
        NEXGram loan nahi deta. Hum sirf aapke profile ko scheme ke criteria se match karte
        hain — approval bank hi karta hai.
      </p>

      {/* Applications first when there are any: someone who has applied opens
          this screen to check on it, not to browse. */}
      {applications.length > 0 && (
        <Section title="Aapki applications" description="Jo aapne bheji hain.">
          <ul className="panel divide-y divide-border overflow-hidden">
            {applications.map((app) => (
              <li key={app.id} className="flex items-start justify-between gap-4 px-4 py-3.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-text-primary">{app.schemeName}</h4>
                    <Badge variant={STATUS_VARIANT[app.status] || 'neutral'} dot>
                      {app.statusLabel}
                    </Badge>
                  </div>
                  <p className="num mt-0.5 text-2xs text-text-muted">
                    {app.reference} · {rupees(app.amount)} · {app.tenureMonths} mahine
                  </p>
                  <p className="num mt-1 text-2xs text-text-secondary">
                    EMI ~{rupees(app.estimate.monthlyInstalment)}/mahina
                  </p>
                  {app.decisionNote && (
                    <p className="mt-1 text-2xs leading-snug text-text-muted">{app.decisionNote}</p>
                  )}
                </div>
                {app.canWithdraw && (
                  <button
                    type="button"
                    onClick={() => withdraw(app.id)}
                    className="flex-shrink-0 rounded-md px-2 py-1.5 text-2xs font-semibold text-text-muted transition-colors hover:bg-danger-bg hover:text-danger"
                  >
                    Wapas lein
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="panel px-4 py-4">
        <Input
          label="Kitne ka loan chahiye?"
          type="number"
          inputMode="numeric"
          min="0"
          placeholder="e.g. 30000"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
        />
        <p className="mt-1.5 text-2xs leading-snug text-text-muted">
          Amount daalne par woh schemes upar aa jayengi jo itna de sakti hain.
        </p>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : isLoading ? (
        <SkeletonList rows={4} />
      ) : schemes.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Koi scheme match nahi hui"
          description="Profile poora karein taaki hum aapke liye schemes match kar sakein."
        />
      ) : (
        <ul className="panel divide-y divide-border overflow-hidden">
          {schemes.map((scheme) => {
            const isOpen = openId === scheme.id;
            const covers = scheme.coversAmount !== false;
            const alreadyApplied = appliedIds.has(scheme.id);

            return (
              <li key={scheme.id} className={covers ? '' : 'opacity-70'}>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : scheme.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-start gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="eyebrow flex items-center gap-1.5">
                      <Landmark size={11} strokeWidth={2.25} /> {scheme.authority}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold leading-snug text-text-primary">
                      {scheme.name}
                    </h3>
                    <p className="mt-1 max-w-[62ch] text-sm leading-snug text-text-muted">
                      {scheme.summary}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-sm font-semibold text-primary">{scheme.benefit}</span>
                      <span className="text-2xs text-text-muted">{scheme.verdict}</span>
                      {alreadyApplied && <Badge variant="primary">Apply kiya hua</Badge>}
                    </div>
                    {/* Says why a scheme cannot help, rather than hiding it. */}
                    {scheme.amountNote && (
                      <p className="mt-1.5 text-2xs font-medium text-warning">{scheme.amountNote}</p>
                    )}
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Badge variant={scheme.verdictVariant} dot>
                      {scheme.metCount}/{scheme.totalCount}
                    </Badge>
                    <ChevronDown
                      size={16}
                      strokeWidth={2.25}
                      className={`text-text-faint transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="flex flex-col gap-5 border-t border-border bg-surface-muted px-4 py-4 lg:grid lg:grid-cols-2 lg:gap-8">
                    <div className="flex flex-col gap-2.5">
                      <h4 className="eyebrow">Criteria</h4>
                      {(scheme.checks || []).map((check) => {
                        const state = CHECK_STATE[check.status] || CHECK_STATE.self_declare;
                        const Icon = state.icon;
                        return (
                          <div key={check.label} className="flex items-start gap-2.5">
                            <Icon
                              size={15}
                              strokeWidth={2.5}
                              className={`mt-0.5 flex-shrink-0 ${state.className}`}
                              aria-label={state.label}
                            />
                            <div className="min-w-0">
                              <p className="text-sm leading-snug text-text-primary">{check.label}</p>
                              <p className="text-2xs leading-snug text-text-muted">{check.reason}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-col gap-4">
                      <div>
                        <h4 className="eyebrow mb-2">Documents chahiye</h4>
                        <ul className="flex flex-wrap gap-1.5">
                          {(scheme.documents || []).map((doc) => (
                            <li
                              key={doc}
                              className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-2xs text-text-secondary"
                            >
                              <FileText size={11} strokeWidth={2} /> {doc}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <p className="text-2xs leading-snug text-text-muted">{scheme.disclaimer}</p>
                      {applyNote(scheme) && (
                        <p className="text-2xs leading-snug text-text-secondary">
                          Apply: {applyNote(scheme)}
                        </p>
                      )}

                      <div className="flex flex-col gap-2 sm:flex-row">
                        {scheme.isLoan !== false && (
                          <Button
                            fullWidth
                            disabled={alreadyApplied}
                            onClick={() => setApplyingTo(scheme)}
                          >
                            {alreadyApplied ? 'Application chal rahi hai' : 'NEXGram se apply karein'}
                          </Button>
                        )}
                        {applyLink(scheme) && (
                          <a
                            href={applyLink(scheme)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border-strong px-5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface"
                          >
                            Official portal <ExternalLink size={15} strokeWidth={2} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {applyingTo && (
        <ApplyForm
          scheme={applyingTo}
          defaultAmount={amount}
          onClose={() => setApplyingTo(null)}
          onApplied={() => { setApplyingTo(null); reloadApps(); }}
        />
      )}
    </div>
  );
}
