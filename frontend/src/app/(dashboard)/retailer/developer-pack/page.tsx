"use client";

import { useQuery } from "@tanstack/react-query";
import { intelligenceApi } from "@/lib/api/intelligence";
import { Sparkles, Loader2, PackageOpen, ShoppingBag, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function DeveloperPackPage() {
  const router = useRouter();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['developer-pack'],
    queryFn: intelligenceApi.getDeveloperPack,
  });

  return (
    <div className="space-y-12 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary mb-4">
            <Sparkles className="h-3.5 w-3.5" /> AI Recommended
          </div>
          <h1 className="text-4xl font-heading tracking-tight text-foreground">Developer Pack</h1>
          <p className="text-muted-foreground font-light text-lg max-w-2xl">
            A curated restock bundle built strictly from hyper-local demand signals and surrounding supply gaps.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 text-red-500">
          Failed to load developer pack recommendations.
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-border/40 flex justify-between items-center">
                <h2 className="text-xl font-heading font-medium tracking-tight">Recommended Bundle</h2>
                <span className="text-sm text-muted-foreground">
                  {data?.lines?.length || 0} Products
                </span>
              </div>
              
              <div className="divide-y divide-border/40">
                {data?.lines?.map((line: { product: string; quantity: number; explanation: string; }, idx: number) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={line.product} 
                    className="p-6 flex flex-col md:flex-row gap-6 hover:bg-muted/10 transition-colors"
                  >
                    <div className="h-24 w-24 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                      <PackageOpen className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium tracking-tight">{line.product}</h3>
                          <p className="text-sm text-primary font-medium mt-1">Recommended Qty: {line.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">Est. Revenue</p>
                          <p className="text-base text-green-500 font-medium tracking-tight">
                            ₹{(line.quantity * 450).toLocaleString()} {/* Mock math */}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-muted/30 border border-border/40 rounded-lg p-3 text-sm text-muted-foreground font-light leading-relaxed">
                        <span className="font-medium text-foreground">Why: </span>
                        {line.explanation}
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {(!data?.lines || data.lines.length === 0) && (
                  <div className="p-12 text-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No high-confidence signals found in your area right now.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <Sparkles className="w-32 h-32 text-primary" />
              </div>
              
              <h3 className="text-xl font-heading font-medium tracking-tight mb-6">
                Bundle Summary
              </h3>
              
              <div className="space-y-4 mb-8 relative z-10">
                <div className="flex justify-between text-sm border-b border-border/40 pb-3">
                  <span className="text-muted-foreground">Total Capital Required</span>
                  <span className="font-medium">₹12,450</span>
                </div>
                <div className="flex justify-between text-sm border-b border-border/40 pb-3">
                  <span className="text-muted-foreground">Estimated Revenue</span>
                  <span className="font-medium text-green-500">₹16,800</span>
                </div>
                <div className="flex justify-between text-sm pb-1">
                  <span className="text-muted-foreground">Estimated Margin</span>
                  <span className="font-medium text-primary">₹4,350 (35%)</span>
                </div>
              </div>
              
              <button 
                onClick={() => router.push('/retailer/marketplace')}
                className="w-full bg-primary text-primary-foreground font-medium text-sm py-4 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 relative z-10"
              >
                <ShoppingBag className="h-4 w-4" /> Go to Marketplace
              </button>
              <p className="text-xs text-center text-muted-foreground mt-4">
                Add these items manually through the marketplace.
              </p>
            </div>
            
            <div className="bg-card border border-border/40 rounded-xl p-6">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" /> How this works
              </h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                NEXGram tracks aggregate demand from consumer searches and retailer stockouts within a 5km radius. 
                When a supply gap is identified, the engine deterministically recommends inventory changes.
              </p>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
