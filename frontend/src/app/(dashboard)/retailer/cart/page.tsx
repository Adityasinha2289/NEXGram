"use client";

import { useCartStore } from "@/store/cartStore";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem } = useCartStore();

  const total = items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
        <div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
          <ShoppingBag className="h-10 w-10 opacity-50" />
        </div>
        <h2 className="text-2xl font-heading font-medium tracking-tight">Your cart is empty</h2>
        <p className="text-muted-foreground font-light text-center max-w-sm">
          Looks like you haven&apos;t added any products to your order yet.
        </p>
        <Link 
          href="/retailer/marketplace"
          className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      <header className="space-y-2 border-b border-border/40 pb-6">
        <Link href="/retailer/marketplace" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Continue Shopping
        </Link>
        <h1 className="text-3xl font-heading tracking-tight text-foreground">Your Order</h1>
        <p className="text-muted-foreground font-light">
          Review your items before proceeding to checkout.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.catalogue_item_id} className="bg-card border border-border/40 rounded-xl p-4 flex gap-4 items-center">
              <div className="h-20 w-20 bg-muted/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="h-6 w-6 text-muted-foreground/30" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground truncate">{item.product_name}</h3>
                <p className="text-sm text-muted-foreground">{item.variant_name}</p>
                <p className="text-sm font-medium mt-1">₹{item.unit_price.toLocaleString()}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center border border-border/40 rounded-lg bg-background">
                  <button 
                    onClick={() => updateQuantity(item.catalogue_item_id, Math.max(1, item.quantity - 1))}
                    className="p-2 text-muted-foreground hover:bg-muted transition-colors rounded-l-lg"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <div className="w-8 text-center text-sm font-medium">
                    {item.quantity}
                  </div>
                  <button 
                    onClick={() => updateQuantity(item.catalogue_item_id, item.quantity + 1)}
                    className="p-2 text-muted-foreground hover:bg-muted transition-colors rounded-r-lg"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                
                <button 
                  onClick={() => removeItem(item.catalogue_item_id)}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border/40 rounded-xl p-6 h-fit sticky top-24">
          <h3 className="font-medium mb-6">Order Summary</h3>
          
          <div className="space-y-4 text-sm mb-6">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="text-foreground">₹{total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Delivery Fee</span>
              <span className="text-foreground">Calculated next step</span>
            </div>
            <div className="flex justify-between font-medium text-base pt-4 border-t border-border/40">
              <span>Total Estimated</span>
              <span>₹{total.toLocaleString()}</span>
            </div>
          </div>

          <button 
            onClick={() => router.push('/retailer/checkout')}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
