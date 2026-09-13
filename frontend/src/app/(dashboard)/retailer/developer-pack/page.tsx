"use client";

import { useQuery } from "@tanstack/react-query";
import { intelligenceApi } from "@/lib/api/intelligence";
import { Sparkles, Loader2, PackageOpen, ShoppingBag, BarChart3, MapPin, Store } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const rupees = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

/**
 * The retailer's budget-aware stock plan.
 *
 * Read against the endpoint's real shape: the plan is `items`, each carrying a
 * price, a line total and the evidence that put it there. This page previously
 * read `data.lines[].product / quantity / explanation`, none of which exist, so
 * it always rendered "No high-confidence signals found in your area" — and the
 * summary beside it printed a fixed ₹12,450 capital / ₹16,800 revenue / 35%
 * margin, with each line's revenue computed as quantity × 450 under a comment
 * reading "Mock math".
 */
export default function DeveloperPackPage() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["developer-pack"],
    queryFn: intelligenceApi.getDeveloperPack,
  });

  const items = data?.items ?? [];
  const matches = data?.distributorMatches ?? [];
  const budget = data?.budget;

  return (
    <div className="space-y-12 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary mb-4">
            <Sparkles className="h-3.5 w-3.5" /> Computed for your shop
          </div>
          <h1 className="text-4xl font-heading tracking-tight text-foreground">
            {data?.title ?? "Developer Pack"}
          </h1>
          <p className="text-muted-foreground font-light text-lg max-w-2xl">
            {data?.description ??
              "A restock plan built from your area's unmet demand and what local suppliers can actually deliver."}
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl p-6 text-sm">
          {error instanceof Error ? error.message : "Could not load your stock plan."}
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-border/40 flex justify-between items-center">
                <h2 className="text-xl font-heading font-medium tracking-tight">
                  Recommended bundle
                </h2>
                <span className="text-sm text-muted-foreground">
                  {items.length} product{items.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="divide-y divide-border/40">
                {items.map((line, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={line.id}
                    className="p-6 flex flex-col md:flex-row gap-6 hover:bg-muted/10 transition-colors"
                  >
                    <div className="h-24 w-24 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                      <PackageOpen className="h-8 w-8 text-muted-foreground/30" />
                    </div>

                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-widest text-muted-foreground">
                            {line.category}
                          </p>
                          <h3 className="text-lg font-medium tracking-tight truncate">
                            {line.name}
                          </h3>
                          <p className="text-sm text-primary font-medium mt-1">
                            {line.suggestedQuantity} × {line.variant || line.unit} at{" "}
                            {rupees(line.price)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                            <Store className="h-3 w-3" /> {line.distributorName}
                            {" · MOQ "}
                            {line.minimumOrderQuantity}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm text-muted-foreground">Line total</p>
                          <p className="text-base font-medium tracking-tight">
                            {rupees(line.lineTotal)}
                          </p>
                        </div>
                      </div>

                      {/* The reason the engine produced, not a restatement of
                          the numbers above it. */}
                      <div className="bg-muted/30 border border-border/40 rounded-lg p-3 text-sm text-muted-foreground font-light leading-relaxed">
                        <span className="font-medium text-foreground">Why: </span>
                        {line.reason}
                      </div>

                      {line.stockCapped && (
                        <p className="text-xs text-orange-600">
                          Capped by what this supplier currently has in stock.
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}

                {items.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No local supplier can cover your area&apos;s shortages right now.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Wanted locally but unsourceable: the absence is itself a signal,
                so it is named rather than dropped silently. */}
            {(data?.skipped?.length ?? 0) > 0 && (
              <div className="bg-card border border-border/40 rounded-xl p-6 space-y-3">
                <h3 className="font-medium">Left out of this plan</h3>
                <ul className="space-y-2">
                  {data!.skipped.map((skip) => (
                    <li key={skip.name} className="text-sm">
                      <span className="font-medium">{skip.name}</span>
                      <span className="text-muted-foreground font-light"> — {skip.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <Sparkles className="w-32 h-32 text-primary" />
              </div>

              <h3 className="text-xl font-heading font-medium tracking-tight mb-6">
                Bundle summary
              </h3>

              <div className="space-y-4 mb-8 relative z-10">
                <div className="flex justify-between text-sm border-b border-border/40 pb-3">
                  <span className="text-muted-foreground">Products</span>
                  <span className="font-medium">{items.length}</span>
                </div>
                <div className="flex justify-between text-sm border-b border-border/40 pb-3">
                  <span className="text-muted-foreground">Capital required</span>
                  <span className="font-medium">{rupees(data?.estimatedTotal ?? 0)}</span>
                </div>
                {budget?.max ? (
                  <div className="flex justify-between text-sm pb-1">
                    <span className="text-muted-foreground">Your stated budget</span>
                    <span className="font-medium text-primary">
                      {rupees(budget.min)} – {rupees(budget.max)}
                    </span>
                  </div>
                ) : null}
              </div>

              <button
                onClick={() => router.push("/retailer/marketplace")}
                className="w-full bg-primary text-primary-foreground font-medium text-sm py-4 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 relative z-10"
              >
                <ShoppingBag className="h-4 w-4" /> Go to marketplace
              </button>
            </div>

            {/* Which single supplier covers the most of this plan. */}
            {matches.length > 0 && (
              <div className="bg-card border border-border/40 rounded-xl p-6 space-y-4">
                <h3 className="font-medium">Who can supply this</h3>
                <div className="space-y-4">
                  {matches.slice(0, 3).map((match) => (
                    <div
                      key={match.distributorId}
                      className="border-b border-border/40 last:border-0 pb-4 last:pb-0"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <p className="font-medium text-sm">{match.distributorName}</p>
                        <span className="text-sm font-medium shrink-0">
                          {rupees(match.estimatedTotal)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {match.productsFulfilled} of {match.productsRequested} products ·{" "}
                        {match.fulfilmentStatus}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {match.reasons.map((reason) => (
                          <li
                            key={reason}
                            className="text-xs text-muted-foreground font-light flex items-start gap-1.5"
                          >
                            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-card border border-border/40 rounded-xl p-6">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" /> How this works
              </h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                The plan is computed on the server from the unmet demand nearby shops have
                reported and what suppliers in your district actually have in stock. Each line is
                clamped to that supplier&apos;s minimum order quantity and to your stated budget.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
