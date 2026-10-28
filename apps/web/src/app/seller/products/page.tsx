"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Package,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useSeller } from "@/contexts/seller-context";
import { api, resolveMediaUrl, type ApiResponse } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

interface SellerProduct {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  status: ProductStatus;
  moderationStatus: ModerationStatus | null;
  moderationNote: string | null;
  shortDescription: string | null;
  description: string | null;
  images: Array<{ id: string; url: string; alt: string | null; position: number }>;
  category: { id: string; name: string } | null;
  _count: { orderItems: number; reviews: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FormState {
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  status: "DRAFT" | "ACTIVE";
  imageUrl: string;
  shortDescription: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  sku: "",
  price: "",
  compareAtPrice: "",
  stock: "0",
  status: "DRAFT",
  imageUrl: "",
  shortDescription: "",
  description: "",
};

const moderationStyles: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
};

function toCents(value: string): number | null {
  const parsed = Number(value.trim());
  if (!value.trim() || !Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

export default function SellerProductsPage() {
  const { toast } = useToast();
  const { active, headers, loading: sellerLoading } = useSeller();

  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [moderationFilter, setModerationFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SellerProduct | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<SellerProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, moderationFilter]);

  const load = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (moderationFilter !== "ALL") {
        params.set("moderationStatus", moderationFilter);
      }
      const response = await api.getWithHeaders<
        ApiResponse<SellerProduct[]> & { pagination: Pagination }
      >(`/api/seller/products?${params.toString()}`, headers);
      setProducts(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load products.");
    } finally {
      setLoading(false);
    }
  }, [active, headers, page, debouncedSearch, statusFilter, moderationFilter]);

  useEffect(() => {
    if (active?.seller.status === "APPROVED") void load();
  }, [load, active]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (product: SellerProduct) => {
    setEditing(product);
    setForm({
      name: product.name,
      sku: product.sku ?? "",
      price: (product.price / 100).toFixed(2),
      compareAtPrice: product.compareAtPrice
        ? (product.compareAtPrice / 100).toFixed(2)
        : "",
      stock: String(product.stock),
      status: product.status === "ACTIVE" ? "ACTIVE" : "DRAFT",
      imageUrl: product.images[0]?.url ?? "",
      shortDescription: product.shortDescription ?? "",
      description: product.description ?? "",
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const name = form.name.trim();
    const price = toCents(form.price);
    const stock = Number(form.stock);

    if (!name) {
      setFormError("Product name is required.");
      return;
    }
    if (price === null) {
      setFormError("Enter a valid price of 0 or more.");
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setFormError("Stock must be a whole number of 0 or more.");
      return;
    }

    let compareAtPrice: number | undefined;
    if (form.compareAtPrice.trim()) {
      const parsed = toCents(form.compareAtPrice);
      if (parsed === null) {
        setFormError("Enter a valid compare-at price.");
        return;
      }
      compareAtPrice = parsed;
    }

    const payload = {
      name,
      sku: form.sku.trim() || undefined,
      price,
      compareAtPrice,
      stock,
      status: form.status,
      shortDescription: form.shortDescription.trim() || undefined,
      description: form.description.trim() || undefined,
      images: form.imageUrl.trim()
        ? [{ url: form.imageUrl.trim(), alt: name, position: 0 }]
        : [],
    };

    setSaving(true);
    try {
      if (editing) {
        await api.putWithHeaders(
          `/api/seller/products/${editing.id}`,
          payload,
          headers
        );
        toast({
          title: "Product updated",
          description: "Material changes return the listing to moderation.",
          variant: "success",
        });
      } else {
        await api.postWithHeaders("/api/seller/products", payload, headers);
        toast({
          title: "Product submitted",
          description: "An administrator will review it before publication.",
          variant: "success",
        });
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not save the product."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await api.deleteWithHeaders<{
        success: boolean;
        archived?: boolean;
        message?: string;
      }>(`/api/seller/products/${deleteTarget.id}`, headers);
      toast({
        title: response.archived ? "Product archived" : "Product removed",
        description:
          response.message ??
          (response.archived
            ? "It is referenced by orders, so it was archived."
            : "The draft was deleted."),
        variant: "success",
      });
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast({
        title: "Could not remove product",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const imagePreview = useMemo(
    () => resolveMediaUrl(form.imageUrl.trim() || undefined),
    [form.imageUrl]
  );

  if (sellerLoading) {
    return <p className="text-muted-foreground">Loading seller workspace…</p>;
  }

  if (!active || active.seller.status !== "APPROVED") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Products unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your store must be approved before you can manage products.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            Create listings, manage stock, and submit changes for moderation.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <CardTitle>
              {loading ? "Loading…" : `${pagination.total} product${pagination.total === 1 ? "" : "s"}`}
            </CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name or SKU…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9 sm:w-56"
                  aria-label="Search seller products"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" aria-label="Filter by listing status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All listings</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={moderationFilter} onValueChange={setModerationFilter}>
                <SelectTrigger className="w-[150px]" aria-label="Filter by moderation status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All moderation</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={load}
                disabled={loading}
                aria-label="Refresh products"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading && products.length === 0 ? (
            <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading products…
            </p>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Package className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No products match these filters.</p>
              <Button className="mt-4" onClick={openCreate}>
                Create your first product
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Product</th>
                    <th className="pb-3 font-medium">Price</th>
                    <th className="pb-3 font-medium">Stock</th>
                    <th className="pb-3 font-medium">Listing</th>
                    <th className="pb-3 font-medium">Moderation</th>
                    <th className="pb-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const image = resolveMediaUrl(product.images[0]?.url);
                    return (
                      <tr key={product.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-muted">
                              {image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={image}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <Package className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.sku ? `SKU ${product.sku}` : product.slug}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">{formatPrice(product.price)}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={
                              product.stock === 0
                                ? "font-medium text-red-600"
                                : product.stock < 10
                                  ? "font-medium text-yellow-600"
                                  : ""
                            }
                          >
                            {product.stock}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline">{product.status}</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant="outline"
                            className={
                              product.moderationStatus
                                ? moderationStyles[product.moderationStatus]
                                : ""
                            }
                          >
                            {product.moderationStatus ?? "PLATFORM"}
                          </Badge>
                          {product.moderationNote && (
                            <p className="mt-1 max-w-[180px] text-xs text-destructive">
                              {product.moderationNote}
                            </p>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(product)}
                              aria-label={`Edit ${product.name}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(product)}
                              aria-label={`Remove ${product.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
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
                    setPage((value) =>
                      Math.min(pagination.totalPages, value + 1)
                    )
                  }
                  disabled={pagination.page === pagination.totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
            <DialogDescription>
              New and materially edited listings are reviewed by an
              administrator before they go live.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {formError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="seller-product-name">Name</Label>
              <Input
                id="seller-product-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                required
                maxLength={255}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="seller-product-sku">SKU</Label>
                <Input
                  id="seller-product-sku"
                  value={form.sku}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sku: event.target.value }))
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seller-product-stock">Stock</Label>
                <Input
                  id="seller-product-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, stock: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seller-product-price">Price (USD)</Label>
                <Input
                  id="seller-product-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, price: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seller-product-compare">Compare-at price</Label>
                <Input
                  id="seller-product-compare"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.compareAtPrice}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      compareAtPrice: event.target.value,
                    }))
                  }
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seller-product-image">Primary image URL</Label>
              <Input
                id="seller-product-image"
                value={form.imageUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    imageUrl: event.target.value,
                  }))
                }
                placeholder="https://… or /uploads/…"
              />
              {imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="mt-2 h-20 w-20 rounded-md border object-cover"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="seller-product-short">Short description</Label>
              <Textarea
                id="seller-product-short"
                value={form.shortDescription}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    shortDescription: event.target.value,
                  }))
                }
                maxLength={500}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seller-product-description">Description</Label>
              <Textarea
                id="seller-product-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seller-product-status">Listing intent</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    status: value as "DRAFT" | "ACTIVE",
                  }))
                }
              >
                <SelectTrigger id="seller-product-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Keep as draft</SelectItem>
                  <SelectItem value="ACTIVE">Submit for publication</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Submit product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove product</DialogTitle>
            <DialogDescription>
              Remove “{deleteTarget?.name}”? Products referenced by orders are
              archived so order history stays intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
