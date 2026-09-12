"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useAppStore } from "@/store/useAppStore";
import { Grid, ShoppingBag, Package, Brain, PiggyBank } from "lucide-react";

export const Sidebar = () => {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);

  const retailerNav = [
    { name: "Overview", href: "/retailer", icon: Grid },
    { name: "Marketplace", href: "/marketplace", icon: ShoppingBag },
    { name: "Orders", href: "/orders", icon: Package },
    { name: "Intelligence", href: "/intelligence", icon: Brain },
    { name: "Financing", href: "/financing", icon: PiggyBank },
  ];

  const distributorNav = [
    { name: "Overview", href: "/distributor", icon: Grid },
    { name: "Opportunities", href: "/opportunities", icon: Brain },
    { name: "Marketplace", href: "/marketplace", icon: ShoppingBag },
    { name: "Orders", href: "/orders", icon: Package },
    { name: "Intelligence", href: "/intelligence", icon: Brain },
  ];

  const navItems = user?.role === "distributor" ? distributorNav : retailerNav;

  if (!sidebarOpen) return null;

  return (
    <aside className="w-[240px] bg-background hidden md:flex flex-col h-screen sticky top-0 border-r border-border/40">
      <div className="p-8 pb-4">
        <span className="text-2xl font-heading font-medium tracking-tighter text-foreground">
          NEX<span className="text-primary font-normal">Gram</span>
        </span>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname.startsWith(item.href) || pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 group tracking-wide",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Minimal Footer Area */}
      <div className="p-4 mt-auto mb-4 px-8 text-xs text-muted-foreground font-light">
        NEXGram Intelligence v2.1
      </div>
    </aside>
  );
};
