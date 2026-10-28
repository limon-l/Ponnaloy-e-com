"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  X,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { cn, formatPrice } from "@/lib/utils";

type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

interface ModerationProduct {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  status: string;
  moderationStatus: ModerationStatus | null;
  moderationNote: string | null;
  createdAt: string;
  images: Array<{ id: string; url: string; alt: string | null }>;
  category: { id: string; name: string } | null;
  seller: { id: string; name: string; slug: string; status: string } | null;
  effectiveStock: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const moderationStyles: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
};

export default function AdminModerationPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<ModerationProduct[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [statusFilter, setStatusFilter] = useState<ModerationStatus>("PENDING");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviewTarget, setReviewTarget] = useState<ModerationProduct | null>(
    null
  );
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED">(
    "APPROVED"
  );
  const [reviewNote, setReviewNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        moderationStatus: statusFilter,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const response = await api.get<
        ApiResponse<ModerationProduct[]> & { pagination: Pagination }
      >(`/api/admin/products?${params.toString()}`);
      setProducts(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load moderation queue."
      );
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  const openReview = (
    product: ModerationProduct,
    action: "APPROVED" | "REJECTED"
  ) => {
    setReviewTarget(product);
    setReviewAction(action);
    setReviewNote(product.moderationNote ?? "");
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    if (reviewAction === "REJECTED" && !reviewNote.trim()) {
      toast({
        title: "A rejection reason is required",
        description: "Tell the seller what needs to change.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await api.put(`/api/admin/products/${reviewTarget.id}/moderation`, {
        status: reviewAction,
        note: reviewNote.trim() || undefined,
      });
      toast({
        title:
          reviewAction === "APPROVED" ? "Product published" : "Product rejected",
        description: `${reviewTarget.name} has been ${
          reviewAction === "APPROVED" ? "approved" : "sent back to the seller"
        }.`,
        variant: "success",
      });
      setReviewTarget(null);
      await load();
    } catch (err) {
      toast({
        title: "Could not update moderation status",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Catalogue moderation</h1>
        <p className="text-muted-foreground">
          Review seller submissions before they become visible to customers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>
              {loading
                ? "Loading…"
                : `${pagination.total} ${
                    statusFilter.toLowerCase()
                  } listing${pagination.total === 1 ? "" : "s"}`}
            </CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search product or SKU…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9 sm:w-64"
                  aria-label="Search moderation queue"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as ModerationStatus)
                }
              >
                <SelectTrigger className="w-[170px]" aria-label="Filter by moderation status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending review</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={load}
                disabled={loading}
                aria-label="Refresh moderation queue"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
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

          {loading ? (
            <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading listings…
            </p>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <ShieldCheck className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>Nothing is waiting in this queue.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => {
                const image = resolveMediaUrl(product.images[0]?.url);
                return (
                  <div
                    key={product.id}
                    className="flex flex-col gap-4 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Store className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{product.name}</p>
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
                          <Badge variant="outline">{product.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {product.seller ? (
                            <Link
                              href={`/sellers/${product.seller.slug}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 hover:text-primary"
                            >
                              {product.seller.name}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            "Platform product"
                          )}
                          {" · "}
                          {formatPrice(product.price)} · {product.effectiveStock}{" "}
                          in stock
                          {product.category ? ` · ${product.category.name}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted{" "}
                          {new Date(product.createdAt).toLocaleDateString()}
                          {product.sku ? ` · SKU ${product.sku}` : ""}
                        </p>
                        {product.moderationNote && (
                          <p className="mt-1 text-xs text-destructive">
                            Note: {product.moderationNote}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {product.moderationStatus !== "APPROVED" && (
                        <Button
                          size="sm"
                          onClick={() => openReview(product, "APPROVED")}
                        >
                          <Check className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                      )}
                      {product.moderationStatus !== "REJECTED" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openReview(product, "REJECTED")}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
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

      <Dialog
        open={reviewTarget !== null}
        onOpenChange={(open) => {
          if (!open && !saving) setReviewTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "APPROVED"
                ? "Approve listing"
                : "Reject listing"}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "APPROVED"
                ? `Publish “${reviewTarget?.name}”? It will become visible in the public catalogue immediately.`
                : `Reject “${reviewTarget?.name}”? The seller will see your reason and can resubmit.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="moderation-note">
              Review note {reviewAction === "REJECTED" && "(required)"}
            </Label>
            <Textarea
              id="moderation-note"
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewTarget(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant={reviewAction === "REJECTED" ? "destructive" : "default"}
              onClick={submitReview}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {reviewAction === "APPROVED" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
