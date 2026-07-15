"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice, calculateDiscount } from "@/lib/utils";
import type { ChatProduct } from "@/types";

interface ChatProductCardProps {
  product: ChatProduct;
  compact?: boolean;
}

export function ChatProductCard({ product, compact }: ChatProductCardProps) {
  const discount =
    product.discount ??
    calculateDiscount(product.price, product.compareAtPrice);

  return (
    <Link
      href={`/product/${product.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50",
        compact && "p-2"
      )}
    >
      {/* Image */}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-md bg-muted",
          compact ? "h-16 w-16" : "h-20 w-20"
        )}
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes={compact ? "64px" : "80px"}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No img
          </div>
        )}
        {discount > 0 && (
          <Badge
            variant="destructive"
            className="absolute top-0.5 left-0.5 text-[10px] px-1 py-0"
          >
            -{discount}%
          </Badge>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground">
            {product.brand}
            {product.brand && product.category && " · "}
            {product.category}
          </p>
          <h4
            className={cn(
              "font-medium leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2",
              compact ? "text-xs" : "text-sm"
            )}
          >
            {product.name}
          </h4>
          {product.shortDescription && !compact && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
              {product.shortDescription}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-semibold text-foreground",
                compact ? "text-xs" : "text-sm"
              )}
            >
              {formatPrice(product.price)}
            </span>
            {product.compareAtPrice &&
              product.compareAtPrice > product.price && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
          </div>

          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-primary text-primary" />
            <span className="text-xs text-muted-foreground">
              {product.avgRating.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[10px]",
              product.inStock ? "text-green-600" : "text-red-500"
            )}
          >
            {product.inStock ? "In Stock" : "Out of Stock"}
          </span>
          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </Link>
  );
}
