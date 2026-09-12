import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Target } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ScoreRing } from '../../../components/ui/ScoreRing';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { intelligenceApi } from '../../../services/api/intelligenceApi';
import { useApiResource } from '../../../hooks/useApiResource';

export function OpportunitiesList() {
  const navigate = useNavigate();
  const fetcher = useCallback(() => intelligenceApi.getOpportunities(), []);
  const { data, isLoading, error, reload } = useApiResource(fetcher);

  const opportunities = data?.items || [];

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <PageHeader
        eyebrow="Signals"
        title="Business opportunities"
        description="Aapke service area mein jo demand hai aur koi supply nahi kar pa raha. Har score ke neeche uska evidence hai."
      />

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : opportunities.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Abhi koi opportunity nahi"
          description="Aapke service area ke liye abhi koi naya supply gap detect nahi hua. Retailers ke signals aate hi yahaan dikhega."
        />
      ) : (
        /*
         * Two columns from 1024px. Each item carries a sentence of explanation,
         * and a paragraph stretched across a 1200px row is unreadable — the
         * column keeps the measure near 60 characters.
         */
        <div className="grid gap-4 lg:grid-cols-2">
          {opportunities.map((opp) => (
            <Card
              key={opp.id}
              interactive
              className="cursor-pointer"
              onClick={() => navigate(`/distributor/opportunities/${opp.id}`)}
            >
              <div className="flex items-start gap-4 p-4">
                <div className="min-w-0 flex-1">
                  {opp.category !== opp.name && <p className="eyebrow">{opp.category}</p>}
                  <h3 className="mt-0.5 text-base font-semibold leading-tight text-text-primary">
                    {opp.name}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant={opp.tierVariant} dot>{opp.tier}</Badge>
                    {opp.area && (
                      <span className="flex items-center gap-1 text-2xs text-text-muted">
                        <MapPin size={11} /> {opp.area}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <ScoreRing score={opp.score} tier={opp.tier} confidence={opp.confidence} />
                </div>
              </div>

              {/* The two figures the score is actually made of. */}
              <dl className="mx-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
                <div className="bg-surface-muted px-3 py-2">
                  <dt className="eyebrow">Retailers asking</dt>
                  <dd className="num mt-0.5 text-sm font-semibold text-text-primary">
                    {opp.retailerCount}
                  </dd>
                </div>
                <div className="bg-surface-muted px-3 py-2">
                  <dt className="eyebrow">Can fulfil today</dt>
                  <dd className="num mt-0.5 text-sm font-semibold text-text-primary">
                    {opp.supplierCount === 0
                      ? 'Koi supplier nahi'
                      : `${opp.availableSupplierCount} of ${opp.supplierCount}`}
                  </dd>
                </div>
              </dl>

              {/* Rendered from the evidence object and checked against it before
                  display, so it cannot state a figure the engine did not produce. */}
              <p className="p-4 text-sm leading-relaxed text-text-secondary">
                {opp.explanation?.text
                  || opp.evidence?.summary
                  || 'Local demand ke basis par opportunity detect hui hai.'}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
