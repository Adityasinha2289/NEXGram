import { useCallback, useState } from 'react';
import { Check, ChevronDown, ExternalLink, FileText, Info, Landmark, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonList } from '../../components/ui/Skeleton';
import { schemesApi } from '../../services/api/schemesApi';
import { useApiResource } from '../../hooks/useApiResource';

/**
 * Where to actually apply.
 *
 * `applyAt` is prose for the schemes that are applied for in person ("Nearest
 * bank branch or https://..."), so using it as an href produced a dead link on
 * half the catalogue. The URL is lifted out of the sentence, `source` is the
 * fallback, and the prose itself is shown as text beside the button.
 */
const URL_IN_TEXT = /https?:\/\/[^\s,)]+/;

function applyLink(scheme) {
  const fromApplyAt = URL_IN_TEXT.exec(scheme.applyAt || '')?.[0];
  return fromApplyAt || URL_IN_TEXT.exec(scheme.source || '')?.[0] || null;
}

function applyNote(scheme) {
  const text = (scheme.applyAt || '').replace(URL_IN_TEXT, '').replace(/\s*or\s*$/i, '').trim();
  return text || null;
}

const CHECK_STATE = {
  met: { icon: Check, className: 'text-success', label: 'Poora hota hai' },
  not_met: { icon: X, className: 'text-danger', label: 'Poora nahi hota' },
  self_declare: { icon: Info, className: 'text-warning', label: 'Khud declare karein' },
};

/**
 * Government schemes, matched against the profile the user already filled in.
 *
 * Deliberately does not say "you are eligible". Each scheme shows which stated
 * criteria the profile appears to meet, which it does not, and which the user
 * has to declare themselves, then links to the official portal that actually
 * decides. A wrong eligibility claim here costs someone real money.
 */
export function Schemes() {
  const [selectedId, setSelectedId] = useState(null);
  const fetcher = useCallback(() => schemesApi.getSchemes(), []);
  const { data, isLoading, error, reload } = useApiResource(fetcher);

  const schemes = data?.schemes || [];
  const openId = selectedId !== null ? selectedId : (schemes[0]?.id ?? null);

  return (
    <div className="flex animate-fade-in flex-col gap-5">
      <PageHeader
        eyebrow="Sarkari schemes"
        title="Aapke liye kaun si scheme"
        description={
          isLoading
            ? 'Aapke profile se match kiya ja raha hai.'
            : `Aapke profile ke hisaab se ${schemes.length} scheme${schemes.length === 1 ? '' : 's'} ka criteria dekha gaya.`
        }
      />

      {/*
       * The disclaimer sits above the results rather than in a card competing
       * with them. It is the most important sentence on the page and also the
       * one nobody wants to read, so it is short and it is first.
       */}
      <p className="flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning-bg px-3.5 py-3 text-sm leading-snug text-text-secondary">
        <Info size={16} className="mt-0.5 flex-shrink-0 text-warning" strokeWidth={2} />
        Yeh eligibility ka final faisla nahi hai. Hum sirf aapke diye gaye profile ko scheme ke
        stated criteria se match karte hain — confirm official portal par karein.
      </p>

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
            return (
              <li key={scheme.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(isOpen ? false : scheme.id)}
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
                    </div>
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

                {/* Two columns from 1024px: criteria is a list to read down,
                    the paperwork and the link are a block to act on. Stacked,
                    the button ran a full 880px wide. */}
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
                              <p className="text-sm leading-snug text-text-primary">
                                {check.label}
                              </p>
                              <p className="text-2xs leading-snug text-text-muted">
                                {check.reason}
                              </p>
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

                      {applyLink(scheme) && (
                        <a
                          href={applyLink(scheme)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover sm:self-start"
                        >
                          Official portal par jayein <ExternalLink size={15} strokeWidth={2} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
