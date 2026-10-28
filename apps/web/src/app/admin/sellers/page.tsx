"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Loader2,
  RefreshCw,
  Search,
  Store,
  X,
  Percent,
  ShieldOff,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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

type Tab = "sellers" | "applications";

interface SellerRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  commissionRate: number;
  logo: string | null;
  approvedAt: string | null;
  suspendedAt: string | null;
  createdAt: string;
  owner: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  _count: { products: number; memberships: number };
  metrics: { grossSales: number; commission: number; orders: number };
}

interface ApplicationRow {
  id: string;
  businessName: string;
  contactEmail: string;
  status: string;
  reviewNote: string | null;
  submittedAt: string;
  sellerId: string | null;
  seller: { id: string; name: string; slug: string; status: string } | null;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusStyles: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  SUSPENDED: "bg-red-100 text-red-800 border-red-200",
  REJECTED: "bg-gray-100 text-gray-800 border-gray-200",
  SUBMITTED: "bg-blue-100 text-blue-800 border-blue-200",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-800 border-orange-200",
};

export default function AdminSellersPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("applications");
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviewTarget, setReviewTarget] = useState<ApplicationRow | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED">(
    "APPROVED"
  );
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const [commissionTarget, setCommissionTarget] = useState<SellerRow | null>(
    null
  );
  const [commissionRate, setCommissionRate] = useState("");
  const [commissionNote, setCommissionNote] = useState("");
  const [savingCommission, setSavingCommission] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [tab, statusFilter, debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "sellers") {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        const response = await api.get<
          ApiResponse<SellerRow[]> & { pagination: Pagination }
        >(`/api/admin/sellers?${params.toString()}`);
        setSellers(response.data);
        setPagination(response.pagination);
      } else {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
        });
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        const response = await api.get<
          ApiResponse<ApplicationRow[]> & { pagination: Pagination }
        >(`/api/admin/sellers/applications?${params.toString()}`);
        setApplications(response.data);
        setPagination(response.pagination);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load seller data."
      );
    } finally {
      setLoading(false);
    }
  }, [tab, page, debouncedSearch, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openReview = (
    application: ApplicationRow,
    action: "APPROVED" | "REJECTED"
  ) => {
    setReviewTarget(application);
    setReviewAction(action);
    setReviewNote("");
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    if (reviewAction === "REJECTED" && !reviewNote.trim()) {
      toast({
        title: "A rejection reason is required",
        description: "Tell the applicant what needs to change.",
        variant: "destructive",
      });
      return;
    }
    setReviewing(true);
    try {
      await api.put(`/api/admin/sellers/applications/${reviewTarget.id}/review`, {
        status: reviewAction,
        note: reviewNote.trim() || undefined,
      });
      toast({
        title:
          reviewAction === "APPROVED"
            ? "Seller approved"
            : "Application rejected",
        description: `${reviewTarget.businessName} has been updated.`,
        variant: "success",
      });
      setReviewTarget(null);
      await load();
    } catch (err) {
      toast({
        title: "Could not review application",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setReviewing(false);
    }
  };

  const updateStatus = async (seller: SellerRow, status: string) => {
    try {
      await api.put(`/api/admin/sellers/${seller.id}/status`, { status });
      toast({
        title: `Seller ${status.toLowerCase()}`,
        description: `${seller.name} is now ${status.toLowerCase()}.`,
        variant: "success",
      });
      await load();
    } catch (err) {
      toast({
        title: "Could not update seller",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const openCommission = (seller: SellerRow) => {
    setCommissionTarget(seller);
    setCommissionRate((seller.commissionRate / 100).toFixed(2));
    setCommissionNote("");
  };

  const saveCommission = async () => {
    if (!commissionTarget) return;
    const percent = Number(commissionRate);
    if (!Number.isFinite(percent) || percent < 0 || percent > 50) {
      toast({
        title: "Invalid commission",
        description: "Enter a rate between 0% and 50%.",
        variant: "destructive",
      });
      return;
    }
    setSavingCommission(true);
    try {
      await api.put(`/api/admin/sellers/${commissionTarget.id}/commission`, {
        commissionRate: Math.round(percent * 100),
        note: commissionNote.trim() || undefined,
      });
      toast({
        title: "Commission updated",
        description: `${commissionTarget.name} now pays ${percent}%.`,
        variant: "success",
      });
      setCommissionTarget(null);
      await load();
    } catch (err) {
      toast({
        title: "Could not update commission",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingCommission(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sellers</h1>
        <p className="text-muted-foreground">
          Review applications, activate stores, and manage marketplace
          commissions.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={tab === "applications" ? "default" : "outline"}
          onClick={() => {
            setTab("applications");
            setStatusFilter("ALL");
          }}
        >
          Applications
        </Button>
        <Button
          variant={tab === "sellers" ? "default" : "outline"}
          onClick={() => {
            setTab("sellers");
            setStatusFilter("ALL");
          }}
        >
          Seller directory
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>
              {loading
                ? "Loading…"
                : `${pagination.total} ${
                    tab === "sellers" ? "seller" : "application"
                  }${pagination.total === 1 ? "" : "s"}`}
            </CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {tab === "sellers" && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search store, slug, email…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="pl-9 sm:w-64"
                    aria-label="Search sellers"
                  />
                </div>
              )}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[170px]" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {tab === "sellers" ? (
                    <>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="SUBMITTED">Submitted</SelectItem>
                      <SelectItem value="UNDER_REVIEW">Under review</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="CHANGES_REQUESTED">
                        Changes requested
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={load}
                disabled={loading}
                aria-label="Refresh sellers"
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
              Loading…
            </p>
          ) : tab === "sellers" ? (
            sellers.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No sellers match these filters.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Store</th>
                      <th className="pb-3 font-medium">Owner</th>
                      <th className="pb-3 font-medium">Products</th>
                      <th className="pb-3 font-medium">Gross sales</th>
                      <th className="pb-3 font-medium">Commission</th>
                      <th className="pb-3 font-medium">Rate</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellers.map((seller) => {
                      const logo = resolveMediaUrl(seller.logo);
                      return (
                        <tr key={seller.id} className="border-b last:border-0">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-muted">
                                {logo ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={logo}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Store className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{seller.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  /{seller.slug}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {seller.owner.email}
                          </td>
                          <td className="py-3 pr-4">{seller._count.products}</td>
                          <td className="py-3 pr-4">
                            {formatPrice(seller.metrics.grossSales)}
                          </td>
                          <td className="py-3 pr-4">
                            {formatPrice(seller.metrics.commission)}
                          </td>
                          <td className="py-3 pr-4">
                            {(seller.commissionRate / 100).toFixed(2)}%
                          </td>
                          <td className="py-3 pr-4">
                            <Badge
                              variant="outline"
                              className={statusStyles[seller.status] ?? ""}
                            >
                              {seller.status}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              {seller.status === "APPROVED" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateStatus(seller, "SUSPENDED")}
                                >
                                  <ShieldOff className="mr-1 h-4 w-4" />
                                  Suspend
                                </Button>
                              )}
                              {seller.status === "SUSPENDED" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateStatus(seller, "APPROVED")}
                                >
                                  <ShieldCheck className="mr-1 h-4 w-4" />
                                  Reinstate
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCommission(seller)}
                              >
                                <Percent className="mr-1 h-4 w-4" />
                                Rate
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : applications.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No applications match these filters.
            </p>
          ) : (
            <div className="space-y-3">
              {applications.map((application) => (
                <div
                  key={application.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{application.businessName}</p>
                      <Badge
                        variant="outline"
                        className={statusStyles[application.status] ?? ""}
                      >
                        {application.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {application.user.email} · {application.contactEmail}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted{" "}
                      {new Date(application.submittedAt).toLocaleString()}
                    </p>
                    {application.reviewNote && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Note: {application.reviewNote}
                      </p>
                    )}
                  </div>
                  {["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"].includes(
                    application.status
                  ) && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => openReview(application, "APPROVED")}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openReview(application, "REJECTED")}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
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
          if (!open && !reviewing) setReviewTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "APPROVED"
                ? "Approve seller"
                : "Reject application"}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "APPROVED"
                ? `Approve ${reviewTarget?.businessName}? The store will be able to publish moderated products.`
                : `Reject ${reviewTarget?.businessName}? The applicant will see your reason.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="review-note">
              Review note {reviewAction === "REJECTED" && "(required)"}
            </Label>
            <Textarea
              id="review-note"
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
              disabled={reviewing}
            >
              Cancel
            </Button>
            <Button
              variant={reviewAction === "REJECTED" ? "destructive" : "default"}
              onClick={submitReview}
              disabled={reviewing}
            >
              {reviewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {reviewAction === "APPROVED" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={commissionTarget !== null}
        onOpenChange={(open) => {
          if (!open && !savingCommission) setCommissionTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commission rate</DialogTitle>
            <DialogDescription>
              Set the platform commission for {commissionTarget?.name}. Changes
              are recorded in the audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="commission-rate">Rate (%)</Label>
              <Input
                id="commission-rate"
                type="number"
                min="0"
                max="50"
                step="0.01"
                value={commissionRate}
                onChange={(event) => setCommissionRate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission-note">Note (optional)</Label>
              <Input
                id="commission-note"
                value={commissionNote}
                onChange={(event) => setCommissionNote(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCommissionTarget(null)}
              disabled={savingCommission}
            >
              Cancel
            </Button>
            <Button onClick={saveCommission} disabled={savingCommission}>
              {savingCommission && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
