"use client";

import { useCartStore } from "@/store/cartStore";
import { ArrowLeft, CheckCircle2, Loader2, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ordersApi } from "@/lib/api/orders";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const [success, setSuccess] = useState(false);
  const [notes, setNotes] = useState("");

  const total = items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);

  const checkoutMutation = useMutation({
    mutationFn: () => {
      // Group items by distributor (for demo, we assume all go to one demo distributor)
      const distributor_id = items[0]?.distributor_id || "demo-distributor-id";
      
      return ordersApi.createOrder({
        distributor_id,
        notes: notes || undefined,
        items: items.map(item => ({
          catalogue_item_id: item.catalogue_item_id,
          quantity: item.quantity
        }))
      });
    },
    onSuccess: () => {
      setSuccess(true);
      clearCart();
    },
    onError: () => {
      toast.error("Order Failed", {
        description: "There was a problem placing your order. Please try again."
      });
    }
  });

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="h-24 w-24 bg-green-500/10 rounded-full flex items-center justify-center text-green-500"
        >
          <CheckCircle2 className="h-12 w-12" />
        </motion.div>
        <h2 className="text-3xl font-heading font-medium tracking-tight text-center">Order Confirmed!</h2>
        <p className="text-muted-foreground font-light text-center max-w-sm">
          Your order has been sent directly to the local distributor. They will review and dispatch it shortly.
        </p>
        <div className="flex gap-4 pt-4">
          <Link 
            href="/retailer/orders"
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Track Order
          </Link>
          <Link 
            href="/retailer/marketplace"
            className="border border-border/40 bg-background px-6 py-3 rounded-lg font-medium hover:bg-muted transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    router.push("/retailer/cart");
    return null;
  }

  return (
    <div className="space-y-8 pb-12 max-w-3xl mx-auto">
      <header className="space-y-2 border-b border-border/40 pb-6">
        <Link href="/retailer/cart" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Cart
        </Link>
        <h1 className="text-3xl font-heading tracking-tight text-foreground">Checkout</h1>
      </header>

      <div className="bg-card border border-border/40 rounded-xl p-6 md:p-8 space-y-8">
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Truck className="h-5 w-5 text-muted-foreground" /> Delivery Details
          </h3>
          <div className="bg-muted/30 rounded-lg p-4 border border-border/40">
            <p className="font-medium text-sm">NEXGram Verified Store</p>
            <p className="text-sm text-muted-foreground mt-1">Default Business Address</p>
            <p className="text-sm text-muted-foreground">Hubli, Karnataka, India</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Order Notes (Optional)</h3>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special instructions for delivery or packaging..."
            className="w-full bg-background border border-border/40 rounded-lg p-3 text-sm min-h-[100px] focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div className="space-y-4 pt-6 border-t border-border/40">
          <h3 className="text-lg font-medium">Payment Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal ({items.length} items)</span>
              <span>₹{total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Delivery Fee</span>
              <span>Free</span>
            </div>
            <div className="flex justify-between font-medium text-base pt-3">
              <span>Total Amount</span>
              <span className="text-primary">₹{total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => checkoutMutation.mutate()}
          disabled={checkoutMutation.isPending}
          className="w-full bg-primary text-primary-foreground py-4 rounded-lg font-medium hover:bg-primary/90 transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
        >
          {checkoutMutation.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Processing Order...
            </>
          ) : (
            `Place Order - ₹${total.toLocaleString()}`
          )}
        </button>
      </div>
    </div>
  );
}
