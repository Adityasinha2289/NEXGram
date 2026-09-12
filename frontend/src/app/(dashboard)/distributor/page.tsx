"use client";

import { useQuery } from "@tanstack/react-query";
import { intelligenceApi } from "@/lib/api/intelligence";
import { MapPin, Target, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";

export default function DistributorDashboard() {
  const router = useRouter();
  
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['distributor-dashboard'],
    queryFn: intelligenceApi.getDistributorDashboard,
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

  // Mocked for display if backend returns empty
  const opportunities = dashboardData?.topOpportunities?.length ? dashboardData.topOpportunities : [
    { id: 1, location: "Belagavi North", product: "DAP Fertilizer", score: 94, potential: "₹45,000" },
    { id: 2, location: "Dharwad Rural", product: "Hybrid Seeds A", score: 88, potential: "₹28,000" },
    { id: 3, location: "Hubli East", product: "Urea 50kg", score: 82, potential: "₹18,500" },
  ];

  return (
    <div className="space-y-12 pb-12">
      {/* Editorial Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
            <Target className="h-3.5 w-3.5" />
            North Karnataka Region
          </div>
          <h1 className="text-4xl font-heading tracking-tight text-foreground">Opportunity Engine</h1>
          <p className="text-muted-foreground font-light text-lg">
            Discover local supply gaps and expansion territories.
          </p>
        </div>
      </header>

      {/* Primary Discovery Area */}
      <section className="grid lg:grid-cols-3 gap-8">
        
        {/* Map Placeholder / Intelligence Viz */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading font-medium tracking-tight">Demand Heatmap</h2>
          </div>
          <div className="bg-card border border-border/40 rounded-xl h-[400px] shadow-sm relative overflow-hidden flex items-center justify-center bg-[url('/noise.png')]">
            {/* In a real implementation, Leaflet goes here. For now, an elegant placeholder */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent mix-blend-overlay" />
            <div className="text-center z-10 space-y-3 p-6 bg-background/80 backdrop-blur-md rounded-xl border border-border/50">
              <MapPin className="h-6 w-6 text-primary mx-auto" />
              <h3 className="font-medium text-sm">Interactive Map Loading</h3>
              <p className="text-xs text-muted-foreground font-light max-w-[200px] mx-auto">
                Geographic intelligence rendering. Connects directly to Leaflet engine.
              </p>
            </div>
          </div>
        </div>

        {/* Highest Score Insight */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading font-medium tracking-tight">Prime Opportunity</h2>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 h-[400px] flex flex-col relative overflow-hidden hover:bg-primary/10 transition-colors">
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary mb-6">
              <TrendingUp className="h-4 w-4" /> Score: 94/100
            </div>
            
            <h3 className="text-2xl font-heading font-medium tracking-tight mb-2 leading-snug">
              Belagavi North
            </h3>
            <p className="text-lg text-foreground font-medium mb-4">
              Severe shortage of DAP Fertilizer.
            </p>
            
            <p className="text-muted-foreground font-light text-sm mb-8 leading-relaxed">
              12 retailers in this 10km radius have reported stock-outs in the last 48 hours. No local distributor currently has inventory.
            </p>
            
            <div className="mt-auto space-y-3">
              <div className="flex justify-between text-sm border-b border-border/40 pb-3">
                <span className="text-muted-foreground">Revenue Potential</span>
                <span className="font-medium text-primary">₹45,000 / week</span>
              </div>
              <button className="w-full bg-primary text-primary-foreground font-medium text-sm py-3 rounded-lg hover:bg-primary/90 transition-colors mt-2">
                Deploy Inventory
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Secondary Table */}
      <section className="space-y-6 pt-6">
        <h2 className="text-lg font-heading font-medium tracking-tight border-b border-border/40 pb-4">Actionable Supply Gaps</h2>
        <div className="border border-border/40 rounded-xl overflow-hidden bg-card shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium text-xs uppercase tracking-widest text-muted-foreground py-4">Location</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-widest text-muted-foreground py-4">Product Required</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-widest text-muted-foreground py-4">Opportunity Score</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-widest text-muted-foreground py-4 text-right">Est. Potential</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((opp) => (
                <TableRow 
                  key={opp.id} 
                  className="cursor-pointer hover:bg-muted/30 transition-colors group"
                  onClick={() => router.push(`/distributor/opportunities/${opp.id}`)}
                >
                  <TableCell className="py-4 font-medium">{opp.location || 'Unknown'}</TableCell>
                  <TableCell className="py-4 text-muted-foreground">{opp.product || (opp.name as string) || 'Unknown'}</TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${opp.score}%` }} />
                      </div>
                      <span className="text-xs font-medium">{opp.score}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-right font-medium group-hover:text-primary transition-colors">{opp.potential || "High"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

