"use client";

import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/lib/api/products";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Minus, Plus, ShoppingBag, Package } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getProduct(id),
  });

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
        <p className="text-red-500">Failed to load product details.</p>
        <button onClick={() => router.back()} className="text-primary hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const activeVariant = product.variants.find((v) => v.id === selectedVariant) || product.variants[0];

  const handleAddToCart = () => {
    if (!activeVariant) return;
    
    addItem({
      catalogue_item_id: activeVariant.id,
      product_id: product.id,
      product_name: product.canonical_name,
      variant_name: activeVariant.variant_name,
      quantity,
      unit_price: 500, // Using mock price as API doesn't expose it directly yet
      distributor_id: "demo-distributor-id", // Hardcoding demo distributor for now until catalogue routing is fixed
    });
    
    toast.success("Added to cart", {
      description: `${quantity}x ${product.canonical_name} added to your order.`,
    });
  };

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      <Link href="/retailer/marketplace" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Marketplace
      </Link>

      <div className="grid md:grid-cols-2 gap-12 pt-4">
        <div className="bg-card border border-border/40 rounded-2xl p-8 flex items-center justify-center h-[400px] md:h-[500px]">
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
            <p className="text-lg text-muted-foreground font-light mt-4 leading-relaxed">
              {product.description || "High-quality agricultural and retail supplies verified by NEXGram."}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Select Variant</h3>
            <div className="flex flex-wrap gap-3">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariant(v.id)}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                    (selectedVariant === v.id) || (!selectedVariant && activeVariant?.id === v.id)
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border/40 text-muted-foreground hover:border-border"
                  }`}
                >
                  {v.variant_name} {v.pack_size && `(${v.pack_size})`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/40">
            <h3 className="font-medium">Quantity</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-border/40 rounded-lg">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 text-muted-foreground hover:bg-muted transition-colors rounded-l-lg"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="w-12 text-center font-medium">
                  {quantity}
                </div>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 text-muted-foreground hover:bg-muted transition-colors rounded-r-lg"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button 
                onClick={handleAddToCart}
                className="flex-1 bg-primary text-primary-foreground flex items-center justify-center gap-2 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <ShoppingBag className="h-4 w-4" /> Add to Cart
              </button>
            </div>
            <p className="text-xs text-muted-foreground font-light text-right">
              Minimum Order Quantity: 1 unit
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
