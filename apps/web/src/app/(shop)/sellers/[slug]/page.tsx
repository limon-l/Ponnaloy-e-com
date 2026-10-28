"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/product/product-card";
import { api, resolveMediaUrl, type ApiResponse } from "@/lib/api";
import type { Product } from "@/types";

interface SellerStorefront {
  seller: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logo: string | null;
    banner: string | null;
    supportEmail: string | null;
    supportPhone: string | null;
    policies: Record<string, string> | null;
    approvedAt: string | null;
    createdAt: string;
  };
  products: Product[];
}

export default function SellerStorefrontPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [data, setData] = useState<SellerStorefront | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<ApiResponse<SellerStorefront>>(`/api/sellers/${slug}`)
      .then((response) => {
        if (!cancelled) setData(response.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Store not found.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="container py-16">
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading store…
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container py-16 text-center">
        <Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Store unavailable</h1>
        <p className="mt-2 text-muted-foreground">
          {error ?? "This storefront is not currently available."}
        </p>
        <Button asChild className="mt-6">
          <Link href="/sellers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Browse sellers
          </Link>
        </Button>
      </div>
    );
  }

  const { seller, products } = data;
  const banner = resolveMediaUrl(seller.banner);
  const logo = resolveMediaUrl(seller.logo);
  const policies = seller.policies
    ? Object.entries(seller.policies).filter(([, value]) => Boolean(value))
    : [];

  return (
    <div className="pb-16">
      <div className="relative h-48 w-full bg-muted sm:h-64">
        {banner ? (
          <Image
            src={banner}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
        )}
      </div>

      <div className="container">
        <div className="relative -mt-12 rounded-xl border bg-card p-5 shadow-sm sm:-mt-16 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted shadow sm:h-24 sm:w-24">
                {logo ? (
                  <Image
                    src={logo}
                    alt={seller.name}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Store className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold sm:text-3xl">
                    {seller.name}
                  </h1>
                  <Badge
                    variant="outline"
                    className="border-green-200 bg-green-100 text-green-800"
                  >
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Verified seller
                  </Badge>
                </div>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {seller.description ||
                    "This seller has not added a description yet."}
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {seller.supportEmail && (
                    <a
                      href={`mailto:${seller.supportEmail}`}
                      className="inline-flex items-center gap-1.5 hover:text-primary"
                    >
                      <Mail className="h-4 w-4" />
                      {seller.supportEmail}
                    </a>
                  )}
                  {seller.supportPhone && (
                    <a
                      href={`tel:${seller.supportPhone}`}
                      className="inline-flex items-center gap-1.5 hover:text-primary"
                    >
                      <Phone className="h-4 w-4" />
                      {seller.supportPhone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <Button asChild variant="outline">
              <Link href="/sellers">
                <ArrowLeft className="mr-2 h-4 w-4" />
                All sellers
              </Link>
            </Button>
          </div>
        </div>

        {policies.length > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {policies.map(([key, value]) => (
              <div key={key} className="rounded-lg border bg-card p-4">
                <p className="text-sm font-medium capitalize">
                  {key.replace(/([A-Z])/g, " $1")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold">Products from {seller.name}</h2>
              <p className="text-sm text-muted-foreground">
                {products.length} moderated listing
                {products.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="rounded-xl border border-dashed py-16 text-center">
              <Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                This store has no published products yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
