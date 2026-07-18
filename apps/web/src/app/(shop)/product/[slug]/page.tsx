"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Heart, ShoppingBag, ChevronRight, Minus, Plus,
  Truck, Shield, RotateCcw, Check, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCard, ProductCardSkeleton } from "@/components/product/product-card";
import { cn, formatPrice, calculateDiscount } from "@/lib/utils";
import { api } from "@/lib/api";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/components/ui/toast";
import type { Product } from "@/types";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { isAuthenticated } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  const { addItem } = useCart();
  const { toggleItem, hasItem } = useWishlist();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchProduct() {
      try {
        const result = await api.get<{ success: boolean; data: Product }>(
          `/api/products/${slug}`
        );
        if (result.success) setProduct(result.data);
      } catch (error) {
        console.error("Failed to fetch product:", error);
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square skeleton rounded-lg" />
          <div className="space-y-4">
            <div className="h-4 w-24 skeleton rounded" />
            <div className="h-8 w-full skeleton rounded" />
            <div className="h-6 w-32 skeleton rounded" />
            <div className="h-10 w-40 skeleton rounded" />
            <div className="h-24 w-full skeleton rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <Button asChild className="mt-4">
          <Link href="/products">Back to Products</Link>
        </Button>
      </div>
    );
  }

  const discount = calculateDiscount(product.price, product.compareAtPrice);
  const selectedVariantData = product.variants?.find((v) => v.id === selectedVariant);
  const currentPrice = selectedVariantData?.price ?? product.price;
  const isWishlisted = hasItem(product.id);

  const handleAddToCart = async () => {
    setAddingToCart(true);
    addItem(product, quantity, selectedVariantData || null);
    toast({
      title: "Added to cart",
      description: `${quantity}x ${product.name} has been added to your cart.`,
    });
    setTimeout(() => setAddingToCart(false), 500);
  };

  const handleToggleWishlist = () => {
    toggleItem(product);
    toast({
      title: isWishlisted ? "Removed from wishlist" : "Added to wishlist",
      description: isWishlisted
        ? `${product.name} has been removed from your wishlist.`
        : `${product.name} has been added to your wishlist.`,
    });
  };

  return (
    <div className="container py-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-primary">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/products" className="hover:text-primary">Products</Link>
        {product.category && (
          <>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/products?category=${product.category.slug}`} className="hover:text-primary">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedImage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative aspect-square overflow-hidden rounded-lg bg-muted"
            >
              {product.images[selectedImage] && (
                <Image
                  src={product.images[selectedImage].url}
                  alt={product.images[selectedImage].alt || product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              )}
              {discount > 0 && (
                <Badge variant="destructive" className="absolute top-4 left-4">-{discount}%</Badge>
              )}
            </motion.div>
          </AnimatePresence>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((image, index) => (
                <button
                  key={image.id || index}
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "relative w-20 h-20 rounded-md overflow-hidden border-2 transition-all",
                    selectedImage === index ? "border-primary ring-1 ring-primary/20" : "border-transparent hover:border-border"
                  )}
                >
                  <Image src={image.url} alt={image.alt || ""} fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          {product.brand && (
            <Link href={`/products?brand=${product.brand.slug}`} className="text-sm text-muted-foreground hover:text-primary">
              {product.brand.name}
            </Link>
          )}
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn("h-4 w-4", i < Math.round(product.avgRating) ? "fill-primary text-primary" : "fill-muted text-muted")} />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">{product.avgRating} ({product.reviewCount} reviews)</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">{formatPrice(currentPrice)}</span>
            {product.compareAtPrice && product.compareAtPrice > currentPrice && (
              <span className="text-lg text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</span>
            )}
          </div>
          {product.shortDescription && (
            <p className="text-muted-foreground">{product.shortDescription}</p>
          )}
          <Separator />

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Variant</label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <Button
                    key={variant.id}
                    variant={selectedVariant === variant.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedVariant(variant.id)}
                    disabled={variant.stock === 0}
                  >
                    {variant.name}{variant.stock === 0 && " (Out of stock)"}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Quantity</label>
            <div className="flex items-center gap-3">
              <div className="flex items-center border rounded-md">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none" onClick={() => setQuantity(quantity + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">In stock</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button size="lg" className="flex-1" onClick={handleAddToCart} disabled={addingToCart}>
              {addingToCart ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <ShoppingBag className="h-5 w-5 mr-2" />
              )}
              {addingToCart ? "Adding..." : "Add to Cart"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleToggleWishlist}
              className={cn(isWishlisted && "border-destructive text-destructive")}
            >
              <Heart className={cn("h-5 w-5", isWishlisted && "fill-current")} />
            </Button>
          </div>

          {/* Buy Now */}
          <Button
            size="lg"
            variant="default"
            className="w-full"
            asChild
          >
            <Link href={isAuthenticated ? "/checkout" : "/sign-in?redirect=/checkout"}>
              Buy Now
            </Link>
          </Button>

          {/* Trust signals */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-3 text-sm">
              <Truck className="h-5 w-5 text-primary" /><span>Free shipping on orders over $150</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <RotateCcw className="h-5 w-5 text-primary" /><span>30-day return policy</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="h-5 w-5 text-primary" /><span>Secure checkout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {(product as any).relatedProducts && (product as any).relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {(product as any).relatedProducts.slice(0, 4).map((rp: any) => (
              <ProductCard key={rp.target?.id} product={rp.target} />
            ))}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="mt-16">
        <Tabs defaultValue="description">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({product.reviewCount})</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="py-6">
            <div className="prose max-w-none"><p>{product.description}</p></div>
          </TabsContent>
          <TabsContent value="specifications" className="py-6">
            {product.specifications && product.specifications.length > 0 ? (
              <div className="grid gap-2">
                {product.specifications.map((spec) => (
                  <div key={spec.id} className="grid grid-cols-2 py-2 border-b">
                    <span className="font-medium">{spec.name}</span><span>{spec.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No specifications available.</p>
            )}
          </TabsContent>
          <TabsContent value="reviews" className="py-6">
            {product.reviews && product.reviews.length > 0 ? (
              <div className="space-y-6">
                {product.reviews.map((review) => (
                  <div key={review.id} className="border-b pb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn("h-4 w-4", i < review.rating ? "fill-primary text-primary" : "fill-muted text-muted")} />
                        ))}
                      </div>
                      {review.isVerified && (<Badge variant="secondary" className="text-xs"><Check className="h-3 w-3 mr-1" />Verified</Badge>)}
                    </div>
                    {review.title && <h4 className="font-medium">{review.title}</h4>}
                    {review.comment && <p className="text-muted-foreground mt-1">{review.comment}</p>}
                    <p className="text-xs text-muted-foreground mt-2">{review.user?.firstName} · {new Date(review.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
