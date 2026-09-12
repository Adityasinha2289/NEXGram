"use client";

import { useQuery } from "@tanstack/react-query";
import { intelligenceApi } from "@/lib/api/intelligence";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Target, Users, MapPin, Store, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function DistributorOpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: opp, isLoading, error } = useQuery({
    queryKey: ['opportunity', id],
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
        <p className="text-red-500">Failed to load opportunity details.</p>
        <button onClick={() => router.back()} className="text-primary hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      <header className="space-y-4 border-b border-border/40 pb-6">
        <Link href="/distributor" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary mb-2">
              <Target className="h-3.5 w-3.5" /> Opportunity Score: {opp.score}/100
            </div>
            <h1 className="text-3xl font-heading tracking-tight text-foreground">{opp.name || opp.product || "Supply Gap Identified"}</h1>
            <p className="text-muted-foreground font-light mt-1 flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {opp.location}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-1">Est. Potential</p>
            <div className="text-2xl font-heading tracking-tight text-green-500">{opp.potential || opp.value_potential || "High"}</div>
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Main Content */}
        <div className="md:col-span-2 space-y-8">
          
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 md:p-8">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-primary" /> Explanation
            </h3>
            <p className="text-lg md:text-xl font-light leading-relaxed text-foreground">
              {opp.explanation?.text || opp.description || "Retailers in this region are actively searching for this product, but local supply is inadequate."}
            </p>
            {opp.explanation?.verified && (
              <div className="mt-6 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-green-500 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                <CheckCircle2 className="h-4 w-4" /> Deterministically Verified
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border/40 rounded-xl p-6 space-y-2">
              <div className="h-10 w-10 bg-muted/50 rounded-lg flex items-center justify-center mb-4">
                <Store className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-heading tracking-tight">{opp.retailerCount || opp.evidence?.retailers || 0}</p>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Active Retailers</p>
              <p className="text-xs text-muted-foreground font-light pt-2 border-t border-border/40">
                Searching for this product within 10km.
              </p>
            </div>
            
            <div className="bg-card border border-border/40 rounded-xl p-6 space-y-2">
              <div className="h-10 w-10 bg-muted/50 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-heading tracking-tight">{opp.availableSupplierCount || opp.evidence?.suppliers || 0}</p>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Local Suppliers</p>
              <p className="text-xs text-muted-foreground font-light pt-2 border-t border-border/40">
                Currently holding inventory in region.
              </p>
            </div>
          </div>
          
          {opp.evidence?.breakdown && (
            <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
               <div className="p-4 border-b border-border/40 bg-muted/20">
                 <h3 className="font-medium text-foreground">Score Breakdown</h3>
               </div>
               <div className="divide-y divide-border/40">
                 {opp.evidence.breakdown.map((b: { detail?: string; factor?: string; points?: number; }, idx: number) => (
                   <div key={idx} className="p-4 flex justify-between items-center">
                     <div>
                       <p className="font-medium text-sm">{b.detail || b.factor}</p>
                     </div>
                     <div className="text-sm font-medium">
                       +{b.points || 0} pts
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}
          
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-card border border-border/40 rounded-xl p-6 sticky top-24">
            <h3 className="font-medium mb-4">Action Plan</h3>
            <p className="text-sm text-muted-foreground font-light mb-6">
              You can fulfill this demand by provisioning inventory for this region. Retailers will be notified automatically via Developer Packs.
            </p>
            <button className="w-full bg-primary text-primary-foreground py-3 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              Source Product
            </button>
            <button className="w-full mt-3 bg-transparent border border-border/40 py-3 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
              Dismiss
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
