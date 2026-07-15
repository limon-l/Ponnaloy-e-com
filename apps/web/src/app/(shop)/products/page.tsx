"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCard, ProductCardSkeleton } from "@/components/product/product-card";
import { api } from "@/lib/api";
import type { Product } from "@/types";

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Rating", value: "rating" },
  { label: "Popular", value: "popular" },
];

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const currentSort = searchParams.get("sort") || "newest";
  const currentCategory = searchParams.get("category") || "";
  const currentSearch = searchParams.get("q") || "";
  const currentPage = parseInt(searchParams.get("page") || "1");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentSearch) params.set("q", currentSearch);
      if (currentCategory) params.set("categoryId", currentCategory);
      params.set("page", String(currentPage));
      params.set("limit", "20");

      // Map sort values
      const [sortField, sortOrder] = currentSort.split("_");
      if (sortField === "price") {
        params.set("sort", "price");
        params.set("order", sortOrder || "asc");
      } else if (sortField === "rating") {
        params.set("sort", "avgRating");
      } else if (sortField === "popular") {
        params.set("sort", "totalSold");
      } else if (sortField === "newest") {
        params.set("sort", "createdAt");
      } else {
        params.set("sort", currentSort);
      }

      const result = await api.get<{
        success: boolean;
        data: Product[];
        pagination: { totalPages: number };
      }>(`/api/products?${params.toString()}`);

      if (result.success) {
        setProducts(result.data);
        setTotalPages(result.pagination.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }, [currentSort, currentCategory, currentSearch, currentPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== "page") params.set("page", "1");
    router.push(`/products?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/products");
  };

  const hasActiveFilters = currentCategory || currentSearch;

  return (
    <div className="container py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {currentSearch
            ? `Search results for "${currentSearch}"`
            : currentCategory
            ? currentCategory.replace(/-/g, " ")
            : "All Products"}
        </h1>
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-3">
            {currentSearch && (
              <Badge variant="secondary" className="gap-1">
                Search: {currentSearch}
                <button onClick={() => updateParam("q", "")}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {currentCategory && (
              <Badge variant="secondary" className="gap-1">
                {currentCategory.replace(/-/g, " ")}
                <button onClick={() => updateParam("category", "")}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading..." : `${products.length} products`}
          </p>
        </div>

        <Select
          value={currentSort}
          onValueChange={(value) => updateParam("sort", value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg text-muted-foreground">No products found</p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }).map((_, i) => (
            <Button
              key={i}
              variant={currentPage === i + 1 ? "default" : "outline"}
              size="sm"
              onClick={() => updateParam("page", String(i + 1))}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
