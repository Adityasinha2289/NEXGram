"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  MapPin,
  Sparkles,
  Store,
  Truck,
  AlertCircle,
  RotateCcw,
  Layers,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { intelligenceApi } from "@/lib/api/intelligence";
import Link from "next/link";

const rupees = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

/**
 * The retailer home screen.
 *
 * Every figure here comes from /intelligence/dashboard/retailer. The page used
 * to greet a hardcoded "Ravi" in "Hubli, Karnataka", chart a fixed week of
 * invented revenue, recommend stocking DAP Fertilizer at "92% confidence" and
 * list three copies of a made-up order from "AgriCorp Distributors" — none of
 * it from the server, and its one real read was against `overview.totalRevenue`,
 * a field no endpoint returns, so it always fell through to ₹145,000.
 */
export default function RetailerDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["retailer-dashboard"],
    queryFn: intelligenceApi.getRetailerDashboard,
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
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-medium">Could not load your dashboard.</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error instanceof Error ? error.message : "Please try again."}
        </p>
      </div>
    );
  }

  const { businessName, location, snapshot, developerPack } = data;
  const place = [location?.area, location?.district].filter(Boolean).join(", ");
  const pack = developerPack;

  return (
    <div className="space-y-12 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-2">
          {place && (
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
              <MapPin className="h-3.5 w-3.5" />
              {place}
            </div>
          )}
          <h1 className="text-4xl font-heading tracking-tight text-foreground">
            {businessName}
          </h1>
          <p className="text-muted-foreground font-light text-lg">
            {snapshot.demandLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
            Suggested pack
          </p>
          <div className="text-3xl font-heading tracking-tight text-foreground">
            {rupees(pack.estimatedTotal)}
          </div>
          {pack.budget?.max ? (
            <p className="text-sm text-muted-foreground mt-1">
              Budget up to {rupees(pack.budget.max)}
            </p>
          ) : null}
        </div>
      </header>

      {/* Three figures the server computed, with the sentence that explains each. */}
      <section className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Profile health", value: snapshot.health, caption: snapshot.healthLabel },
          { label: "Local demand", value: snapshot.demand, caption: snapshot.demandLabel },
          { label: "Opportunities", value: snapshot.opportunity, caption: snapshot.opportunityLabel },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border/40 rounded-xl p-5">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
            <p className="text-2xl font-heading tracking-tight mt-2">{stat.value}</p>
            <p className="text-sm text-muted-foreground font-light mt-1">{stat.caption}</p>
          </div>
        ))}
      </section>

      <section className="grid lg:grid-cols-3 gap-8">
        {/* The stock plan, line by line, as the engine built it. */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading font-medium tracking-tight">{pack.title}</h2>
            <Link
              href="/retailer/developer-pack"
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest flex items-center gap-1"
            >
              Open pack <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
            {pack.items.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Layers className="h-10 w-10 mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  No local supplier can cover your area&apos;s shortages yet. Completing your
                  profile lets the engine match you against more of them.
                </p>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-border/40">
                  {pack.items.map((item) => (
                    <li key={item.id} className="p-5 flex items-start justify-between gap-6">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {item.suggestedQuantity} × {item.variant || item.unit}
                          {item.distributorName ? ` · ${item.distributorName}` : ""}
                        </p>
                        {/* The score never appears without the evidence under it. */}
                        <p className="text-xs text-muted-foreground font-light mt-2 leading-relaxed">
                          {item.reason}
                        </p>
                      </div>
                      <span className="font-medium shrink-0">{rupees(item.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between gap-4 border-t border-border/40 bg-muted/20 px-5 py-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      Estimated total
                    </p>
                    <p className="text-xl font-heading tracking-tight">
                      {rupees(pack.estimatedTotal)}
                    </p>
                  </div>
                  <Link
                    href="/retailer/developer-pack"
                    className="bg-primary text-primary-foreground font-medium text-sm px-5 py-3 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    Review pack <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* What the area is asking for that nobody nearby supplies. */}
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-heading font-medium tracking-tight border-b border-border/40 pb-4">
              Worth stocking near you
            </h2>
            {data.recommendedProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6">
                Not enough demand data from your area yet.
              </p>
            ) : (
              <div className="space-y-0">
                {data.recommendedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between py-4 border-b border-border/40"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                        {product.category}
                      </p>
                      <p className="font-medium mt-0.5 truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {product.retailers} retailer signal
                        {product.retailers === 1 ? "" : "s"}
                        {" · "}
                        {product.suppliers === 0
                          ? "no local supplier"
                          : `${product.suppliers} local supplier${product.suppliers === 1 ? "" : "s"}`}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <span className="text-xs font-medium px-2 py-1 rounded-md bg-muted text-muted-foreground">
                        Demand {product.demand}
                      </span>
                      <span className="text-xs font-medium px-2 py-1 rounded-md bg-muted text-muted-foreground">
                        Supply {product.availability}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Suppliers who can actually reach this shop. */}
          <div className="space-y-4">
            <h2 className="text-lg font-heading font-medium tracking-tight">Suppliers near you</h2>
            {data.nearbyDistributors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No registered distributor in your district yet.
              </p>
            ) : (
              <div className="space-y-3">
                {data.nearbyDistributors.map((dist) => (
                  <motion.div
                    key={dist.id}
                    whileHover={{ y: -2 }}
                    className="bg-card border border-border/40 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                        <Store className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{dist.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{dist.categories}</p>
                        <p className="text-xs text-muted-foreground mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {dist.distance}
                          </span>
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" /> {dist.delivery}
                          </span>
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Things this shop has actually bought before. */}
          <div className="space-y-4">
            <h2 className="text-lg font-heading font-medium tracking-tight">Order again</h2>
            {data.reorderItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Your first order will start the reorder suggestions.
              </p>
            ) : (
              <div className="space-y-0">
                {data.reorderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 border-b border-border/40"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Last ordered {item.lastOrdered}</p>
                    </div>
                    <RotateCcw className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Products the area wants that the plan could not source. */}
          {pack.skipped.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Left out of the pack
              </div>
              <ul className="space-y-2">
                {pack.skipped.map((skip) => (
                  <li key={skip.name} className="text-sm">
                    <span className="font-medium">{skip.name}</span>
                    <span className="text-muted-foreground font-light"> — {skip.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
