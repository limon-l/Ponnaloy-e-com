"use client";

import { Check, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { ChatProduct } from "@/types";

interface ChatComparisonProps {
  products: ChatProduct[];
}

export function ChatComparison({ products }: ChatComparisonProps) {
  if (products.length < 2) return null;

  const allSpecs = new Set<string>();
  // We don't have specs in the basic product type, so we compare key fields

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="py-1.5 pr-2 text-left font-medium text-muted-foreground">
              Feature
            </th>
            {products.map((p) => (
              <th
                key={p.id}
                className="py-1.5 px-2 text-left font-medium text-foreground"
              >
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-dashed">
            <td className="py-1.5 pr-2 text-muted-foreground">Price</td>
            {products.map((p) => (
              <td key={p.id} className="py-1.5 px-2 font-medium">
                {formatPrice(p.price)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-dashed">
            <td className="py-1.5 pr-2 text-muted-foreground">Rating</td>
            {products.map((p) => (
              <td key={p.id} className="py-1.5 px-2">
                {p.avgRating.toFixed(1)} / 5 ({p.reviewCount})
              </td>
            ))}
          </tr>
          <tr className="border-b border-dashed">
            <td className="py-1.5 pr-2 text-muted-foreground">Category</td>
            {products.map((p) => (
              <td key={p.id} className="py-1.5 px-2">
                {p.category}
              </td>
            ))}
          </tr>
          <tr className="border-b border-dashed">
            <td className="py-1.5 pr-2 text-muted-foreground">Brand</td>
            {products.map((p) => (
              <td key={p.id} className="py-1.5 px-2">
                {p.brand}
              </td>
            ))}
          </tr>
          <tr className="border-b border-dashed">
            <td className="py-1.5 pr-2 text-muted-foreground">In Stock</td>
            {products.map((p) => (
              <td key={p.id} className="py-1.5 px-2">
                {p.inStock ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <X className="h-3.5 w-3.5 text-red-500" />
                )}
              </td>
            ))}
          </tr>
          <tr>
            <td className="py-1.5 pr-2 text-muted-foreground">Sold</td>
            {products.map((p) => (
              <td key={p.id} className="py-1.5 px-2">
                {p.totalSold.toLocaleString()}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
