"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice, calculateDiscount } from "@/lib/utils";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { useToast } from "@/components/ui/toast";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const discount = calculateDiscount(product.price, product.compareAtPrice);
  const mainImage = product.images?.[0];
  const { addItem } = useCart();
  const { toggleItem, hasItem } = useWishlist();
  const { toast } = useToast();
  const isWishlisted = hasItem(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem(product);
    toast({
      title: isWishlisted ? "Removed from wishlist" : "Added to wishlist",
      description: isWishlisted
        ? `${product.name} has been removed from your wishlist.`
        : `${product.name} has been added to your wishlist.`,
    });
  };

  return (
    <div className={cn("group relative card-hover stagger-item", className)}>
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          {mainImage ? (
            <Image
              src={mainImage.url}
              alt={mainImage.alt || product.name}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No image
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {discount > 0 && (
              <Badge variant="destructive" className="text-xs animate-fade-in">
                -{discount}%
              </Badge>
            )}
            {product.isNewArrival && (
              <Badge variant="default" className="text-xs bg-primary animate-fade-in">
                New
              </Badge>
            )}
            {product.isFeatured && (
              <Badge variant="secondary" className="text-xs animate-fade-in">
                Featured
              </Badge>
            )}
          </div>

          {/* Quick Actions */}
          <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out">
            <Button
              size="icon"
              variant="secondary"
              className={cn(
                "h-8 w-8 rounded-full shadow-md backdrop-blur-sm btn-press",
                isWishlisted && "bg-destructive/10 text-destructive"
              )}
              onClick={handleToggleWishlist}
            >
              <Heart
                className={cn("h-4 w-4 transition-transform duration-200", isWishlisted && "fill-current scale-110")}
              />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-full shadow-md backdrop-blur-sm btn-press"
              onClick={handleAddToCart}
            >
              <ShoppingBag className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 space-y-1">
          {/* Category & Brand */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {product.brand && <span>{product.brand.name}</span>}
            {product.brand && product.category && <span>&middot;</span>}
            {product.category && <span>{product.category.name}</span>}
          </div>

          {/* Name */}
          <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors duration-200">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1">
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-3 w-3 transition-colors duration-200",
                    i < Math.round(product.avgRating)
                      ? "fill-primary text-primary"
                      : "fill-muted text-muted"
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              ({product.reviewCount})
            </span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="font-semibold">{formatPrice(product.price)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="space-y-3">
      <div className="aspect-square rounded-lg skeleton" />
      <div className="space-y-2">
        <div className="h-3 w-20 skeleton rounded" />
        <div className="h-4 w-full skeleton rounded" />
        <div className="h-3 w-24 skeleton rounded" />
        <div className="h-4 w-16 skeleton rounded" />
      </div>
    </div>
  );
}
