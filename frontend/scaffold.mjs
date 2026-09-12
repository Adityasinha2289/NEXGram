import fs from 'fs';
import path from 'path';

const files = {
  'src/store/useAuthStore.ts': `import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  role: 'retailer' | 'distributor';
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
`,
  'src/store/useAppStore.ts': `import { create } from 'zustand';

interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  aiChatOpen: boolean;
  toggleAiChat: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  aiChatOpen: false,
  toggleAiChat: () => set((state) => ({ aiChatOpen: !state.aiChatOpen })),
}));
`,
  'src/lib/api/client.ts': `import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  // Add auth token here if needed
  return config;
});

export default apiClient;
`,
  'src/lib/api/auth.ts': `import apiClient from './client';

export const login = async (credentials: any) => {
  // Mock login for now
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data: { user: { id: '1', name: 'Ravi Kumar', role: 'retailer' } } });
    }, 1000);
  });
};
`,
  'src/hooks/useDashboardData.ts': `import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/api/client';

export const useDashboardData = (role: string) => {
  return useQuery({
    queryKey: ['dashboard', role],
    queryFn: async () => {
      // Mock data fetching
      return {
        revenue: 45000,
        orders: 120,
        growth: 14.5,
        gapAnalysis: [
          { product: 'Fertilizer A', demand: 85, supply: 40 },
          { product: 'Seeds B', demand: 90, supply: 60 },
        ]
      };
    },
  });
};
`,
  'src/components/layout/Header.tsx': `"use client";

import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { Menu, Bell, Search, Mic } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export const Header = () => {
  const user = useAuthStore((state) => state.user);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6 gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex items-center gap-4">
          <div className="relative w-full max-w-md hidden md:flex items-center">
            <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products, orders..."
              className="w-full bg-muted/50 border-none rounded-full pl-9 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button variant="ghost" size="icon" className="absolute right-1 h-7 w-7 rounded-full">
              <Mic className="h-4 w-4 text-primary" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="relative rounded-full">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive"></span>
          </Button>
          <Avatar className="h-9 w-9 ring-2 ring-primary/20 cursor-pointer">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{user?.name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};
`,
  'src/components/layout/Sidebar.tsx': `"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Map,
  PackageSearch,
  Sparkles,
  Settings,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Sidebar = () => {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);

  const navItems = [
    { name: 'Dashboard', href: user?.role === 'retailer' ? '/retailer' : '/distributor', icon: LayoutDashboard },
    { name: 'Marketplace', href: '/marketplace', icon: ShoppingCart },
    { name: 'Opportunity Engine', href: '/opportunities', icon: TrendingUp },
    { name: 'Supply Map', href: '/map', icon: Map },
    { name: 'Inventory', href: '/inventory', icon: PackageSearch },
  ];

  if (!sidebarOpen) return null;

  return (
    <motion.aside 
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      exit={{ x: -250 }}
      className="w-64 border-r bg-card hidden md:flex flex-col h-screen sticky top-0"
    >
      <div className="p-6 flex items-center gap-2">
        <div className="bg-primary p-1.5 rounded-lg">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-500">NEXGram</span>
      </div>
      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                isActive 
                  ? "bg-primary/10 text-primary shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t mt-auto">
        <div className="bg-gradient-to-br from-primary/20 to-orange-500/20 p-4 rounded-xl border border-primary/10 mb-4 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Sparkles className="h-16 w-16" />
          </div>
          <h4 className="font-semibold text-sm mb-1">AI Advisor</h4>
          <p className="text-xs text-muted-foreground mb-3">Get financing recommendations</p>
          <button className="w-full bg-background hover:bg-muted text-xs font-medium py-2 rounded-lg border shadow-sm transition-colors">
            Ask AI
          </button>
        </div>
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full transition-colors">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </motion.aside>
  );
};
`,
  'src/components/layout/DashboardLayout.tsx': `"use client";

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ReactNode } from 'react';

export const DashboardLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
`,
  'src/app/(dashboard)/layout.tsx': `import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
`,
  'src/app/(dashboard)/retailer/page.tsx': `"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowUpRight, TrendingUp, Package, MapPin, Sparkles } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { name: "Jan", total: 1200 },
  { name: "Feb", total: 2100 },
  { name: "Mar", total: 1800 },
  { name: "Apr", total: 2400 },
  { name: "May", total: 2900 },
  { name: "Jun", total: 3200 },
];

export default function RetailerDashboard() {
  const { data: dashboardData, isLoading } = useDashboardData("retailer");

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
          <p className="text-muted-foreground mt-1">Your hyper-local commerce summary.</p>
        </div>
        <div className="flex items-center gap-2 text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">
          <MapPin className="h-4 w-4" />
          <span>Hubli, Karnataka</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="hover:shadow-md transition-all border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">₹</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{dashboardData?.revenue.toLocaleString()}</div>
              <p className="text-xs text-green-500 flex items-center mt-1 font-medium">
                <ArrowUpRight className="h-3 w-3 mr-1" /> +20.1% from last month
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="hover:shadow-md transition-all border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{dashboardData?.orders}</div>
              <p className="text-xs text-muted-foreground mt-1">
                +12 since last week
              </p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
           <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-orange-500/5 hover:shadow-lg transition-all h-full">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Sparkles className="w-24 h-24 text-primary" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Opportunity Engine
              </CardTitle>
              <CardDescription>Hyper-local insights based on current trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="bg-background p-3 rounded-xl border shadow-sm shrink-0">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">High Demand Alert: Urea Fertilizer</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Supply gap detected in your 5km radius. Stocking up now could yield a 15% margin increase.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => \`₹\${value}\`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
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
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Supply Gap Analysis</CardTitle>
            <CardDescription>
              Local inventory deficits in your sector.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {dashboardData?.gapAnalysis.map((item: any, i: number) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.product}</span>
                    <span className="text-muted-foreground">{item.supply}% Supply / {item.demand}% Demand</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-500" style={{ width: \`\${item.supply}%\` }} />
                    <div className="h-full bg-destructive" style={{ width: \`\${item.demand - item.supply}%\` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
`,
  'src/app/page.tsx': `import { redirect } from 'next/navigation';
export default function Home() {
  redirect('/login');
}
`,
  'src/app/(auth)/login/page.tsx': `"use client";

import { motion } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Sparkles } from "lucide-react";

const formSchema = z.object({
  phone: z.string().min(10, {
    message: "Phone number must be at least 10 digits.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Mock authentication
    login({ id: "1", name: "Ravi Kumar", role: "retailer" });
    router.push("/retailer");
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6"
        >
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground text-sm">
              Enter your phone number to sign in to your account
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 98765 43210" {...field} className="h-11 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="h-11 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-11 rounded-xl text-base font-medium shadow-lg shadow-primary/25">
                Sign In
              </Button>
            </form>
          </Form>
        </motion.div>
      </div>
      
      <div className="hidden md:flex flex-1 bg-muted/50 p-12 items-center justify-center relative overflow-hidden border-l">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-orange-500/10" />
        <div className="relative z-10 max-w-lg text-center space-y-6">
          <h2 className="text-4xl font-bold tracking-tight">Empowering Rural Commerce with AI</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            NEXGram connects retailers and distributors, providing intelligent insights, supply gap analysis, and voice commerce directly to your fingertips.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-8">
             <div className="bg-background/80 backdrop-blur border p-4 rounded-2xl shadow-sm text-left">
                <Sparkles className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-semibold">AI Advisor</h3>
                <p className="text-xs text-muted-foreground mt-1">Smart inventory and financing recommendations.</p>
             </div>
             <div className="bg-background/80 backdrop-blur border p-4 rounded-2xl shadow-sm text-left">
                <MapPin className="h-6 w-6 text-orange-500 mb-2" />
                <h3 className="font-semibold">Hyper-local Maps</h3>
                <p className="text-xs text-muted-foreground mt-1">Find the best suppliers in your direct radius.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { MapPin } from "lucide-react";
`,
  'src/components/shared/SkeletonCard.tsx': `import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function SkeletonCard() {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-[120px] mb-2" />
        <Skeleton className="h-3 w-[150px]" />
      </CardContent>
    </Card>
  );
}
`,
  'src/components/providers.tsx': `"use client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </NextThemesProvider>
  );
}
`,
  'src/app/layout.tsx': `import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
  title: "NEXGram - AI Powered Commerce",
  description: "Hyper-local rural B2B commerce",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={\`\${inter.variable} \${outfit.variable} font-sans antialiased bg-background text-foreground\`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
`
};

for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}
console.log('Scaffolding complete!');
