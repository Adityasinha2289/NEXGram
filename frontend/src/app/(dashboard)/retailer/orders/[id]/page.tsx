"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api/orders";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Package, XCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { retailerCanCancel, statusFor } from "@/lib/orderStatus";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getOrderDetail(id),
  });

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.updateOrderStatus(id, { status: "cancelled", reason: "Retailer cancelled" }),
    onSuccess: () => {
      toast.success("Order cancelled");
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['retailer-orders'] });
    },
    // The server explains a refusal (already shipped, already cancelled);
    // swallowing it left the button looking simply broken.
    onError: (err: Error) => {
      toast.error("Could not cancel the order", { description: err.message });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-destructive">Failed to load order details.</p>
        <button onClick={() => router.back()} className="text-primary hover:underline">
          Go back
        </button>
      </div>
    );
  }

  /*
   * The API accepts a retailer cancellation from requested, accepted and
   * preparing. This tested for "pending" and "processing", which it has never
   * used, so the cancel button never appeared on any order.
   */
  const isCancellable = retailerCanCancel(order.status);
  const presentation = statusFor(order.status);

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      <header className="space-y-4 border-b border-border/40 pb-6">
        <Link href="/retailer/orders" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Orders
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-heading tracking-tight text-foreground">Order {order.order_number}</h1>
            <p className="text-muted-foreground font-light mt-1">
              Placed on {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <span className={`px-3 py-1.5 rounded-lg text-sm font-medium uppercase tracking-widest ${presentation.className}`}>
            {presentation.label}
          </span>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border/40 bg-muted/20">
              <h3 className="font-medium text-foreground">Items ({order.item_count})</h3>
            </div>
            <div className="divide-y divide-border/40">
              {order.items.map((item) => (
                <div key={item.id} className="p-4 flex gap-4 items-center">
                  <div className="h-16 w-16 bg-muted/50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Not linked: an order item carries the catalogue item id,
                        and this route resolves a product id, so the link led to
                        a 404 on every row. */}
                    <p className="font-medium text-foreground truncate">{item.product_name}</p>
                    <p className="text-sm text-muted-foreground">{item.variant_name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.quantity} x ₹{item.unit_price.toLocaleString()}
                    </p>
                  </div>
                  <div className="font-medium">
                    ₹{item.line_total.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {order.notes && (
            <div className="bg-muted/20 border border-border/40 rounded-xl p-4 space-y-2">
              <h4 className="text-sm font-medium">Order Notes</h4>
              <p className="text-sm text-muted-foreground font-light">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border/40 rounded-xl p-6">
            <h3 className="font-medium mb-4">Summary</h3>
            <div className="space-y-3 text-sm border-b border-border/40 pb-4 mb-4">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery</span>
                <span>Free</span>
              </div>
            </div>
            <div className="flex justify-between font-medium text-base">
              <span>Total</span>
              <span className="text-primary">₹{order.total.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-card border border-border/40 rounded-xl p-6">
            <h3 className="font-medium mb-4">Supplier</h3>
            <p className="text-sm font-medium">{order.distributor_name}</p>
            <p className="text-xs text-muted-foreground mt-1">NEXGram Verified Distributor</p>
          </div>

          {isCancellable && (
            <button 
              onClick={() => {
                if(confirm("Are you sure you want to cancel this order?")) {
                  cancelMutation.mutate();
                }
              }}
              disabled={cancelMutation.isPending}
              className="w-full border border-destructive/20 text-destructive hover:bg-destructive/10 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Cancel Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
