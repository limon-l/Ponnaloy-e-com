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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          <div className="aspect-square skeleton rounded-xl" />
          <div className="space-y-4">
            <div className="h-4 w-24 skeleton rounded" />
            <div className="h-8 w-full skeleton rounded" />
            <div className="h-5 w-32 skeleton rounded" />
            <div className="h-10 w-40 skeleton rounded" />
            <div className="h-20 w-full skeleton rounded" />
            <div className="h-12 w-full skeleton rounded" />
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
    if (addingToCart) return;
    setAddingToCart(true);
    addItem(product, quantity, selectedVariantData || null);
    setTimeout(() => {
      toast({
        title: "Added to cart",
        description: `${quantity}x ${product.name} has been added to your cart.`,
      });
      setAddingToCart(false);
    }, 500);
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
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-primary transition-colors">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/products" className="hover:text-primary transition-colors">Products</Link>
        {product.category && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/products?category=${product.category.slug}`} className="hover:text-primary transition-colors">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground truncate max-w-[200px]">{product.name}</span>
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
              className="relative aspect-square overflow-hidden rounded-xl bg-muted"
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
                    "relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all duration-200",
                    selectedImage === index
                      ? "border-primary ring-1 ring-primary/20"
                      : "border-transparent hover:border-border"
                  )}
                >
                  <Image src={image.url} alt={image.alt || ""} fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          {product.brand && (
            <Link href={`/products?brand=${product.brand.slug}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
              {product.brand.name}
            </Link>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn("h-4 w-4", i < Math.round(product.avgRating) ? "fill-warning text-warning" : "fill-muted text-muted")} />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">{product.avgRating} ({product.reviewCount} reviews)</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold tracking-tight">{formatPrice(currentPrice)}</span>
            {product.compareAtPrice && product.compareAtPrice > currentPrice && (
              <span className="text-lg text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</span>
            )}
            {discount > 0 && (
              <Badge variant="destructive" size="lg">Save {discount}%</Badge>
            )}
          </div>

          {product.shortDescription && (
            <p className="text-muted-foreground leading-relaxed">{product.shortDescription}</p>
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
              <div className="flex items-center border rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-none hover:bg-muted"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-12 text-center text-sm font-medium tabular-nums">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-none hover:bg-muted"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">In stock</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              size="lg"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={addingToCart}
              loading={addingToCart}
            >
              <ShoppingBag className="h-4 w-4" />
              Add to Cart
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleToggleWishlist}
              className={cn(
                "transition-all duration-200",
                isWishlisted && "border-destructive text-destructive bg-destructive/5"
              )}
            >
              <Heart className={cn("h-4 w-4 transition-transform duration-200", isWishlisted && "fill-current scale-110")} />
            </Button>
          </div>

          {/* Buy Now */}
          <Button
            size="xl"
            variant="default"
            className="w-full"
            asChild
          >
            <Link href={isAuthenticated ? "/checkout" : "/sign-in?redirect=/checkout"}>
              Buy Now
            </Link>
          </Button>

          {/* Trust signals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="flex items-center gap-2.5 text-sm p-3 rounded-lg bg-muted/50">
              <Truck className="h-4 w-4 text-primary shrink-0" />
              <span>Free shipping over $150</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm p-3 rounded-lg bg-muted/50">
              <RotateCcw className="h-4 w-4 text-primary shrink-0" />
              <span>30-day returns</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm p-3 rounded-lg bg-muted/50">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              <span>Secure checkout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {(product as any).relatedProducts && (product as any).relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl sm:text-2xl font-bold mb-6">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {(product as any).relatedProducts.slice(0, 4).map((rp: any) => (
              <ProductCard key={rp.target?.id} product={rp.target} />
            ))}
          </div>
        </section>
      )}

      {/* Product Information Tabs */}
      <div className="mt-16">
        <Tabs defaultValue="description">
          <TabsList className="w-full justify-start h-auto p-1 bg-muted/50">
            <TabsTrigger value="description" className="text-sm px-4 py-2">Description</TabsTrigger>
            <TabsTrigger value="specifications" className="text-sm px-4 py-2">Specifications</TabsTrigger>
            <TabsTrigger value="reviews" className="text-sm px-4 py-2">Reviews ({product.reviewCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="py-6">
            <div className="max-w-3xl">
              {product.description ? (
                <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed">
                  <p>{product.description}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No description available for this product.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="specifications" className="py-6">
            {product.specifications && product.specifications.length > 0 ? (
              <div className="max-w-2xl border rounded-xl overflow-hidden">
                {product.specifications.map((spec, index) => (
                  <div
                    key={spec.id}
                    className={cn(
                      "grid grid-cols-2 py-3 px-4 text-sm",
                      index % 2 === 0 ? "bg-muted/30" : "bg-background",
                      index !== product.specifications!.length - 1 && "border-b"
                    )}
                  >
                    <span className="font-medium text-foreground">{spec.name}</span>
                    <span className="text-muted-foreground">{spec.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No specifications available.</p>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="py-6">
            {product.reviews && product.reviews.length > 0 ? (
              <div className="space-y-6 max-w-3xl">
                {product.reviews.map((review) => (
                  <div key={review.id} className="border-b pb-6 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn("h-3.5 w-3.5", i < review.rating ? "fill-warning text-warning" : "fill-muted text-muted")} />
                        ))}
                      </div>
                      {review.isVerified && (
                        <Badge variant="success" size="sm">
                          <Check className="h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    {review.title && <h4 className="font-medium text-sm">{review.title}</h4>}
                    {review.comment && <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{review.comment}</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      {review.user?.firstName} · {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile Sticky Purchase Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur p-3 md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{product.name}</p>
            <p className="font-bold text-lg">{formatPrice(currentPrice)}</p>
          </div>
          <Button size="lg" onClick={handleAddToCart} disabled={addingToCart} loading={addingToCart}>
            <ShoppingBag className="h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
