"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  Loader2,
  Upload,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api, resolveMediaUrl, type ApiResponse } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

type ProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";

interface ProductImage {
  url: string;
  alt?: string | null;
  position: number;
}

interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  effectiveStock: number;
  status: ProductStatus;
  shortDescription: string | null;
  description: string | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  images: ProductImage[];
  variants: Array<{ id: string; name: string; stock: number }>;
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  _count: { variants: number; reviews: number };
}

interface CategoryNode {
  id: string;
  name: string;
  children?: CategoryNode[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ProductFormState {
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  status: ProductStatus;
  categoryId: string;
  imageUrl: string;
  shortDescription: string;
  description: string;
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  sku: "",
  price: "",
  compareAtPrice: "",
  stock: "0",
  status: "DRAFT",
  categoryId: "",
  imageUrl: "",
  shortDescription: "",
  description: "",
  isFeatured: false,
  isTrending: false,
  isNewArrival: false,
};

const statusConfig: Record<ProductStatus, { label: string; className: string }> = {
  ACTIVE: {
    label: "Active",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  DRAFT: {
    label: "Draft",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  ARCHIVED: {
    label: "Archived",
    className: "bg-gray-100 text-gray-800 border-gray-200",
  },
};

function toCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function toDollarInput(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toFixed(2);
}

function flattenCategories(nodes: CategoryNode[], depth = 0): Array<{ id: string; label: string }> {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${"— ".repeat(depth)}${node.name}` },
    ...flattenCategories(node.children ?? [], depth + 1),
  ]);
}

function pageWindow(current: number, total: number): number[] {
  const size = Math.min(5, total);
  const start = Math.max(1, Math.min(current - 2, total - size + 1));
  return Array.from({ length: size }, (_, index) => start + index);
}

export default function AdminProductsPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [categories, setCategories] = useState<Array<{ id: string; label: string }>>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const response = await api.get<
        ApiResponse<AdminProduct[]> & { pagination: Pagination }
      >(`/api/admin/products?${params.toString()}`);

      setProducts(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load products."
      );
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    api
      .get<ApiResponse<CategoryNode[]>>("/api/categories")
      .then((response) =>
        setCategories(flattenCategories(response.data ?? []))
      )
      .catch(() => {
        // Categories are optional for product creation; the API still validates
        // any categoryId that is submitted.
        setCategories([]);
      });
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (product: AdminProduct) => {
    setEditing(product);
    setForm({
      name: product.name,
      sku: product.sku ?? "",
      price: toDollarInput(product.price),
      compareAtPrice: toDollarInput(product.compareAtPrice),
      stock: String(product.effectiveStock),
      status: product.status,
      categoryId: product.categoryId ?? "",
      imageUrl: product.images[0]?.url ?? "",
      shortDescription: product.shortDescription ?? "",
      description: product.description ?? "",
      isFeatured: product.isFeatured,
      isTrending: product.isTrending,
      isNewArrival: product.isNewArrival,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setFormError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await api.upload<{
        success: boolean;
        data: { url: string };
      }>("/api/upload", body);
      setForm((current) => ({ ...current, imageUrl: response.data.url }));
      toast({
        title: "Image uploaded",
        description: "It will be attached when you save the product.",
        variant: "success",
      });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Image upload failed."
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const buildImages = (): ProductImage[] => {
    const url = form.imageUrl.trim();
    if (!url) return [];
    if (editing) {
      const unchanged = editing.images[0]?.url === url;
      if (unchanged) {
        return editing.images.map((image, index) => ({
          url: image.url,
          alt: image.alt ?? form.name.trim(),
          position: index,
        }));
      }
      // Replace the primary image but preserve additional gallery images.
      return [
        { url, alt: form.name.trim(), position: 0 },
        ...editing.images.slice(1).map((image, index) => ({
          url: image.url,
          alt: image.alt ?? form.name.trim(),
          position: index + 1,
        })),
      ];
    }
    return [{ url, alt: form.name.trim(), position: 0 }];
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const name = form.name.trim();
    if (!name) {
      setFormError("Product name is required.");
      return;
    }

    const price = toCents(form.price);
    if (price === null) {
      setFormError("Enter a valid price of 0 or more.");
      return;
    }

    const stock = Number(form.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      setFormError("Stock must be a whole number of 0 or more.");
      return;
    }

    let compareAtPrice: number | null = null;
    if (form.compareAtPrice.trim()) {
      compareAtPrice = toCents(form.compareAtPrice);
      if (compareAtPrice === null) {
        setFormError("Enter a valid compare-at price.");
        return;
      }
    }

    const payload = {
      name,
      sku: form.sku.trim() || undefined,
      price,
      stock,
      status: form.status,
      categoryId: form.categoryId || null,
      shortDescription: form.shortDescription.trim() || undefined,
      description: form.description.trim() || undefined,
      compareAtPrice: compareAtPrice ?? undefined,
      isFeatured: form.isFeatured,
      isTrending: form.isTrending,
      isNewArrival: form.isNewArrival,
      images: buildImages(),
    };

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/api/products/${editing.id}`, payload);
        toast({
          title: "Product updated",
          description: `“${name}” has been saved.`,
          variant: "success",
        });
      } else {
        await api.post("/api/products", payload);
        toast({
          title: "Product created",
          description: `“${name}” is now in the catalogue.`,
          variant: "success",
        });
      }
      setDialogOpen(false);
      await loadProducts();
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
      const response = await api.delete<{
        success: boolean;
        archived?: boolean;
        message?: string;
      }>(`/api/products/${deleteTarget.id}`);

      toast({
        title: response.archived ? "Product archived" : "Product deleted",
        description:
          response.message ??
          (response.archived
            ? "It is referenced by existing records, so it was archived."
            : "The product was removed from the catalogue."),
        variant: "success",
      });
      setDeleteTarget(null);
      await loadProducts();
    } catch (err) {
      toast({
        title: "Could not remove product",
        description:
          err instanceof Error ? err.message : "Please try again.",
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

  const pages = pageWindow(pagination.page, pagination.totalPages);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            Create, edit, and retire catalogue items. Changes are saved to the
            store database immediately.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>
              {loading
                ? "Loading products…"
                : `${pagination.total} product${
                    pagination.total === 1 ? "" : "s"
                  }`}
            </CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name or SKU…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9 sm:w-64"
                  aria-label="Search products"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[150px]" aria-label="Filter by status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={loadProducts}
                disabled={loading}
                aria-label="Refresh products"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
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

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Image
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Product
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Category
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Price
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Stock
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="pb-3 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && products.length === 0 ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td colSpan={7} className="py-3">
                        <Skeleton className="h-10 w-full" />
                      </td>
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <Package className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      {debouncedSearch || statusFilter !== "ALL"
                        ? "No products match these filters."
                        : "No products yet. Create your first product."}
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const config = statusConfig[product.status];
                    const image = resolveMediaUrl(product.images[0]?.url);
                    return (
                      <tr key={product.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">
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
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.sku ? `SKU: ${product.sku}` : "No SKU"}
                            {product._count.variants > 0 &&
                              ` · ${product._count.variants} variants`}
                          </p>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {product.category?.name ?? "Uncategorised"}
                        </td>
                        <td className="py-3 pr-4">{formatPrice(product.price)}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={
                              product.effectiveStock === 0
                                ? "font-medium text-red-600"
                                : product.effectiveStock < 10
                                  ? "font-medium text-yellow-600"
                                  : ""
                            }
                          >
                            {product.effectiveStock}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className={config.className}>
                            {config.label}
                          </Badge>
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
                              aria-label={`Delete ${product.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={pagination.page === 1 || loading}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {pages.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === pagination.page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNumber)}
                    className="h-8 w-8 p-0"
                    disabled={loading}
                  >
                    {pageNumber}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pagination.totalPages, current + 1)
                    )
                  }
                  disabled={pagination.page === pagination.totalPages || loading}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit product" : "New product"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Changes are written to the live catalogue."
                : "Create a catalogue item. It can stay in draft until it is ready."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {formError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="product-name">Name</Label>
                <Input
                  id="product-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-sku">SKU</Label>
                <Input
                  id="product-sku"
                  value={form.sku}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sku: event.target.value,
                    }))
                  }
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-category">Category</Label>
                <Select
                  value={form.categoryId || "none"}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      categoryId: value === "none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger id="product-category">
                    <SelectValue placeholder="Uncategorised" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorised</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-price">Price (USD)</Label>
                <Input
                  id="product-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      price: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-compare-price">
                  Compare-at price (USD)
                </Label>
                <Input
                  id="product-compare-price"
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

              <div className="space-y-2">
                <Label htmlFor="product-stock">Stock</Label>
                <Input
                  id="product-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      stock: event.target.value,
                    }))
                  }
                  required
                />
                {editing && editing.variants.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    This product has {editing.variants.length} variants. The
                    storefront uses variant stock; the value here is the
                    product-level fallback.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      status: value as ProductStatus,
                    }))
                  }
                >
                  <SelectTrigger id="product-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-image">Primary image</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="product-image"
                  value={form.imageUrl}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      imageUrl: event.target.value,
                    }))
                  }
                  placeholder="https://… or /uploads/…"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload
                </Button>
              </div>
              {imagePreview && (
                <div className="mt-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="h-20 w-20 rounded-md border object-cover"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setForm((current) => ({ ...current, imageUrl: "" }))
                    }
                  >
                    Remove image
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-short-description">
                Short description
              </Label>
              <Textarea
                id="product-short-description"
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
              <Label htmlFor="product-description">Description</Label>
              <Textarea
                id="product-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={5}
              />
            </div>

            <div className="flex flex-wrap gap-5">
              {[
                { key: "isFeatured" as const, label: "Featured" },
                { key: "isTrending" as const, label: "Trending" },
                { key: "isNewArrival" as const, label: "New arrival" },
              ].map((option) => (
                <div key={option.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`product-${option.key}`}
                    checked={form[option.key]}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        [option.key]: checked === true,
                      }))
                    }
                  />
                  <Label htmlFor={`product-${option.key}`} className="font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
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
              <Button type="submit" disabled={saving || uploading}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Create product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
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
              Remove “{deleteTarget?.name}”? Products referenced by past orders
              or reviews are archived instead of deleted so order history stays
              intact.
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
