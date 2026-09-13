"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api/orders";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Package, Check, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { distributorMoves, statusFor } from "@/lib/orderStatus";

export default function DistributorOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['distributor-order', id],
    queryFn: () => ordersApi.getOrderDetail(id),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => ordersApi.updateOrderStatus(id, { status }),
    onSuccess: (data) => {
      toast.success(`Order ${statusFor(data.status).label.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ['distributor-order', id] });
      queryClient.invalidateQueries({ queryKey: ['distributor-orders'] });
    },
    // The server refuses an illegal transition and an out-of-stock accept with
    // a reason; swallowing it left the button looking simply broken.
    onError: (err: Error) => {
      toast.error("Could not update the order", { description: err.message });
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
        <p className="text-red-500">Failed to load order details.</p>
        <button onClick={() => router.back()} className="text-primary hover:underline">
          Go back
        </button>
      </div>
    );
  }

  /*
   * What this distributor can do next, taken from the server's own transition
   * table. The page previously tested for "pending" and "processing", which the
   * API has never used, so the whole fulfilment panel was unreachable - and the
   * buttons inside it would have sent "processing" and "delivered", which the
   * server rejects outright.
   */
  const moves = distributorMoves(order.status);
  const presentation = statusFor(order.status);

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      <header className="space-y-4 border-b border-border/40 pb-6">
        <Link href="/distributor/orders" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Orders
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-heading tracking-tight text-foreground">Order {order.order_number}</h1>
            <p className="text-muted-foreground font-light mt-1">
              From <span className="font-medium text-foreground">{order.retailer_name}</span> • Placed {new Date(order.created_at).toLocaleString()}
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
                    <p className="font-medium text-foreground truncate block">
                      {item.product_name}
                    </p>
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
              <h4 className="text-sm font-medium">Retailer Notes</h4>
              <p className="text-sm text-muted-foreground font-light">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Actions */}
          {moves.length > 0 && (
            <div className="bg-card border border-border/40 rounded-xl p-6 space-y-3">
              <h3 className="font-medium mb-4">Manage fulfillment</h3>
              {moves.map((move) => {
                const busy =
                  updateStatusMutation.isPending && updateStatusMutation.variables === move.to;
                const tone =
                  move.tone === "danger"
                    ? "border border-red-500/20 text-red-600 hover:bg-red-500/10"
                    : move.tone === "success"
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-primary text-primary-foreground hover:bg-primary/90";
                return (
                  <button
                    key={move.to}
                    onClick={() => updateStatusMutation.mutate(move.to)}
                    disabled={updateStatusMutation.isPending}
                    className={`w-full py-3 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-60 ${tone}`}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : move.tone === "danger" ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    {move.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="bg-card border border-border/40 rounded-xl p-6">
            <h3 className="font-medium mb-4">Summary</h3>
            <div className="space-y-3 text-sm border-b border-border/40 pb-4 mb-4">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{order.subtotal.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between font-medium text-base">
              <span>Total</span>
              <span className="text-primary">₹{order.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
