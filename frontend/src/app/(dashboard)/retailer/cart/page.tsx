"use client";

import { groupBySupplier, linesBelowMoq, useCartStore } from "@/store/cartStore";
import { AlertCircle, ArrowLeft, Minus, Plus, ShoppingBag, Store, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const rupees = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

/**
 * The procurement basket, grouped the way the API stores orders.
 *
 * An order belongs to exactly one supplier server-side - MOQ, stock locking and
 * price snapshotting are all per-supplier - so a basket spanning three
 * distributors becomes three orders. Showing it as one flat list hid that, and
 * the quantity controls let a line sit below the supplier's minimum, which the
 * server then refused for the whole order.
 */
export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem } = useCartStore();

  const groups = groupBySupplier(items);
  const total = items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
  const shortLines = linesBelowMoq(items);

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
          Browse marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      <header className="space-y-2 border-b border-border/40 pb-6">
        <Link
          href="/retailer/marketplace"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Continue shopping
        </Link>
        <h1 className="text-3xl font-heading tracking-tight text-foreground">Your order</h1>
        <p className="text-muted-foreground font-light">
          {groups.length === 1
            ? "Everything here comes from one supplier."
            : `This basket spans ${groups.length} suppliers, so it will be sent as ${groups.length} separate orders.`}
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {groups.map((group) => (
            <div
              key={group.distributorId}
              className="bg-card border border-border/40 rounded-xl overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/30 border-b border-border/40">
                <p className="font-medium text-sm flex items-center gap-2 min-w-0">
                  <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{group.distributorName}</span>
                </p>
                <span className="font-medium text-sm shrink-0">{rupees(group.total)}</span>
              </div>

              <div className="divide-y divide-border/40">
                {group.items.map((item) => {
                  const belowMoq = item.quantity < (item.minimum_order_quantity || 1);
                  return (
                    <div key={item.catalogue_item_id} className="p-4 flex gap-4 items-center">
                      <div className="h-16 w-16 bg-muted/50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <ShoppingBag className="h-5 w-5 text-muted-foreground/30" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">
                          {item.product_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{item.variant_name}</p>
                        <p className="text-sm mt-1">
                          {rupees(item.unit_price)}
                          <span className="text-muted-foreground">
                            {" · MOQ "}
                            {item.minimum_order_quantity}
                            {" · "}
                            {item.available_stock} in stock
                          </span>
                        </p>
                        {belowMoq && (
                          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Minimum {item.minimum_order_quantity} for this supplier
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center border border-border/40 rounded-lg bg-background">
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.catalogue_item_id,
                                Math.max(item.minimum_order_quantity || 1, item.quantity - 1),
                              )
                            }
                            disabled={item.quantity <= (item.minimum_order_quantity || 1)}
                            aria-label={`Reduce ${item.product_name} quantity`}
                            className="p-2 text-muted-foreground hover:bg-muted transition-colors rounded-l-lg disabled:opacity-30"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <div className="w-8 text-center text-sm font-medium">{item.quantity}</div>
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.catalogue_item_id,
                                Math.min(item.available_stock, item.quantity + 1),
                              )
                            }
                            disabled={item.quantity >= item.available_stock}
                            aria-label={`Increase ${item.product_name} quantity`}
                            className="p-2 text-muted-foreground hover:bg-muted transition-colors rounded-r-lg disabled:opacity-30"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item.catalogue_item_id)}
                          aria-label={`Remove ${item.product_name}`}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border/40 rounded-xl p-6 h-fit sticky top-24">
          <h3 className="font-medium mb-6">Order summary</h3>

          <div className="space-y-4 text-sm mb-6">
            <div className="flex justify-between text-muted-foreground">
              <span>Items</span>
              <span className="text-foreground">{items.length}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Suppliers</span>
              <span className="text-foreground">{groups.length}</span>
            </div>
            <div className="flex justify-between font-medium text-base pt-4 border-t border-border/40">
              <span>Estimated total</span>
              <span>{rupees(total)}</span>
            </div>
          </div>

          {shortLines.length > 0 && (
            <p className="text-xs text-destructive mb-4 flex items-start gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-px" />
              {shortLines.length} line{shortLines.length === 1 ? "" : "s"} below the supplier&apos;s
              minimum. Raise the quantity or remove them to continue.
            </p>
          )}

          <button
            onClick={() => router.push("/retailer/checkout")}
            disabled={shortLines.length > 0}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Proceed to checkout
          </button>
        </div>
      </div>
    </div>
  );
}
