"use client";

import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api/orders";
import { Loader2, Package, Search } from "lucide-react";
import Link from "next/link";
import { statusFor } from "@/lib/orderStatus";

export default function RetailerOrdersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['retailer-orders'],
    queryFn: () => ordersApi.getOrders({ page_size: 50 }),
  });

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-heading tracking-tight text-foreground">Order History</h1>
          <p className="text-muted-foreground font-light text-lg">
            Track and manage your incoming stock.
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
          Failed to load orders.
        </div>
      ) : (
        <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase tracking-widest bg-muted/50 border-b border-border/40">
                <tr>
                  <th className="px-6 py-4 font-medium">Order ID</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Supplier</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((order) => (
                  <tr key={order.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/retailer/orders/${order.id}`} className="font-medium text-primary hover:underline">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {order.distributor_name}
                    </td>
                    <td className="px-6 py-4">
                      {/* One vocabulary for every screen. This branched on
                          'delivered', which the API never sends, so a finished
                          order stayed amber and the raw value was printed at
                          the user. */}
                      <span className={`px-2 py-1 rounded-md text-xs font-medium uppercase tracking-widest ${statusFor(order.status).className}`}>
                        {statusFor(order.status).label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      ₹{order.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
                
                {data?.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-24 text-center text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>You haven&apos;t placed any orders yet.</p>
                      <Link href="/retailer/marketplace" className="text-primary hover:underline mt-2 inline-block">
                        Go to Marketplace
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
