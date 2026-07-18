"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Truck, Shield, CreditCard, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard, ProductCardSkeleton } from "@/components/product/product-card";
import { api } from "@/lib/api";
import type { Product } from "@/types";

const features = [
  { icon: Truck, title: "Free Shipping", description: "On orders over $150" },
  { icon: Shield, title: "Secure Payment", description: "256-bit SSL encryption" },
  { icon: CreditCard, title: "Easy Returns", description: "30-day return policy" },
  { icon: Headphones, title: "24/7 Support", description: "Dedicated customer care" },
];

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) return <ProductGridSkeleton />;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [dealProducts, setDealProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; image: string; slug: string }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [featuredRes, dealsRes, trendingRes, productsRes] = await Promise.allSettled([
        api.get<{ success: boolean; data: Product[] }>("/api/products/featured"),
        api.get<{ success: boolean; data: Product[] }>("/api/products/deals"),
        api.get<{ success: boolean; data: Product[] }>("/api/products/trending"),
        api.get<{ success: boolean; data: Product[]; pagination?: { total: number } }>("/api/products?limit=100"),
      ]);

      if (featuredRes.status === "fulfilled" && featuredRes.value.success) setFeaturedProducts(featuredRes.value.data);
      if (dealsRes.status === "fulfilled" && dealsRes.value.success) setDealProducts(dealsRes.value.data);
      if (trendingRes.status === "fulfilled" && trendingRes.value.success) setTrendingProducts(trendingRes.value.data);

      if (productsRes.status === "fulfilled" && productsRes.value.success && productsRes.value.data.length > 0) {
        const catMap = new Map<string, { id: string; name: string; slug: string; image: string }>();
        for (const p of productsRes.value.data) {
          if (p.category && !catMap.has(p.category.slug)) {
            catMap.set(p.category.slug, {
              id: p.category.id,
              name: p.category.name,
              slug: p.category.slug,
              image: p.category.image || p.images?.[0]?.url || `https://picsum.photos/seed/${p.category.slug}/400/300`,
            });
          }
        }
        setCategories(Array.from(catMap.values()));
      }
    } catch (err) {
      console.error("Failed to load homepage data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="container py-16 md:py-24">
          <motion.div
            className="max-w-2xl space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Premium Shopping{" "}
              <span className="text-primary">Experience</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg">
              Discover curated products with exceptional quality, fast shipping,
              and a seamless shopping experience designed for you.
            </p>
            <div className="flex gap-4">
              <Button size="lg" asChild>
                <Link href="/products">
                  Shop Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/products?sort=newest">New Arrivals</Link>
              </Button>
            </div>
          </motion.div>
        </div>
        <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent -z-10" />
      </section>

      {/* Features Bar */}
      <section className="border-y bg-muted/50">
        <div className="container py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-center gap-3">
                <feature.icon className="h-8 w-8 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="container py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Shop by Category</h2>
              <p className="text-muted-foreground mt-1">Browse our curated collections</p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/products">View All<ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/products?category=${category.id}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg"
              >
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 16vw"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm md:text-base">{category.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Featured Products</h2>
            <p className="text-muted-foreground mt-1">Handpicked for you</p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/products?sort=featured">View All<ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
        {loading ? <ProductGridSkeleton /> : <ProductGrid products={featuredProducts} />}
      </section>

      {/* Deals Section */}
      {dealProducts.length > 0 && (
        <section className="container py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Today&apos;s Deals</h2>
              <p className="text-muted-foreground mt-1">Limited time offers</p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/products?sort=deals">View All<ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          {loading ? <ProductGridSkeleton /> : <ProductGrid products={dealProducts} />}
        </section>
      )}

      {/* Trending Section */}
      {trendingProducts.length > 0 && (
        <section className="container py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Trending Now</h2>
              <p className="text-muted-foreground mt-1">What everyone&apos;s talking about</p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/products?sort=trending">View All<ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          {loading ? <ProductGridSkeleton /> : <ProductGrid products={trendingProducts} />}
        </section>
      )}

      {/* Newsletter */}
      <section className="border-t bg-muted/50">
        <div className="container py-16 text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-bold">Stay in the Loop</h2>
          <p className="text-muted-foreground mt-2 mb-6">
            Subscribe for exclusive deals, new arrivals, and more.
          </p>
          <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 rounded-lg border bg-background text-sm"
            />
            <Button type="submit">Subscribe</Button>
          </form>
        </div>
      </section>
    </div>
  );
}
