"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Loader2, Search, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, resolveMediaUrl, type ApiResponse } from "@/lib/api";

interface StorefrontSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  banner: string | null;
  approvedAt: string | null;
  productCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SellersPage() {
  const [sellers, setSellers] = useState<StorefrontSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });
    if (debouncedSearch) params.set("search", debouncedSearch);

    api
      .get<ApiResponse<StorefrontSummary[]> & { pagination: Pagination }>(
        `/api/sellers?${params.toString()}`
      )
      .then((response) => {
        if (cancelled) return;
        setSellers(response.data);
        setPagination(response.pagination);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load sellers."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch]);

  return (
    <div className="container py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Marketplace</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Shop trusted sellers
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Independent stores vetted by Ponnaloy. Every listing is moderated
            before it reaches the catalogue.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search stores…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
            aria-label="Search seller stores"
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {loading ? (
        <p className="flex items-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading stores…
        </p>
      ) : sellers.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">No stores found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {debouncedSearch
              ? "Try a different search term."
              : "Approved seller storefronts will appear here."}
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/seller/apply">Become a seller</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sellers.map((seller) => {
            const logo = resolveMediaUrl(seller.logo);
            const banner = resolveMediaUrl(seller.banner);
            return (
              <Link
                key={seller.id}
                href={`/sellers/${seller.slug}`}
                className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg"
              >
                <div className="relative h-32 bg-muted">
                  {banner ? (
                    <Image
                      src={banner}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                      <Store className="h-8 w-8 text-primary/50" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-muted -mt-9 shadow">
                      {logo ? (
                        <Image
                          src={logo}
                          alt={seller.name}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Store className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold">{seller.name}</h2>
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        {seller.productCount} product
                        {seller.productCount === 1 ? "" : "s"}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
                    {seller.description ||
                      "Browse this seller's moderated catalogue."}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Visit store
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={pagination.page === 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((value) => Math.min(pagination.totalPages, value + 1))
              }
              disabled={pagination.page === pagination.totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
