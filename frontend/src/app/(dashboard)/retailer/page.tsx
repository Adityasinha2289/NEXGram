"use client";

import { motion } from "framer-motion";
import { ArrowRight, MapPin, Sparkles, TrendingUp, AlertCircle, ShoppingBag } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { intelligenceApi } from "@/lib/api/intelligence";
import Link from "next/link";

const data = [
  { name: "Mon", total: 12000 },
  { name: "Tue", total: 21000 },
  { name: "Wed", total: 18000 },
  { name: "Thu", total: 24000 },
  { name: "Fri", total: 29000 },
  { name: "Sat", total: 32000 },
  { name: "Sun", total: 35000 },
];

export default function RetailerDashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['retailer-dashboard'],
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

  // Use data from API, fallback to default for presentation
  const rev = dashboardData?.overview?.totalRevenue || 145000;
  const growth = 12.5;

  return (
    <div className="space-y-12 pb-12">
      {/* Header - Editorial & Minimal */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
            <MapPin className="h-3.5 w-3.5" />
            Hubli, Karnataka
          </div>
          <h1 className="text-4xl font-heading tracking-tight text-foreground">Good Morning, Ravi.</h1>
          <p className="text-muted-foreground font-light text-lg">
            Your inventory is stable. Demand for <span className="text-foreground font-medium">Urea</span> is surging locally.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Week to Date</p>
          <div className="text-3xl font-heading tracking-tight text-foreground">₹{rev.toLocaleString()}</div>
          <p className="text-sm font-medium text-primary flex items-center justify-end mt-1">
            <TrendingUp className="h-3.5 w-3.5 mr-1" /> +{growth}%
          </p>
        </div>
      </header>

      {/* Primary Intelligence Section */}
      <section className="grid lg:grid-cols-3 gap-8">
        
        {/* Dominant Chart Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading font-medium tracking-tight">Demand Velocity</h2>
            <button className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest flex items-center gap-1">
              View Report <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="bg-card border border-border/40 rounded-xl p-6 h-[400px] shadow-sm">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  stroke="var(--muted-foreground)" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="var(--muted-foreground)" 
                  fontSize={11} 
                  axisLine={false}
                  tickFormatter={(value) => `₹${value/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="var(--primary)" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI High-Value Recommendation */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading font-medium tracking-tight">Intelligence</h2>
          </div>
          <motion.div 
            whileHover={{ y: -2 }}
            className="bg-primary/5 border border-primary/20 rounded-xl p-6 h-[400px] flex flex-col relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <Sparkles className="w-32 h-32 text-primary" />
            </div>
            
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary mb-6">
              <Sparkles className="h-4 w-4" /> Action Required
            </div>
            
            <h3 className="text-2xl font-heading font-medium tracking-tight mb-4 leading-snug">
              Stock <span className="text-primary">DAP Fertilizer</span> immediately.
            </h3>
            
            <p className="text-muted-foreground font-light text-sm mb-8 leading-relaxed">
              Based on weather patterns and nearby supply gaps, demand in your 5km radius will peak in 3 days. Your current inventory is insufficient.
            </p>
            
            <div className="mt-auto space-y-3">
              <div className="flex justify-between text-sm border-b border-border/40 pb-3">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-medium">92%</span>
              </div>
              <div className="flex justify-between text-sm pb-3">
                <span className="text-muted-foreground">Expected Impact</span>
                <span className="font-medium text-primary">+₹12,500 Margin</span>
              </div>
              <Link href="/retailer/developer-pack" className="w-full bg-primary text-primary-foreground font-medium text-sm py-3 rounded-lg hover:bg-primary/90 transition-colors mt-2 flex justify-center items-center">
                Order Developer Pack
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Secondary Information */}
      <section className="grid lg:grid-cols-2 gap-8 pt-6">
        
        {/* Recent Orders Minimal List */}
        <div className="space-y-6">
          <h2 className="text-lg font-heading font-medium tracking-tight border-b border-border/40 pb-4">Recent Orders</h2>
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-4 border-b border-border/40 group cursor-pointer hover:bg-muted/30 px-2 -mx-2 rounded-md transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">AgriCorp Distributors</p>
                    <p className="text-xs text-muted-foreground font-light">Order #4429 • Arriving Tomorrow</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">₹8,450</p>
                  <p className="text-xs text-orange-500 font-medium">In Transit</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/retailer/orders" className="text-xs font-medium text-primary uppercase tracking-widest mt-2 flex items-center gap-1">
            View All Orders <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Financing Discovery */}
        <div className="space-y-6">
          <h2 className="text-lg font-heading font-medium tracking-tight border-b border-border/40 pb-4">Capital</h2>
          <div className="bg-card border border-border/40 rounded-xl p-6 flex items-start gap-4 hover:shadow-sm transition-shadow cursor-pointer group">
            <div className="bg-secondary p-3 rounded-lg text-secondary-foreground shrink-0 group-hover:scale-105 transition-transform">
               <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Mudra Yojana Scheme Matches</h3>
              <p className="text-muted-foreground text-sm font-light mt-1 leading-relaxed">
                Your business profile qualifies for a ₹50,000 working capital expansion loan at 7% p.a.
              </p>
              <Link href="/retailer/financing" className="text-xs font-medium text-primary uppercase tracking-widest mt-4 flex items-center gap-1">
                View Eligibility <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}
