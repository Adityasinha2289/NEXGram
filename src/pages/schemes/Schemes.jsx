import { useEffect, useState } from 'react';
import { Check, ExternalLink, FileText, Info, Landmark, X } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { schemesApi } from '../../services/api/schemesApi';

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
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  const load = () => {
    setIsLoading(true);
    setError(null);
    schemesApi.getSchemes()
      .then((res) => {
        setData(res);
        setOpenId(res.schemes?.[0]?.id ?? null);
      })
      .catch((err) => setError(err.message || 'Schemes load nahi hui'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState description={error} onRetry={load} />;

  const schemes = data?.schemes || [];

  return (
    <div className="flex flex-col gap-5 pb-6 animate-fade-in">
      <header>
        <h2 className="text-2xl font-bold text-text-primary leading-tight">Sarkari Schemes</h2>
        <p className="text-sm text-text-muted mt-1">
          Aapke profile ke hisaab se {schemes.length} schemes ka criteria match.
        </p>
      </header>

      <Card className="bg-warning-bg border-warning">
        <CardContent className="p-3 flex gap-2 items-start">
          <Info size={16} className="text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary leading-snug">
            Yeh eligibility ka final faisla nahi hai. Hum sirf aapke diye gaye profile ko
            scheme ke stated criteria se match karte hain. Confirm official portal par karein.
          </p>
        </CardContent>
      </Card>

      {schemes.length === 0 ? (
        <EmptyState
          title="Koi scheme nahi mili"
          description="Profile poora karein taaki hum aapke liye schemes match kar sakein."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {schemes.map((scheme) => {
            const isOpen = openId === scheme.id;
            return (
              <Card key={scheme.id} className="border-border overflow-hidden">
                <CardContent className="p-0">
                  <button
                    onClick={() => setOpenId(isOpen ? null : scheme.id)}
                    aria-expanded={isOpen}
                    className="w-full text-left p-4 flex flex-col gap-2 hover:bg-surface-muted transition-colors"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-text-muted flex items-center gap-1">
                          <Landmark size={12} /> {scheme.authority}
                        </p>
                        <h3 className="font-bold text-text-primary leading-tight mt-0.5">{scheme.name}</h3>
                      </div>
                      <Badge variant={scheme.verdictVariant} className="flex-shrink-0">
                        {scheme.metCount}/{scheme.totalCount}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-muted leading-snug">{scheme.summary}</p>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-primary text-sm">{scheme.benefit}</span>
                      <span className="text-xs text-text-muted">{scheme.verdict}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 flex flex-col gap-4 border-t border-border pt-3">
                      <div className="flex flex-col gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Criteria</h4>
                        {scheme.checks.map((check) => {
                          const state = CHECK_STATE[check.status] || CHECK_STATE.self_declare;
                          const Icon = state.icon;
                          return (
                            <div key={check.label} className="flex items-start gap-2">
                              <Icon size={15} className={`${state.className} flex-shrink-0 mt-0.5`} />
                              <div className="min-w-0">
                                <p className="text-sm text-text-primary leading-snug">{check.label}</p>
                                <p className="text-xs text-text-muted leading-snug">{check.reason}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                          Documents chahiye
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {scheme.documents.map((doc) => (
                            <span
                              key={doc}
                              className="text-xs bg-surface-muted text-text-secondary px-2 py-1 rounded-md flex items-center gap-1"
                            >
                              <FileText size={11} /> {doc}
                            </span>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-text-muted italic leading-snug">{scheme.disclaimer}</p>

                      <a
                        href={scheme.applyAt}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-primary text-text-inverse font-medium text-sm hover:bg-primary-hover transition-colors"
                      >
                        Official portal par jaayein <ExternalLink size={15} />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
