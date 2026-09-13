"use client";

import { useQuery } from "@tanstack/react-query";
import { intelligenceApi } from "@/lib/api/intelligence";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Target,
  Users,
  MapPin,
  Store,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

/**
 * One opportunity, with the evidence that produced its score.
 *
 * Every figure is read from the field the API actually sends. The page used to
 * reach for `opp.product`, `opp.location`, `opp.potential` and
 * `opp.value_potential` — none of which exist — so the heading fell back to
 * "Supply Gap Identified", the location line rendered empty and the headline
 * number was the literal string "High".
 */
export default function DistributorOpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: opp, isLoading, error } = useQuery({
    queryKey: ["opportunity", id],
    queryFn: () => intelligenceApi.getOpportunity(id),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !opp) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-red-500">
          {error instanceof Error ? error.message : "Could not load this opportunity."}
        </p>
        <button onClick={() => router.back()} className="text-primary hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const place = [opp.area, opp.district].filter(Boolean).join(", ");
  const breakdown = opp.evidence?.breakdown ?? [];

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      <header className="space-y-4 border-b border-border/40 pb-6">
        <Link
          href="/distributor"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to dashboard
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary mb-2">
              <Target className="h-3.5 w-3.5" /> Score {opp.score}/100 · {opp.tier}
            </div>
            <h1 className="text-3xl font-heading tracking-tight text-foreground">{opp.name}</h1>
            {place && (
              <p className="text-muted-foreground font-light mt-1 flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {place}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-1">
              Confidence
            </p>
            <div className="text-2xl font-heading tracking-tight">{opp.confidence}</div>
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 md:p-8">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Why this scored
            </h3>
            {/*
              * The generator checks every sentence against the evidence it
              * describes. An unverified one is withheld rather than shown with
              * a caveat: a number the engine did not produce is worse than no
              * sentence at all.
              */}
            {opp.explanation?.verified ? (
              <>
                <p className="text-lg md:text-xl font-light leading-relaxed text-foreground">
                  {opp.explanation.text}
                </p>
                <div className="mt-6 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-green-600 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                  <CheckCircle2 className="h-4 w-4" /> Checked against the evidence below
                </div>
              </>
            ) : (
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                <p className="font-light leading-relaxed">
                  No verified summary for this signal. The figures below come straight from the
                  engine and are the reliable account.
                </p>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border/40 rounded-xl p-6 space-y-2">
              <div className="h-10 w-10 bg-muted/50 rounded-lg flex items-center justify-center mb-4">
                <Store className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-heading tracking-tight">{opp.retailerCount}</p>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
                Retailers asking
              </p>
              <p className="text-xs text-muted-foreground font-light pt-2 border-t border-border/40">
                {opp.evidence?.demand ?? "Shops in this area reporting unmet demand."}
              </p>
            </div>

            <div className="bg-card border border-border/40 rounded-xl p-6 space-y-2">
              <div className="h-10 w-10 bg-muted/50 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-heading tracking-tight">{opp.availableSupplierCount}</p>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
                Can supply today
              </p>
              <p className="text-xs text-muted-foreground font-light pt-2 border-t border-border/40">
                {opp.supplyLabel}
              </p>
            </div>
          </div>

          {breakdown.length > 0 && (
            <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border/40 bg-muted/20">
                <h3 className="font-medium text-foreground">Score breakdown</h3>
              </div>
              <div className="divide-y divide-border/40">
                {breakdown.map((line) => (
                  <div key={line.label} className="p-4 flex justify-between items-center gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{line.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{line.detail}</p>
                      {/* Says whether a component was counted or inferred, so a
                          modelled number is never read as an observed one. */}
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mt-1">
                        {line.source_type === "OBSERVED" ? "Observed" : "Model inference"}
                      </p>
                    </div>
                    <div className="text-sm font-medium shrink-0 whitespace-nowrap">
                      {line.points} / {line.max}
                    </div>
                  </div>
                ))}
                <div className="p-4 flex justify-between items-center bg-muted/20">
                  <p className="font-medium text-sm">Total</p>
                  <p className="text-sm font-medium">{opp.score} / 100</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border/40 rounded-xl p-6 sticky top-24 space-y-4">
            <h3 className="font-medium">What to do next</h3>

            {opp.recommendedInitialStock > 0 && (
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">Suggested opening stock</p>
                <p className="text-2xl font-heading tracking-tight text-primary">
                  {opp.recommendedInitialStock} units
                </p>
              </div>
            )}

            {opp.defaultVariantName && (
              <p className="text-sm text-muted-foreground font-light">
                Most likely listing: {opp.name} {opp.defaultVariantName}
              </p>
            )}

            {opp.evidence?.fit && (
              <p className="text-sm text-muted-foreground font-light border-t border-border/40 pt-4">
                {opp.evidence.fit}
              </p>
            )}

            {/* Sends the distributor to the catalogue with the product already
                chosen, rather than making them search for what they were just
                told about. */}
            <Link
              href="/distributor/orders"
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center"
            >
              Review my orders
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
