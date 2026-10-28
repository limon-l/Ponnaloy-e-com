"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Save, Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useSeller } from "@/contexts/seller-context";
import { api, resolveMediaUrl, type ApiResponse } from "@/lib/api";

interface Storefront {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  banner: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  status: string;
}

export default function SellerStorefrontPage() {
  const { toast } = useToast();
  const { active, headers, loading: sellerLoading, refresh } = useSeller();
  const [storefront, setStorefront] = useState<Storefront | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    logo: "",
    banner: "",
    supportEmail: "",
    supportPhone: "",
  });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getWithHeaders<ApiResponse<Storefront>>("/api/seller/storefront", headers)
      .then((response) => {
        if (cancelled) return;
        setStorefront(response.data);
        setForm({
          name: response.data.name,
          description: response.data.description ?? "",
          logo: response.data.logo ?? "",
          banner: response.data.banner ?? "",
          supportEmail: response.data.supportEmail ?? "",
          supportPhone: response.data.supportPhone ?? "",
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load storefront."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, headers]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await api.putWithHeaders<ApiResponse<Storefront>>(
        "/api/seller/storefront",
        {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          logo: form.logo.trim() || undefined,
          banner: form.banner.trim() || undefined,
          supportEmail: form.supportEmail.trim() || undefined,
          supportPhone: form.supportPhone.trim() || undefined,
        },
        headers
      );
      setStorefront(response.data);
      await refresh();
      toast({
        title: "Storefront saved",
        description: "Public store details have been updated.",
        variant: "success",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save storefront.");
    } finally {
      setSaving(false);
    }
  };

  if (sellerLoading) {
    return <p className="text-muted-foreground">Loading seller workspace…</p>;
  }

  if (!active) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No store yet</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/seller/apply">Apply to become a seller</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading storefront…
      </p>
    );
  }

  const logoPreview = resolveMediaUrl(form.logo.trim() || undefined);
  const bannerPreview = resolveMediaUrl(form.banner.trim() || undefined);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Storefront</h1>
          <p className="text-muted-foreground">
            Public store identity shown on your marketplace storefront.
          </p>
        </div>
        {active.seller.status === "APPROVED" && (
          <Button asChild variant="outline">
            <Link href={`/sellers/${active.seller.slug}`} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              View public store
            </Link>
          </Button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Store details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storefront-name">Store name</Label>
                <Input
                  id="storefront-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                  minLength={2}
                  maxLength={120}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="storefront-description">Description</Label>
                <Textarea
                  id="storefront-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  maxLength={2000}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="storefront-logo">Logo URL</Label>
                  <Input
                    id="storefront-logo"
                    value={form.logo}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        logo: event.target.value,
                      }))
                    }
                    placeholder="https://… or /uploads/…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storefront-banner">Banner URL</Label>
                  <Input
                    id="storefront-banner"
                    value={form.banner}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        banner: event.target.value,
                      }))
                    }
                    placeholder="https://… or /uploads/…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storefront-email">Support email</Label>
                  <Input
                    id="storefront-email"
                    type="email"
                    value={form.supportEmail}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        supportEmail: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storefront-phone">Support phone</Label>
                  <Input
                    id="storefront-phone"
                    value={form.supportPhone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        supportPhone: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save storefront
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <div className="h-24 bg-muted">
                {bannerPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bannerPreview}
                    alt="Store banner preview"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="p-4">
                <div className="mb-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border bg-background">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoPreview}
                      alt="Store logo preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Store className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <p className="font-semibold">{form.name || "Your store"}</p>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                  {form.description || "Add a description customers will see."}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Status: {storefront?.status ?? active.seller.status}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
