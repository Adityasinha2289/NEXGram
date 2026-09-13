"use client";

import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api/orders";
import { Loader2, Package, Search, ChevronRight } from "lucide-react";
import Link from "next/link";
import { statusFor } from "@/lib/orderStatus";

export default function DistributorOrdersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['distributor-orders'],
    queryFn: () => ordersApi.getOrders({ page_size: 50 }),
  });

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-heading tracking-tight text-foreground">Incoming Orders</h1>
          <p className="text-muted-foreground font-light text-lg">
            Manage fulfillment requests from local retailers.
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search orders..." 
            className="w-full bg-card border border-border/40 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-shadow"
          />
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 text-red-500">
          Failed to load incoming orders.
        </div>
      ) : (
        <div className="grid gap-4">
          {data?.items.map((order) => (
            <Link 
              key={order.id} 
              href={`/distributor/orders/${order.id}`}
              className="bg-card border border-border/40 rounded-xl p-5 hover:border-primary/50 transition-colors group flex items-center justify-between"
            >
              <div className="flex items-center gap-6">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${statusFor(order.status).className}`}>
                  <Package className="h-5 w-5" />
                </div>
                
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-heading font-medium tracking-tight text-lg group-hover:text-primary transition-colors">
                      {order.retailer_name}
                    </h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                      {order.order_number}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {order.item_count} items • {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="font-medium">₹{order.total.toLocaleString()}</p>
                  <p className={`text-xs font-medium uppercase tracking-widest mt-1 px-2 py-0.5 rounded-md inline-block ${statusFor(order.status).className}`}>
                    {statusFor(order.status).label}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
          ))}
          
          {data?.items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-card border border-border/40 rounded-xl border-dashed">
              <Package className="h-12 w-12 mb-4 opacity-20" />
              <p>No incoming orders at the moment.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
