"use client";

import { useQuery } from "@tanstack/react-query";
import { intelligenceApi } from "@/lib/api/intelligence";
import { AlertCircle, MapPin, Package, Target, TrendingUp, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * The distributor home screen.
 *
 * Everything below comes from /intelligence/dashboard/distributor and
 * /intelligence/opportunities. The page used to fall back to three invented
 * rows ("Belagavi North / DAP Fertilizer / 94") whenever the API returned
 * nothing, and its headline panel hardcoded that same opportunity — so a
 * distributor with no signals at all still saw a 94/100 score and a revenue
 * figure the engine never produced.
 */
export default function DistributorDashboard() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["distributor-dashboard"],
    queryFn: intelligenceApi.getDistributorDashboard,
  });

  const { data: opportunityPage } = useQuery({
    queryKey: ["distributor-opportunities"],
    queryFn: () => intelligenceApi.getOpportunities({ limit: 10 }),
  });

  if (isLoading) {
    return (
      <div className="space-y-12 animate-pulse">
        <div className="h-12 w-1/3 bg-muted rounded-md" />
        <div className="h-[400px] bg-muted rounded-xl" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="font-medium">Could not load your dashboard.</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error instanceof Error ? error.message : "Please try again."}
        </p>
      </div>
    );
  }

  const { businessName, location, snapshot, demandGaps, retailerDemand, orders, catalogue } = data;
  const place = [location?.area, location?.district].filter(Boolean).join(", ");
  const opportunities = opportunityPage?.items ?? [];
  const top = opportunities[0];

  // Shares of the largest category, not of the total: with one dominant
  // category every other bar would round to nothing.
  const busiest = Math.max(1, ...retailerDemand.map((r) => r.count));

  return (
    <div className="space-y-12 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-2">
          {place && (
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
              <Target className="h-3.5 w-3.5" />
              {place}
            </div>
          )}
          <h1 className="text-4xl font-heading tracking-tight text-foreground">{businessName}</h1>
          <p className="text-muted-foreground font-light text-lg flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {snapshot.retailersLooking} {snapshot.retailersLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
            Top opportunity
          </p>
          <div className="text-3xl font-heading tracking-tight text-foreground">
            {snapshot.opportunityScore}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{snapshot.opportunityLabel}</p>
        </div>
      </header>

      <section className="grid sm:grid-cols-4 gap-4">
        {[
          { label: "Active signals", value: data.opportunityCount },
          { label: "Orders waiting", value: orders.pending },
          { label: "Products listed", value: catalogue.totalProducts },
          { label: "Categories", value: catalogue.totalCategories },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border/40 rounded-xl p-5">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
            <p className="text-2xl font-heading tracking-tight mt-2">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="grid lg:grid-cols-3 gap-8">
        {/* Which categories the local market is asking for. */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-heading font-medium tracking-tight">
            What your district is asking for
          </h2>
          <div className="bg-card border border-border/40 rounded-xl p-6 shadow-sm min-h-[320px]">
            {retailerDemand.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
                <MapPin className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground max-w-xs">
                  No retailer in your district has reported unmet demand yet. Signals appear
                  here as soon as they do.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {retailerDemand.map((row) => (
                  <div key={row.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{row.category}</span>
                      <span className="text-muted-foreground">
                        {row.count} shop{row.count === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(row.count / busiest) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* The single strongest signal, with the evidence behind its score. */}
        <div className="space-y-6">
          <h2 className="text-lg font-heading font-medium tracking-tight">Prime opportunity</h2>
          {!top ? (
            <div className="bg-card border border-border/40 rounded-xl p-6 min-h-[320px] flex flex-col items-center justify-center text-center gap-3">
              <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No active opportunities scored for you yet.
              </p>
            </div>
          ) : (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 min-h-[320px] flex flex-col">
              <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary mb-6">
                <TrendingUp className="h-4 w-4" /> Score: {top.score}/100 · {top.confidence} confidence
              </div>

              <h3 className="text-2xl font-heading font-medium tracking-tight mb-1 leading-snug">
                {top.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {[top.area, top.district].filter(Boolean).join(", ")}
              </p>

              {/* The sentence the server generated, shown only when its own
                  guardrail verified it against the evidence it cites. */}
              {top.explanation?.verified && (
                <p className="text-sm font-light leading-relaxed text-foreground mb-6">
                  {top.explanation.text}
                </p>
              )}

              <div className="mt-auto space-y-3">
                <div className="flex justify-between text-sm border-b border-border/40 pb-3">
                  <span className="text-muted-foreground">Retailers asking</span>
                  <span className="font-medium">{top.retailerCount}</span>
                </div>
                <div className="flex justify-between text-sm border-b border-border/40 pb-3">
                  <span className="text-muted-foreground">Local supply</span>
                  <span className="font-medium">{top.supplyLabel}</span>
                </div>
                {top.recommendedInitialStock > 0 && (
                  <div className="flex justify-between text-sm pb-1">
                    <span className="text-muted-foreground">Suggested opening stock</span>
                    <span className="font-medium text-primary">
                      {top.recommendedInitialStock} units
                    </span>
                  </div>
                )}
                <Link
                  href={`/distributor/opportunities/${top.id}`}
                  className="w-full bg-primary text-primary-foreground font-medium text-sm py-3 rounded-lg hover:bg-primary/90 transition-colors mt-2 flex justify-center items-center"
                >
                  See the evidence
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-6 pt-6">
        <h2 className="text-lg font-heading font-medium tracking-tight border-b border-border/40 pb-4">
          Local demand gaps
        </h2>
        {demandGaps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-card border border-dashed border-border/40 rounded-xl">
            <Package className="h-10 w-10 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">
              Nothing scored yet. Add stock to your catalogue to be matched against local demand.
            </p>
          </div>
        ) : (
          <div className="border border-border/40 rounded-xl overflow-hidden bg-card shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-medium text-xs uppercase tracking-widest text-muted-foreground py-4">
                    Product
                  </TableHead>
                  <TableHead className="font-medium text-xs uppercase tracking-widest text-muted-foreground py-4">
                    Retailers asking
                  </TableHead>
                  <TableHead className="font-medium text-xs uppercase tracking-widest text-muted-foreground py-4">
                    Local supply
                  </TableHead>
                  <TableHead className="font-medium text-xs uppercase tracking-widest text-muted-foreground py-4">
                    Score
                  </TableHead>
                  <TableHead className="font-medium text-xs uppercase tracking-widest text-muted-foreground py-4 text-right">
                    Confidence
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandGaps.map((gap) => (
                  <TableRow
                    key={gap.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors group"
                    onClick={() => router.push(`/distributor/opportunities/${gap.id}`)}
                  >
                    <TableCell className="py-4">
                      {/* A category-level gap has no product, so the engine
                          labels it with the category - printing that twice
                          reads like a rendering fault. */}
                      {gap.category !== gap.product && (
                        <span className="block text-xs uppercase tracking-widest text-muted-foreground">
                          {gap.category}
                        </span>
                      )}
                      <span className="font-medium">{gap.product}</span>
                    </TableCell>
                    <TableCell className="py-4 text-muted-foreground">{gap.retailers}</TableCell>
                    <TableCell className="py-4 text-muted-foreground">{gap.supply}</TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${gap.score}%` }} />
                        </div>
                        <span className="text-xs font-medium">{Math.round(gap.score)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right font-medium group-hover:text-primary transition-colors">
                      {gap.confidence}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
