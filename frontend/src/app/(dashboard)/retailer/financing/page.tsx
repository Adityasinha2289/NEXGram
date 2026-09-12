"use client";

import { useQuery } from "@tanstack/react-query";
import { schemesApi } from "@/lib/api/schemes";
import { Calculator, AlertCircle, Loader2, CheckCircle2, ChevronRight, Landmark } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FinancingPage() {
  const [loanAmount, setLoanAmount] = useState<number>(50000);
  const [tenure, setTenure] = useState<number>(12); // months
  const interestRate = 7.5; // Example fixed rate for simulation

  const { data, isLoading, error } = useQuery({
    queryKey: ['schemes'],
    queryFn: schemesApi.getSchemes,
  });

  const calculateEMI = (principal: number, rate: number, months: number) => {
    if (!principal || !rate || !months) return 0;
    const r = (rate / 12) / 100;
    const emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
    return Math.round(emi);
  };

  const emi = calculateEMI(loanAmount, interestRate, tenure);

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-heading tracking-tight text-foreground">Capital & Financing</h1>
          <p className="text-muted-foreground font-light text-lg max-w-2xl">
            Explore government schemes and compute working capital estimates tailored to your business profile.
          </p>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Col - Schemes */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-heading font-medium tracking-tight border-b border-border/40 pb-4">
            Eligible Schemes
          </h2>
          
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-6 text-sm">
              Failed to load financing schemes.
            </div>
          ) : (
            <div className="space-y-6">
              {data?.schemes.map((scheme) => (
                <div key={scheme.id} className="bg-card border border-border/40 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-6 border-b border-border/40 flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                          {scheme.authority}
                        </span>
                        <span className={`text-xs font-medium uppercase tracking-widest px-2 py-1 rounded-md ${
                          scheme.verdictVariant === 'success' ? 'bg-green-500/10 text-green-500' :
                          scheme.verdictVariant === 'warning' ? 'bg-orange-500/10 text-orange-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {scheme.verdict}
                        </span>
                      </div>
                      <h3 className="text-xl font-heading font-medium tracking-tight mb-2">
                        {scheme.name}
                      </h3>
                      <p className="text-sm text-muted-foreground font-light">
                        {scheme.summary}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-muted/10 grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Eligibility Checks</h4>
                      <ul className="space-y-3">
                        {scheme.checks.map((check, idx) => (
                          <li key={idx} className="flex gap-3 text-sm">
                            {check.status === 'met' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                            ) : check.status === 'self_declare' ? (
                              <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                            )}
                            <div>
                              <p className="font-medium text-foreground">{check.label}</p>
                              <p className="text-muted-foreground font-light text-xs mt-0.5 leading-relaxed">{check.reason}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-background border border-border/40 rounded-lg p-4 space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-2 text-primary">
                          <Landmark className="h-4 w-4" /> Max Benefit
                        </h4>
                        <p className="text-xl font-heading font-medium">{scheme.benefit}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Required Documents</h4>
                        <div className="flex flex-wrap gap-2">
                          {scheme.documents.map(doc => (
                            <span key={doc} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md">
                              {doc}
                            </span>
                          ))}
                        </div>
                      </div>

                      <a 
                        href={scheme.applyAt} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center text-sm font-medium text-primary hover:underline mt-2"
                      >
                        Visit Official Portal <ChevronRight className="h-4 w-4 ml-1" />
                      </a>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted/20 text-xs text-muted-foreground text-center border-t border-border/40">
                    {scheme.disclaimer}
                  </div>
                </div>
              ))}
              
              {data?.schemes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground border border-border/40 rounded-xl border-dashed">
                  No financing schemes matched your profile.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col - Calculator */}
        <div className="space-y-6">
          <h2 className="text-lg font-heading font-medium tracking-tight border-b border-border/40 pb-4">
            EMI Calculator
          </h2>
          
          <div className="bg-card border border-border/40 rounded-xl p-6 space-y-8 sticky top-24">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
              <Calculator className="h-6 w-6" />
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Loan Amount (₹)</label>
                <input 
                  type="number" 
                  value={loanAmount || ""}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full bg-background border border-border/40 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  min="0"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-2">Tenure (Months)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[6, 12, 24].map(t => (
                    <button
                      key={t}
                      onClick={() => setTenure(t)}
                      className={`py-2 text-sm font-medium rounded-md border transition-colors ${
                        tenure === t 
                          ? 'border-primary bg-primary text-primary-foreground' 
                          : 'border-border/40 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {t}M
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Assumed Interest Rate</label>
                <div className="w-full bg-muted/50 border border-border/40 rounded-lg p-3 text-sm text-muted-foreground cursor-not-allowed">
                  {interestRate}% p.a.
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border/40 space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-sm text-muted-foreground">Estimated EMI</span>
                <AnimatePresence mode="wait">
                  <motion.span 
                    key={emi}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-heading font-medium text-primary"
                  >
                    ₹{emi.toLocaleString()}
                  </motion.span>
                </AnimatePresence>
              </div>
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                * This calculation is for estimation purposes only. Actual interest rates and EMIs are determined by the sanctioning bank.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
