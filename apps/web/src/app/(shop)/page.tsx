import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Truck, Shield, CreditCard, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard, ProductCardSkeleton } from "@/components/product/product-card";

// Mock data for static generation - in production, fetch from API
const featuredProducts = [
  {
    id: "1",
    name: "Wireless Earbuds Pro",
    slug: "wireless-earbuds-pro",
    price: 7999,
    compareAtPrice: 9999,
    avgRating: 4.8,
    reviewCount: 124,
    isFeatured: true,
    isNewArrival: false,
    isTrending: true,
    images: [{ url: "https://picsum.photos/seed/earbuds/600/600", alt: "Earbuds" }],
    category: { id: "1", name: "Electronics", slug: "electronics" },
    brand: { id: "1", name: "TechNova", slug: "technova" },
    variants: [],
  },
  {
    id: "2",
    name: "Smart Watch Ultra",
    slug: "smart-watch-ultra",
    price: 24999,
    compareAtPrice: 29999,
    avgRating: 4.9,
    reviewCount: 89,
    isFeatured: true,
    isNewArrival: true,
    isTrending: true,
    images: [{ url: "https://picsum.photos/seed/watch/600/600", alt: "Watch" }],
    category: { id: "1", name: "Electronics", slug: "electronics" },
    brand: { id: "1", name: "TechNova", slug: "technova" },
    variants: [],
  },
  {
    id: "3",
    name: "Cotton Crew Neck T-Shirt",
    slug: "cotton-crew-neck-tshirt",
    price: 2499,
    compareAtPrice: 3499,
    avgRating: 4.5,
    reviewCount: 256,
    isFeatured: true,
    isNewArrival: false,
    isTrending: false,
    images: [{ url: "https://picsum.photos/seed/tshirt/600/600", alt: "T-Shirt" }],
    category: { id: "2", name: "Clothing", slug: "clothing" },
    brand: { id: "2", name: "UrbanEdge", slug: "urbanedge" },
    variants: [],
  },
  {
    id: "4",
    name: "Minimalist Desk Lamp",
    slug: "minimalist-desk-lamp",
    price: 3999,
    compareAtPrice: 5499,
    avgRating: 4.7,
    reviewCount: 67,
    isFeatured: true,
    isNewArrival: false,
    isTrending: true,
    images: [{ url: "https://picsum.photos/seed/lamp/600/600", alt: "Lamp" }],
    category: { id: "3", name: "Home & Living", slug: "home-living" },
    brand: { id: "3", name: "HomeCraft", slug: "homecraft" },
    variants: [],
  },
  {
    id: "5",
    name: "Leather Crossbody Bag",
    slug: "leather-crossbody-bag",
    price: 7999,
    compareAtPrice: 9999,
    avgRating: 4.6,
    reviewCount: 143,
    isFeatured: true,
    isNewArrival: true,
    isTrending: false,
    images: [{ url: "https://picsum.photos/seed/bag/600/600", alt: "Bag" }],
    category: { id: "7", name: "Accessories", slug: "accessories" },
    brand: { id: "10", name: "StyleHub", slug: "stylehub" },
    variants: [],
  },
  {
    id: "6",
    name: "Yoga Mat Premium",
    slug: "yoga-mat-premium",
    price: 3999,
    compareAtPrice: 5499,
    avgRating: 4.8,
    reviewCount: 98,
    isFeatured: true,
    isNewArrival: false,
    isTrending: true,
    images: [{ url: "https://picsum.photos/seed/yoga/600/600", alt: "Yoga Mat" }],
    category: { id: "5", name: "Sports", slug: "sports" },
    brand: { id: "4", name: "FitPro", slug: "fitpro" },
    variants: [],
  },
];

const trendingProducts = [
  ...featuredProducts.slice(0, 4).map((p) => ({ ...p, id: `t${p.id}` })),
];

const dealProducts = [
  ...featuredProducts.slice(0, 3).map((p) => ({
    ...p,
    id: `d${p.id}`,
    compareAtPrice: p.price * 1.5,
  })),
];

const features = [
  {
    icon: Truck,
    title: "Free Shipping",
    description: "On orders over $150",
  },
  {
    icon: Shield,
    title: "Secure Payment",
    description: "256-bit SSL encryption",
  },
  {
    icon: CreditCard,
    title: "Easy Returns",
    description: "30-day return policy",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Dedicated customer care",
  },
];

const categories = [
  { name: "Electronics", image: "https://picsum.photos/seed/cat-electronics/400/300", slug: "electronics" },
  { name: "Clothing", image: "https://picsum.photos/seed/cat-clothing/400/300", slug: "clothing" },
  { name: "Home & Living", image: "https://picsum.photos/seed/cat-home/400/300", slug: "home-living" },
  { name: "Beauty", image: "https://picsum.photos/seed/cat-beauty/400/300", slug: "beauty" },
  { name: "Sports", image: "https://picsum.photos/seed/cat-sports/400/300", slug: "sports" },
  { name: "Accessories", image: "https://picsum.photos/seed/cat-accessories/400/300", slug: "accessories" },
];

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

function ProductGrid({ products }: { products: typeof featuredProducts }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product as any} />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="container py-16 md:py-24">
          <div className="max-w-2xl space-y-6">
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
          </div>
        </div>
        {/* Decorative gradient */}
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
                  <p className="text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Shop by Category</h2>
            <p className="text-muted-foreground mt-1">
              Browse our curated collections
            </p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/products">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={`/products?category=${category.slug}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg"
            >
              <img
                src={category.image}
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-semibold text-sm md:text-base">
                  {category.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Featured Products</h2>
            <p className="text-muted-foreground mt-1">
              Handpicked for you
            </p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/products?sort=featured">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid products={featuredProducts} />
        </Suspense>
      </section>

      {/* Deals Section */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Today&apos;s Deals</h2>
            <p className="text-muted-foreground mt-1">
              Limited time offers
            </p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/products?sort=deals">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid products={dealProducts} />
        </Suspense>
      </section>

      {/* Trending Section */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Trending Now</h2>
            <p className="text-muted-foreground mt-1">
              What everyone&apos;s talking about
            </p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/products?sort=trending">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid products={trendingProducts} />
        </Suspense>
      </section>

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
