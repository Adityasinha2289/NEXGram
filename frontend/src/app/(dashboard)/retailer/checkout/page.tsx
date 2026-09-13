"use client";

import { groupBySupplier, useCartStore } from "@/store/cartStore";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Store, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ordersApi, type OrderDetail } from "@/lib/api/orders";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";

const rupees = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

interface FailedOrder {
  distributorName: string;
  reason: string;
}

/**
 * Turns the basket into orders.
 *
 * One order per supplier, because that is what the API enforces: an order has a
 * single distributor_id, and it refuses any item that does not belong to that
 * distributor. Checkout previously sent every line to `items[0].distributor_id`
 * — so a basket spanning two suppliers was rejected wholesale — and reported the
 * refusal as "There was a problem placing your order", discarding the server's
 * own explanation.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearDistributor } = useCartStore();
  const [placed, setPlaced] = useState<OrderDetail[]>([]);
  const [failed, setFailed] = useState<FailedOrder[]>([]);
  const [notes, setNotes] = useState("");

  const groups = groupBySupplier(items);
  const total = items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);

  const checkout = useMutation({
    mutationFn: async () => {
      const succeeded: OrderDetail[] = [];
      const rejected: FailedOrder[] = [];

      // Sequential rather than parallel: each order decrements the supplier's
      // stock, and a rejection needs to name the supplier it belongs to.
      for (const group of groups) {
        try {
          const order = await ordersApi.createOrder({
            distributor_id: group.distributorId,
            notes: notes || undefined,
            items: group.items.map((item) => ({
              catalogue_item_id: item.catalogue_item_id,
              quantity: item.quantity,
            })),
          });
          succeeded.push(order);
          // Clear on success only, so a failed supplier's lines stay editable.
          clearDistributor(group.distributorId);
        } catch (err) {
          rejected.push({
            distributorName: group.distributorName,
            reason: err instanceof Error ? err.message : "Order was refused.",
          });
        }
      }

      return { succeeded, rejected };
    },
    onSuccess: ({ succeeded, rejected }) => {
      setPlaced(succeeded);
      setFailed(rejected);
    },
  });

  // Navigating during render warns in React; do it once the render settles.
  const isEmpty = items.length === 0 && placed.length === 0;
  useEffect(() => {
    if (isEmpty) router.push("/retailer/cart");
  }, [isEmpty, router]);

  if (placed.length > 0 && failed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="h-24 w-24 bg-success/10 rounded-full flex items-center justify-center text-success"
        >
          <CheckCircle2 className="h-12 w-12" />
        </motion.div>
        <h2 className="text-3xl font-heading font-medium tracking-tight text-center">
          {placed.length === 1 ? "Order placed" : `${placed.length} orders placed`}
        </h2>
        <p className="text-muted-foreground font-light text-center max-w-sm">
          {placed.map((o) => o.order_number).join(", ")} sent to{" "}
          {placed.length === 1 ? "your supplier" : "your suppliers"} for review.
        </p>
        <div className="flex gap-4 pt-4">
          <Link
            href="/retailer/orders"
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Track orders
          </Link>
          <Link
            href="/retailer/marketplace"
            className="border border-border/40 bg-background px-6 py-3 rounded-lg font-medium hover:bg-muted transition-colors"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  if (isEmpty) return null;

  return (
    <div className="space-y-8 pb-12 max-w-3xl mx-auto">
      <header className="space-y-2 border-b border-border/40 pb-6">
        <Link
          href="/retailer/cart"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to cart
        </Link>
        <h1 className="text-3xl font-heading tracking-tight text-foreground">Checkout</h1>
      </header>

      {/* A part-success is reported per supplier, because the orders that did
          go through are real and the ones that did not are still in the cart. */}
      {placed.length > 0 && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-sm">
          <p className="font-medium text-success">
            {placed.length} order{placed.length === 1 ? "" : "s"} placed:{" "}
            {placed.map((o) => o.order_number).join(", ")}
          </p>
        </div>
      )}
      {failed.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 space-y-2">
          {failed.map((f) => (
            <p key={f.distributorName} className="text-sm flex items-start gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <span className="font-medium">{f.distributorName}:</span> {f.reason}
              </span>
            </p>
          ))}
        </div>
      )}

      <div className="bg-card border border-border/40 rounded-xl p-6 md:p-8 space-y-8">
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Truck className="h-5 w-5 text-muted-foreground" />
            {groups.length === 1 ? "Your supplier" : `${groups.length} separate orders`}
          </h3>
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.distributorId}
                className="bg-muted/30 rounded-lg p-4 border border-border/40 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{group.distributorName}</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {group.items.length} product{group.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="font-medium text-sm shrink-0">{rupees(group.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Order notes (optional)</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            aria-label="Delivery or packing notes" placeholder="Special instructions for delivery or packaging..."
            className="w-full bg-background border border-border/40 rounded-lg p-3 text-sm min-h-[100px] focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div className="space-y-4 pt-6 border-t border-border/40">
          <h3 className="text-lg font-medium">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>
                Subtotal ({items.length} item{items.length === 1 ? "" : "s"})
              </span>
              <span>{rupees(total)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Delivery</span>
              <span>Arranged with your supplier</span>
            </div>
            <div className="flex justify-between font-medium text-base pt-3">
              <span>Total</span>
              <span className="text-primary">{rupees(total)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => checkout.mutate()}
          disabled={checkout.isPending}
          className="w-full bg-primary text-primary-foreground py-4 rounded-lg font-medium hover:bg-primary/90 transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
        >
          {checkout.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Sending
              {groups.length === 1 ? " order" : ` ${groups.length} orders`}...
            </>
          ) : (
            `Place ${groups.length === 1 ? "order" : `${groups.length} orders`} · ${rupees(total)}`
          )}
        </button>
      </div>
    </div>
  );
}
