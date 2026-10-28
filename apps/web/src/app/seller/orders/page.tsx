"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShoppingCart, RefreshCw, Package, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useSeller } from "@/contexts/seller-context";
import { api, resolveMediaUrl, type ApiResponse } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

interface SellerOrderSummary {
  id: string;
  status: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  commissionAmount: number;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    createdAt: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    total: number;
    product: {
      id: string;
      name: string;
      slug: string;
      sku: string | null;
      images: Array<{ id: string; url: string; alt: string | null; position: number }>;
    };
  }>;
  _count: { items: number };
}

interface SellerOrderDetail extends SellerOrderSummary {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    createdAt: string;
    notes: string | null;
    shippingAddress: Record<string, string>;
  };
  statusHistory: Array<{
    id: string;
    status: string;
    note: string | null;
    actorRole: string | null;
    createdAt: string;
  }>;
  shipments: Array<{
    id: string;
    carrier: string | null;
    trackingNumber: string | null;
    status: string;
    actualDelivery: string | null;
  }>;
}

const NEXT_STATUSES: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  PROCESSING: "bg-indigo-100 text-indigo-800 border-indigo-200",
  SHIPPED: "bg-cyan-100 text-cyan-800 border-cyan-200",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800 border-purple-200",
  DELIVERED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
};

const STATUS_OPTIONS = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SellerOrdersPage() {
  const { toast } = useToast();
  const { active, headers, loading: sellerLoading } = useSeller();

  const [orders, setOrders] = useState<SellerOrderSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<SellerOrderDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch]);

  const load = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const response = await api.getWithHeaders<
        ApiResponse<SellerOrderSummary[]> & { pagination: Pagination }
      >(`/api/seller/orders?${params.toString()}`, headers);
      setOrders(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [active, headers, page, statusFilter, debouncedSearch]);

  useEffect(() => {
    if (active?.seller.status === "APPROVED") void load();
  }, [load, active]);

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    setCarrier("");
    setTrackingNumber("");
    setNote("");
    try {
      const response = await api.getWithHeaders<ApiResponse<SellerOrderDetail>>(
        `/api/seller/orders/${id}`,
        headers
      );
      setDetail(response.data);
    } catch (err) {
      toast({
        title: "Could not load order",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!detail) return;
    setUpdating(true);
    try {
      await api.putWithHeaders(
        `/api/seller/orders/${detail.id}/status`,
        {
          status,
          note: note.trim() || undefined,
          carrier: carrier.trim() || undefined,
          trackingNumber: trackingNumber.trim() || undefined,
        },
        headers
      );
      toast({
        title: "Order updated",
        description: `Seller order moved to ${status.replace(/_/g, " ").toLowerCase()}.`,
        variant: "success",
      });
      setNote("");
      await load();
      const refreshed = await api.getWithHeaders<ApiResponse<SellerOrderDetail>>(
        `/api/seller/orders/${detail.id}`,
        headers
      );
      setDetail(refreshed.data);
    } catch (err) {
      toast({
        title: "Could not update order",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (sellerLoading) {
    return <p className="text-muted-foreground">Loading seller workspace…</p>;
  }

  if (!active || active.seller.status !== "APPROVED") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orders unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your store must be approved before you can process orders.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground">
          Fulfil only the items assigned to your store. Buyer details are shown
          for delivery purposes only.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>
              {loading
                ? "Loading…"
                : `${pagination.total} seller order${pagination.total === 1 ? "" : "s"}`}
            </CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                placeholder="Search order number…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="sm:w-56"
                aria-label="Search seller orders"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[170px]" aria-label="Filter by order status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "ALL" ? "All statuses" : status.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={load}
                disabled={loading}
                aria-label="Refresh orders"
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

          {loading && orders.length === 0 ? (
            <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading orders…
            </p>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <ShoppingCart className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No seller orders match these filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Order</th>
                    <th className="pb-3 font-medium">Items</th>
                    <th className="pb-3 font-medium">Total</th>
                    <th className="pb-3 font-medium">Commission</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{order.order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="py-3 pr-4">{order._count.items}</td>
                      <td className="py-3 pr-4">{formatPrice(order.total)}</td>
                      <td className="py-3 pr-4">
                        {formatPrice(order.commissionAmount)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant="outline"
                          className={statusStyles[order.status] ?? ""}
                        >
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetail(order.id)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detail ? detail.order.orderNumber : "Seller order"}
            </DialogTitle>
            <DialogDescription>
              Assigned items, delivery details, and fulfilment history.
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !detail ? (
            <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading order…
            </p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={statusStyles[detail.status] ?? ""}
                >
                  {detail.status.replace(/_/g, " ")}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Parent order status: {detail.order.status.replace(/_/g, " ")}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Truck className="h-4 w-4" /> Deliver to
                  </p>
                  <address className="text-sm not-italic text-muted-foreground">
                    {detail.order.shippingAddress?.fullName}
                    <br />
                    {detail.order.shippingAddress?.addressLine1}
                    {detail.order.shippingAddress?.addressLine2 && (
                      <>
                        <br />
                        {detail.order.shippingAddress.addressLine2}
                      </>
                    )}
                    <br />
                    {detail.order.shippingAddress?.city},{" "}
                    {detail.order.shippingAddress?.state}{" "}
                    {detail.order.shippingAddress?.zipCode}
                    <br />
                    {detail.order.shippingAddress?.country}
                  </address>
                  {detail.order.notes && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Buyer note: {detail.order.notes}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border p-3 text-sm">
                  <p className="mb-2 font-medium">Financials</p>
                  <div className="space-y-1 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Items</span>
                      <span>{formatPrice(detail.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>{formatPrice(detail.shippingFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount</span>
                      <span>-{formatPrice(detail.discount)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-foreground">
                      <span>Order total</span>
                      <span>{formatPrice(detail.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform commission</span>
                      <span>{formatPrice(detail.commissionAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Package className="h-4 w-4" /> Items assigned to you
                </p>
                <div className="divide-y rounded-lg border">
                  {detail.items.map((item) => {
                    const image = resolveMediaUrl(item.product.images[0]?.url);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 text-sm"
                      >
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={image}
                              alt={item.product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Qty {item.quantity} × {formatPrice(item.unitPrice)}
                          </p>
                        </div>
                        <span className="font-medium">
                          {formatPrice(item.total)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {detail.shipments.length > 0 && (
                <div className="rounded-lg border p-3 text-sm">
                  <p className="mb-1 font-medium">Shipment</p>
                  {detail.shipments.map((shipment) => (
                    <p key={shipment.id} className="text-muted-foreground">
                      {shipment.carrier ?? "Carrier pending"} ·{" "}
                      {shipment.trackingNumber ?? "No tracking"} ·{" "}
                      {shipment.status.replace(/_/g, " ")}
                    </p>
                  ))}
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-medium">History</p>
                <ol className="space-y-2 border-l pl-4 text-sm">
                  {detail.statusHistory.map((entry) => (
                    <li key={entry.id}>
                      <p className="font-medium">
                        {entry.status.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                        {entry.actorRole ? ` · ${entry.actorRole}` : ""}
                        {entry.note ? ` · ${entry.note}` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>

              {(NEXT_STATUSES[detail.status] ?? []).length > 0 && (
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium">Update fulfilment</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="carrier">Carrier</Label>
                      <Input
                        id="carrier"
                        value={carrier}
                        onChange={(event) => setCarrier(event.target.value)}
                        placeholder="DHL, UPS, local courier"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="tracking">Tracking number</Label>
                      <Input
                        id="tracking"
                        value={trackingNumber}
                        onChange={(event) =>
                          setTrackingNumber(event.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="status-note">Note (optional)</Label>
                    <Input
                      id="status-note"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(NEXT_STATUSES[detail.status] ?? []).map((status) => (
                      <Button
                        key={status}
                        variant={
                          status === "CANCELLED" ? "destructive" : "default"
                        }
                        size="sm"
                        onClick={() => updateStatus(status)}
                        disabled={updating}
                      >
                        {updating && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Mark {status.replace(/_/g, " ").toLowerCase()}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
