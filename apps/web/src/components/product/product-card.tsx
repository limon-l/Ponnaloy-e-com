"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, Star, Check, Loader2 } from "lucide-react";
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

type AddToCartState = "idle" | "loading" | "success";

export function ProductCard({ product, className }: ProductCardProps) {
  const discount = calculateDiscount(product.price, product.compareAtPrice);
  const mainImage = product.images?.[0];
  const secondImage = product.images?.[1];
  const { addItem } = useCart();
  const { toggleItem, hasItem } = useWishlist();
  const { toast } = useToast();
  const isWishlisted = hasItem(product.id);
  const [cartState, setCartState] = useState<AddToCartState>("idle");
  const [wishAnimating, setWishAnimating] = useState(false);

  const isOutOfStock =
    product.variants && product.variants.length > 0
      ? product.variants.every((v) => v.stock === 0)
      : (product as any).stock === 0;

  const handleAddToCart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (cartState !== "idle" || isOutOfStock) return;

      setCartState("loading");
      addItem(product, 1);

      setTimeout(() => {
        setCartState("success");
        toast({
          title: "Added to cart",
          description: `${product.name} has been added to your cart.`,
        });
        setTimeout(() => setCartState("idle"), 1500);
      }, 400);
    },
    [cartState, isOutOfStock, addItem, product, toast]
  );

  const handleToggleWishlist = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setWishAnimating(true);
      toggleItem(product);
      toast({
        title: isWishlisted ? "Removed from wishlist" : "Added to wishlist",
        description: isWishlisted
          ? `${product.name} removed from your wishlist.`
          : `${product.name} added to your wishlist.`,
      });
      setTimeout(() => setWishAnimating(false), 500);
    },
    [isWishlisted, toggleItem, product, toast]
  );

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card text-card-foreground transition-all duration-200",
        "hover:shadow-md hover:border-primary/20",
        "hover:-translate-y-0.5",
        isOutOfStock && "opacity-75",
        className
      )}
    >
      <Link href={`/product/${product.slug}`} className="block relative">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden rounded-t-xl bg-muted">
          {mainImage ? (
            <>
              <Image
                src={mainImage.url}
                alt={mainImage.alt || product.name}
                fill
                className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 50vw, 33vw"
              />
              {secondImage && (
                <Image
                  src={secondImage.url}
                  alt={secondImage.alt || product.name}
                  fill
                  className="object-cover transition-all duration-300 ease-out opacity-0 group-hover:opacity-100 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 50vw, 33vw"
                />
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No image
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
            {discount > 0 && (
              <Badge variant="destructive" size="sm">
                -{discount}%
              </Badge>
            )}
            {product.isNewArrival && (
              <Badge variant="default" size="sm">
                New
              </Badge>
            )}
            {isOutOfStock && (
              <Badge variant="secondary" size="sm" className="bg-muted-foreground/80 text-background">
                Out of Stock
              </Badge>
            )}
          </div>

          {/* Wishlist Button - 40x40 touch target */}
          <button
            onClick={handleToggleWishlist}
            className={cn(
              "absolute top-2.5 right-2.5 z-20 flex h-10 w-10 items-center justify-center rounded-full",
              "bg-background/90 backdrop-blur-sm border shadow-sm",
              "transition-all duration-200",
              "opacity-0 group-hover:opacity-100",
              "max-md:opacity-100",
              "hover:scale-110 hover:shadow-md active:scale-95",
              isWishlisted && "bg-destructive/10 border-destructive/20"
            )}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-all duration-200",
                isWishlisted
                  ? "fill-destructive text-destructive"
                  : "text-foreground/70",
                wishAnimating && "scale-125"
              )}
            />
          </button>
        </div>
      </Link>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <Link href={`/product/${product.slug}`} className="block">
          {/* Brand & Category */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            {product.brand && (
              <span className="font-medium">{product.brand.name}</span>
            )}
            {product.brand && product.category && (
              <span className="text-muted-foreground/50">/</span>
            )}
            {product.category && <span>{product.category.name}</span>}
          </div>

          {/* Product Name */}
          <h3 className="font-medium text-sm leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors duration-200">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1 mt-1.5">
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-3 w-3",
                    i < Math.round(product.avgRating)
                      ? "fill-warning text-warning"
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
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="font-bold text-base">
              {formatPrice(product.price)}
            </span>
            {product.compareAtPrice &&
              product.compareAtPrice > product.price && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
            {discount > 0 && (
              <Badge variant="destructive" size="sm" className="ml-auto">
                Save {discount}%
              </Badge>
            )}
          </div>
        </Link>

        {/* Add to Cart Button */}
        <div className="mt-3 pt-3 border-t border-border/50">
          {isOutOfStock ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full cursor-not-allowed opacity-50"
              disabled
            >
              Out of Stock
            </Button>
          ) : (
            <Button
              size="sm"
              className={cn(
                "w-full transition-all duration-200",
                cartState === "success" &&
                  "bg-success hover:bg-success text-success-foreground"
              )}
              onClick={handleAddToCart}
              disabled={cartState !== "idle"}
              loading={cartState === "loading"}
            >
              {cartState === "success" && (
                <Check className="h-3.5 w-3.5" />
              )}
              {cartState === "idle" && (
                <ShoppingBag className="h-3.5 w-3.5" />
              )}
              {cartState === "loading"
                ? "Adding..."
                : cartState === "success"
                ? "Added!"
                : "Add to Cart"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border bg-card overflow-hidden">
      <div className="aspect-square skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-20 skeleton rounded" />
        <div className="h-4 w-full skeleton rounded" />
        <div className="h-3 w-24 skeleton rounded" />
        <div className="h-4 w-16 skeleton rounded mt-1" />
        <div className="h-9 w-full skeleton rounded mt-3 pt-3 border-t border-border/50" />
      </div>
    </div>
  );
}
