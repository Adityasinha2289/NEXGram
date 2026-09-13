"use client";

import { useQuery } from "@tanstack/react-query";
import { productsApi, type SupplierOffer } from "@/lib/api/products";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Minus, Plus, ShoppingBag, Package, Store, MapPin, Truck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";

const rupees = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

/**
 * One product, and every local supplier who lists it.
 *
 * The page is built on /products/{id}/suppliers rather than /products/{id},
 * because an order line is a *listing* — a specific supplier's offer at a
 * specific price with its own MOQ and stock. It previously added the selected
 * *variant* id to the cart as the catalogue item id, alongside a hardcoded
 * unit_price of 500 and distributor_id of "demo-distributor-id", so every order
 * built from this screen was refused by the server.
 */
export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number | null>(null);
  const addItem = useCartStore((state) => state.addItem);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product-suppliers", id],
    queryFn: () => productsApi.getProductWithSuppliers(id),
  });

  // Cheapest offer that can actually be fulfilled leads.
  const offers = useMemo(() => {
    const all = product?.offers ?? [];
    return [...all].sort((a, b) => {
      const aOk = a.stock >= a.moq ? 0 : 1;
      const bOk = b.stock >= b.moq ? 0 : 1;
      return aOk - bOk || a.price - b.price;
    });
  }, [product]);

  const activeOffer: SupplierOffer | undefined =
    offers.find((o) => o.id === selectedOfferId) ?? offers[0];

  // Quantity opens at the supplier's MOQ, which is the smallest order they
  // accept — starting at 1 produced a line the API rejects.
  const effectiveQuantity = quantity ?? activeOffer?.moq ?? 1;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Could not load this product."}
        </p>
        <button onClick={() => router.back()} className="text-primary hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const canOrder =
    !!activeOffer && activeOffer.stock >= activeOffer.moq && effectiveQuantity <= activeOffer.stock;

  const handleAddToCart = () => {
    if (!activeOffer || !canOrder) return;

    addItem({
      // The listing id, which is what POST /orders resolves against.
      catalogue_item_id: activeOffer.id,
      product_id: product.id,
      product_name: product.canonical_name,
      variant_name: activeOffer.variant_name,
      quantity: effectiveQuantity,
      unit_price: activeOffer.price,
      distributor_id: activeOffer.distributor_id,
      distributor_name: activeOffer.distributor_name,
      minimum_order_quantity: activeOffer.moq,
      available_stock: activeOffer.stock,
    });

    toast.success("Added to cart", {
      description: `${effectiveQuantity} × ${product.canonical_name} from ${activeOffer.distributor_name}.`,
    });
  };

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      <Link
        href="/retailer/marketplace"
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to marketplace
      </Link>

      <div className="grid md:grid-cols-2 gap-12 pt-4">
        <div className="bg-card border border-border/40 rounded-2xl p-8 flex items-center justify-center h-[300px] md:h-[420px]">
          <Package className="w-32 h-32 text-muted-foreground/20" />
        </div>

        <div className="space-y-8">
          <div>
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground bg-muted/50 px-2 py-1 rounded-md mb-4 inline-block">
              {product.category?.name || "Uncategorized"}
            </span>
            <h1 className="text-3xl md:text-4xl font-heading tracking-tight text-foreground mt-2">
              {product.canonical_name}
            </h1>
            {product.description && (
              <p className="text-lg text-muted-foreground font-light mt-4 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          {offers.length === 0 ? (
            <div className="bg-muted/30 border border-border/40 rounded-xl p-6 text-sm text-muted-foreground">
              No supplier near you lists this product yet, so it cannot be ordered.
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <h3 className="font-medium">Choose a supplier</h3>
                <div className="space-y-2">
                  {offers.map((offer) => {
                    const isActive = activeOffer?.id === offer.id;
                    const outOfStock = offer.stock < offer.moq;
                    return (
                      <button
                        key={offer.id}
                        onClick={() => {
                          setSelectedOfferId(offer.id);
                          setQuantity(offer.moq);
                        }}
                        disabled={outOfStock}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          isActive
                            ? "border-primary bg-primary/5"
                            : "border-border/40 hover:border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-sm flex items-center gap-1.5">
                              <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{offer.distributor_name}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {offer.variant_name}
                              {offer.pack_size ? ` (${offer.pack_size})` : ""} · MOQ {offer.moq} ·{" "}
                              {outOfStock ? "out of stock" : `${offer.stock} in stock`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                              {offer.distributor_location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {offer.distributor_location}
                                </span>
                              )}
                              {offer.delivery_time && (
                                <span className="flex items-center gap-1">
                                  <Truck className="h-3 w-3" /> {offer.delivery_time}
                                </span>
                              )}
                            </p>
                          </div>
                          <span className="font-medium shrink-0">{rupees(offer.price)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border/40">
                <h3 className="font-medium">Quantity</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-border/40 rounded-lg">
                    <button
                      onClick={() =>
                        setQuantity(Math.max(activeOffer?.moq ?? 1, effectiveQuantity - 1))
                      }
                      disabled={effectiveQuantity <= (activeOffer?.moq ?? 1)}
                      className="p-3 text-muted-foreground hover:bg-muted transition-colors rounded-l-lg disabled:opacity-30"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div className="w-12 text-center font-medium">{effectiveQuantity}</div>
                    <button
                      onClick={() =>
                        setQuantity(Math.min(activeOffer?.stock ?? Infinity, effectiveQuantity + 1))
                      }
                      disabled={effectiveQuantity >= (activeOffer?.stock ?? Infinity)}
                      className="p-3 text-muted-foreground hover:bg-muted transition-colors rounded-r-lg disabled:opacity-30"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={handleAddToCart}
                    disabled={!canOrder}
                    className="flex-1 bg-primary text-primary-foreground flex items-center justify-center gap-2 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {activeOffer ? `Add · ${rupees(activeOffer.price * effectiveQuantity)}` : "Add to cart"}
                  </button>
                </div>
                {activeOffer && (
                  <p className="text-xs text-muted-foreground font-light text-right">
                    Minimum order {activeOffer.moq} · {activeOffer.stock} available
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
