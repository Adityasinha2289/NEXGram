"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, Info, CheckCircle2 } from "lucide-react";


export const AIAdvisor = () => {

  const [query, setQuery] = useState("");

  return (
    <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-6 border-b border-border/40 flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-medium tracking-tight">
              Intelligence Workspace
            </h2>
            <p className="text-xs text-muted-foreground font-light">
              Powered by NEXGram AI
            </p>
          </div>
        </div>
      </div>

      {/* Workspace Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[url('/noise.png')] mix-blend-multiply dark:mix-blend-overlay">
        {/* Contextual Recommendation Block */}
        <div className="bg-background border border-primary/20 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <h3 className="text-sm font-medium uppercase tracking-widest text-primary mb-3">
            Active Recommendation
          </h3>
          <p className="text-lg font-heading text-foreground mb-4">
            Increase inventory of{" "}
            <span className="font-medium text-primary">NPK 19-19-19</span> by
            40%.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="border border-border/40 rounded-lg p-3 bg-muted/10">
              <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">
                Confidence
              </span>
              <span className="text-lg font-medium flex items-center gap-1">
                88% <CheckCircle2 className="h-4 w-4 text-green-500" />
              </span>
            </div>
            <div className="border border-border/40 rounded-lg p-3 bg-muted/10">
              <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">
                Impact
              </span>
              <span className="text-lg font-medium text-primary">+₹8,200</span>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-muted/30 p-3 rounded-lg text-sm text-muted-foreground font-light">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              <strong>Why:</strong> Historical data shows a 45% surge in NPK
              demand during this week of the monsoon season. Two nearby
              distributors have reported low stock.
            </p>
          </div>
        </div>

        {/* Suggested Queries */}
        <div>
          <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
            Suggested Inquiries
          </h3>
          <div className="flex flex-wrap gap-2">
            {[
              "What is my highest margin product?",
              "Analyze current supply gaps in Hubli.",
              "Am I eligible for PM Mudra Yojana?",
            ].map((q) => (
              <button
                key={q}
                className="text-sm border border-border/40 bg-card hover:bg-muted text-foreground px-4 py-2 rounded-full font-light transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border/40 bg-background">
        <div className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about inventory, finance, or demand..."
            className="w-full bg-muted/30 border border-border/50 hover:border-border rounded-lg pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/60"
          />
          <button className="absolute right-2 p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
