"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  RefreshCw,
  Loader2,
  Truck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { api, type ApiResponse } from "@/lib/api";
import { formatDateTime, formatPrice } from "@/lib/utils";

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "RETURNED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED", "REFUNDED"],
  CANCELLED: [],
  RETURNED: ["REFUNDED"],
  REFUNDED: [],
};

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  total: number;
  variantId: string | null;
  product: { id: string; name: string } | null;
}

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  items: OrderItem[];
  payments: Array<{ id: string; status: string; method: string; amount: number }>;
  shipments: Array<{
    carrier: string | null;
    trackingNumber: string | null;
    status: string;
    actualDelivery: string | null;
  }>;
}

interface OrderDetail extends OrderSummary {
  tax: number;
  shippingAddress: Record<string, unknown>;
  billingAddress: Record<string, unknown> | null;
  statusHistory: Array<{
    id: string;
    status: OrderStatus;
    note: string | null;
    actorRole: string | null;
    createdAt: string;
  }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  PROCESSING: {
    label: "Processing",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  SHIPPED: {
    label: "Shipped",
    className: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  OUT_FOR_DELIVERY: {
    label: "Out for delivery",
    className: "bg-cyan-100 text-cyan-800 border-cyan-200",
  },
  DELIVERED: {
    label: "Delivered",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  RETURNED: {
    label: "Returned",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  REFUNDED: {
    label: "Refunded",
    className: "bg-gray-100 text-gray-800 border-gray-200",
  },
};

const paymentMethodLabels: Record<string, string> = {
  COD: "Cash on Delivery",
  BANK_TRANSFER: "Bank Transfer",
  STRIPE: "Card (Stripe)",
};

function customerName(order: OrderSummary): string {
  const name = [order.user?.firstName, order.user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || order.user?.email || "Guest";
}

function formatAddress(value: Record<string, unknown> | null): string[] {
  if (!value) return [];
  const fields = [
    value.fullName,
    value.addressLine1,
    value.addressLine2,
    [value.city, value.state, value.zipCode].filter(Boolean).join(", "),
    value.country,
    value.phone,
  ];
  return fields
    .filter((field): field is string => typeof field === "string" && field.length > 0)
    .map((field) => String(field));
}

function pageWindow(current: number, total: number): number[] {
  const size = Math.min(5, total);
  const start = Math.max(1, Math.min(current - 2, total - size + 1));
  return Array.from({ length: size }, (_, index) => start + index);
}

export default function AdminOrdersPage() {
  const { toast } = useToast();

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [saving, setSaving] = useState(false);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  // Honour deep links such as /admin/orders?status=CONFIRMED without requiring
  // a Suspense boundary for useSearchParams.
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("status");
    if (initial && (ORDER_STATUSES as readonly string[]).includes(initial)) {
      setStatusFilter(initial);
    }
  }, []);

  const loadOrders = useCallback(async () => {
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
        ApiResponse<OrderSummary[]> & { pagination: Pagination }
      >(`/api/admin/orders?${params.toString()}`);

      setOrders(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const loadDetail = useCallback(
    async (orderId: string) => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const response = await api.get<ApiResponse<OrderDetail>>(
          `/api/admin/orders/${orderId}`
        );
        setDetail(response.data);
        setNextStatus(response.data.status);
        setNote("");
        setTrackingNumber(
          response.data.shipments[0]?.trackingNumber ?? ""
        );
        setCarrier(response.data.shipments[0]?.carrier ?? "");
      } catch (err) {
        setDetailError(
          err instanceof Error ? err.message : "Could not load the order."
        );
      } finally {
        setDetailLoading(false);
      }
    },
    []
  );

  const viewOrder = (orderId: string) => {
    setDetailOpen(true);
    setDetail(null);
    loadDetail(orderId);
  };

  const handleRefund = async (paymentId: string, amount: number) => {
    if (!detail) return;
    const confirmed = window.confirm(
      `Refund ${formatPrice(amount)} to the customer via Stripe? This cannot be undone.`
    );
    if (!confirmed) return;

    setRefundingId(paymentId);
    setRefundError(null);
    try {
      await api.post(`/api/admin/payments/${paymentId}/refund`, {
        idempotencyKey: crypto.randomUUID(),
      });
      toast({
        title: "Refund submitted",
        description: "Stripe accepted the refund request.",
      });
      await loadDetail(detail.id);
      await loadOrders();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Refund failed.";
      setRefundError(message);
      toast({
        title: "Refund failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setRefundingId(null);
    }
  };

  const requiresForce =
    detail !== null &&
    nextStatus !== "" &&
    nextStatus !== detail.status &&
    !ALLOWED_TRANSITIONS[detail.status].includes(nextStatus);

  const handleUpdate = async () => {
    if (!detail || !nextStatus) return;

    if (nextStatus === detail.status) {
      toast({
        title: "No change",
        description: "Select a different status to save.",
        variant: "destructive",
      });
      return;
    }

    if (requiresForce && !note.trim()) {
      toast({
        title: "Note required",
        description:
          "This transition is outside the normal flow. Add a note explaining the override.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await api.put(`/api/admin/orders/${detail.id}`, {
        status: nextStatus,
        note: note.trim() || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
        carrier: carrier.trim() || undefined,
        force: requiresForce,
      });

      toast({
        title: "Order updated",
        description: `${detail.orderNumber} is now ${nextStatus.replaceAll(
          "_",
          " "
        )}.`,
        variant: "success",
      });

      await Promise.all([loadOrders(), loadDetail(detail.id)]);
    } catch (err) {
      toast({
        title: "Could not update order",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const pages = pageWindow(pagination.page, pagination.totalPages);
  const shippingLines = detail ? formatAddress(detail.shippingAddress) : [];
  const billingLines = detail ? formatAddress(detail.billingAddress) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground">
          Review orders, move them through fulfilment, and record shipment
          details. Every change is logged.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>
              {loading
                ? "Loading orders…"
                : `${pagination.total} order${
                    pagination.total === 1 ? "" : "s"
                  }`}
            </CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Order # or customer email…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9 sm:w-72"
                  aria-label="Search orders"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[170px]" aria-label="Filter by status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {ORDER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusConfig[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={loadOrders}
                disabled={loading}
                aria-label="Refresh orders"
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
                    Order #
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Customer
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Items
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Total
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Placed
                  </th>
                  <th className="pb-3 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && orders.length === 0 ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td colSpan={7} className="py-3">
                        <Skeleton className="h-10 w-full" />
                      </td>
                    </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <ShoppingCart className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      {debouncedSearch || statusFilter !== "ALL"
                        ? "No orders match these filters."
                        : "No orders have been placed yet."}
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const config = statusConfig[order.status];
                    const itemCount = order.items.reduce(
                      (sum, item) => sum + item.quantity,
                      0
                    );
                    return (
                      <tr key={order.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-mono text-xs font-medium">
                          {order.orderNumber}
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-medium">{customerName(order)}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.user?.email ?? "No account"}
                          </p>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {itemCount} {itemCount === 1 ? "item" : "items"}
                        </td>
                        <td className="py-3 pr-4 font-medium">
                          {formatPrice(order.total)}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className={config.className}>
                            {config.label}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatDateTime(order.createdAt)}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => viewOrder(order.id)}
                              aria-label={`View order ${order.orderNumber}`}
                            >
                              <Eye className="h-4 w-4" />
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order details</DialogTitle>
            <DialogDescription>
              {detail?.orderNumber ?? "Loading order…"}
            </DialogDescription>
          </DialogHeader>

          {detailError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {detailError}
            </div>
          )}

          {detailLoading || !detail ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{customerName(detail)}</p>
                  <p className="text-xs text-muted-foreground">
                    {detail.user?.email}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Placed</p>
                  <p className="font-medium">
                    {formatDateTime(detail.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current status</p>
                  <Badge
                    variant="outline"
                    className={statusConfig[detail.status].className}
                  >
                    {statusConfig[detail.status].label}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-sm font-medium">Shipping address</p>
                  {shippingLines.length > 0 ? (
                    <address className="text-sm not-italic text-muted-foreground">
                      {shippingLines.map((line, index) => (
                        <span key={index} className="block">
                          {line}
                        </span>
                      ))}
                    </address>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No shipping address recorded.
                    </p>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium">Billing address</p>
                  {billingLines.length > 0 ? (
                    <address className="text-sm not-italic text-muted-foreground">
                      {billingLines.map((line, index) => (
                        <span key={index} className="block">
                          {line}
                        </span>
                      ))}
                    </address>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Same as shipping address.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Items</p>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Product
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                          Qty
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                          Unit
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-3 py-2">
                            {item.product?.name ?? "Product removed"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatPrice(item.unitPrice)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatPrice(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(detail.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatPrice(detail.shippingFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(detail.tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-{formatPrice(detail.discount)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(detail.total)}</span>
                </div>
              </div>

              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="mb-1 font-medium">Payment</p>
                  {detail.payments.length === 0 ? (
                    <p className="text-muted-foreground">
                      No payment attempt recorded.
                    </p>
                  ) : (
                    detail.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="mb-1.5 flex flex-wrap items-center gap-2 text-muted-foreground"
                      >
                        <span>
                          {paymentMethodLabels[payment.method] ?? payment.method} ·{" "}
                          {payment.status} · {formatPrice(payment.amount)}
                        </span>
                        {payment.method === "STRIPE" &&
                          payment.status === "SUCCEEDED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              disabled={refundingId === payment.id}
                              onClick={() => handleRefund(payment.id, payment.amount)}
                            >
                              {refundingId === payment.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : null}
                              Refund via Stripe
                            </Button>
                          )}
                      </div>
                    ))
                  )}
                  {refundError && (
                    <p role="alert" className="mt-1 text-xs text-destructive">
                      {refundError}
                    </p>
                  )}
                </div>
                <div>
                  <p className="mb-1 font-medium">Shipment</p>
                  {detail.shipments.length === 0 ? (
                    <p className="text-muted-foreground">
                      Not shipped yet.
                    </p>
                  ) : (
                    detail.shipments.map((shipment, index) => (
                      <p
                        key={index}
                        className="flex items-center gap-1 text-muted-foreground"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        {shipment.carrier ?? "Carrier pending"}
                        {shipment.trackingNumber
                          ? ` · ${shipment.trackingNumber}`
                          : ""}
                        {` · ${shipment.status}`}
                      </p>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-md border p-4">
                <p className="mb-3 text-sm font-medium">Update status</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="order-status">New status</Label>
                    <Select
                      value={nextStatus || detail.status}
                      onValueChange={(value) =>
                        setNextStatus(value as OrderStatus)
                      }
                    >
                      <SelectTrigger id="order-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {statusConfig[status].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {requiresForce && (
                      <p className="text-xs text-yellow-700">
                        This is outside the normal flow and will be recorded as
                        a forced override. A note is required.
                      </p>
                    )}
                  </div>

                  {(nextStatus === "SHIPPED" ||
                    detail.status === "SHIPPED") && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="order-carrier">Carrier</Label>
                        <Input
                          id="order-carrier"
                          value={carrier}
                          onChange={(event) => setCarrier(event.target.value)}
                          placeholder="e.g. DHL"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="order-tracking">Tracking number</Label>
                        <Input
                          id="order-tracking"
                          value={trackingNumber}
                          onChange={(event) =>
                            setTrackingNumber(event.target.value)
                          }
                          placeholder="Tracking reference"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="order-note">
                      Note {requiresForce ? "(required)" : "(optional)"}
                    </Label>
                    <Textarea
                      id="order-note"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      rows={2}
                      placeholder="Reason or internal note for the audit log"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    onClick={handleUpdate}
                    disabled={saving || nextStatus === detail.status}
                  >
                    {saving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save status
                  </Button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">History</p>
                {detail.statusHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No status history recorded.
                  </p>
                ) : (
                  <ol className="space-y-2 text-sm">
                    {detail.statusHistory.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex flex-col gap-1 border-l-2 border-muted pl-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span>
                          <strong>
                            {statusConfig[entry.status].label}
                          </strong>
                          {entry.note ? ` — ${entry.note}` : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(entry.createdAt)}
                          {entry.actorRole ? ` · ${entry.actorRole}` : ""}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {detail.notes && (
                <div>
                  <p className="mb-1 text-sm font-medium">
                    Customer notes
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {detail.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
