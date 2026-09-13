"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/lib/api/products";
import { Search, ShoppingBag, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function MarketplacePage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', search],
    queryFn: () => productsApi.getProducts({ search, page_size: 50 }),
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-destructive">Failed to load marketplace.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-heading tracking-tight text-foreground">Marketplace</h1>
          <p className="text-muted-foreground font-light text-lg">
            Source products directly from local distributors.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search products..." aria-label="Search products" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border/40 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-shadow"
            />
          </div>
          <Link href="/retailer/cart" aria-label="Open cart" className="bg-primary text-primary-foreground p-2 rounded-lg hover:bg-primary/90 transition-colors">
            <ShoppingBag className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data?.items.map((product) => (
            <Link key={product.id} href={`/retailer/marketplace/${product.id}`}>
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-card border border-border/40 rounded-xl p-5 cursor-pointer h-full flex flex-col group transition-shadow hover:shadow-md"
              >
                <div className="mb-4">
                  <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                    {product.category?.name || "Uncategorized"}
                  </span>
                </div>
                <h3 className="text-lg font-medium tracking-tight mb-2 group-hover:text-primary transition-colors">
                  {product.canonical_name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-grow">
                  {product.description || "High-quality supplier product ready for retail distribution."}
                </p>
                
                <div className="mt-auto flex items-center justify-between border-t border-border/40 pt-4">
                  <div className="text-sm">
                    {product.variants.length} Variant(s)
                  </div>
                  <div className="text-primary group-hover:translate-x-1 transition-transform">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
          {data?.items.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center h-64 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mb-4 opacity-20" />
              <p>No products found matching your search.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
