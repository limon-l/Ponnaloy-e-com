"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Truck,
  CheckCircle2,
  Loader2,
  Store,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSeller } from "@/contexts/seller-context";
import { api, type ApiResponse } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

interface DashboardData {
  grossSales: number;
  netSales: number;
  commission: number;
  netEarnings: number;
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  activeProducts: number;
  lowStockProducts: number;
  statusCounts: Record<string, number>;
  recentOrders: Array<{
    id: string;
    status: string;
    total: number;
    createdAt: string;
    order: { orderNumber: string };
    _count: { items: number };
  }>;
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  PROCESSING: "bg-indigo-100 text-indigo-800 border-indigo-200",
  SHIPPED: "bg-cyan-100 text-cyan-800 border-cyan-200",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800 border-purple-200",
  DELIVERED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function SellerDashboardPage() {
  const { active, memberships, loading: sellerLoading, headers } = useSeller();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || active.seller.status !== "APPROVED") {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getWithHeaders<ApiResponse<DashboardData>>(
        "/api/seller/dashboard",
        headers
      )
      .then((response) => {
        if (!cancelled) setData(response.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load dashboard.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, headers]);

  const chart = useMemo(() => {
    if (!data) return [];
    const recent = data.revenueByDay.slice(-14);
    const max = Math.max(1, ...recent.map((day) => day.revenue));
    return recent.map((day) => ({
      ...day,
      height: Math.max(2, Math.round((day.revenue / max) * 100)),
    }));
  }, [data]);

  if (sellerLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading seller workspace…
      </div>
    );
  }

  if (!active) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Start selling on Ponnaloy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {memberships.length === 0
                ? "You do not have a seller organization yet. Submit an application to open your storefront."
                : "Select a store to continue."}
            </p>
            <Button asChild>
              <Link href="/seller/apply">Open seller application</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (active.seller.status !== "APPROVED") {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Store not active yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {active.seller.name} is currently{" "}
              <strong>{active.seller.status.toLowerCase()}</strong>. You can
              review your application status, but the dashboard becomes
              available once an administrator approves the store.
            </p>
            <Button asChild variant="outline">
              <Link href="/seller/apply">View application status</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading store metrics…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error ?? "Dashboard data is unavailable."}
      </div>
    );
  }

  const kpis = [
    {
      label: "Gross sales",
      value: formatPrice(data.grossSales),
      icon: DollarSign,
      hint: "Item subtotal, excluding cancelled orders",
    },
    {
      label: "Net earnings",
      value: formatPrice(data.netEarnings),
      icon: TrendingUp,
      hint: "After platform commission",
    },
    {
      label: "Orders",
      value: String(data.totalOrders),
      icon: ShoppingCart,
      hint: `${data.pendingOrders} awaiting action`,
    },
    {
      label: "Active products",
      value: String(data.activeProducts),
      icon: Package,
      hint: `${data.lowStockProducts} low on stock`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{active.seller.name}</h1>
        <p className="text-muted-foreground">
          Store performance, fulfilment queue, and earnings at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
                </div>
                <kpi.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue, last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="flex h-48 items-end gap-1.5"
              role="img"
              aria-label="Bar chart of daily revenue for the last 14 days"
            >
              {chart.map((day) => (
                <div
                  key={day.date}
                  className="group relative flex flex-1 flex-col items-center justify-end"
                  title={`${day.date}: ${formatPrice(day.revenue)} (${day.orders} orders)`}
                >
                  <div
                    className="w-full rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
                    style={{ height: `${day.height}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{chart[0]?.date}</span>
              <span>{chart[chart.length - 1]?.date}</span>
            </div>
            <table className="sr-only">
              <caption>Daily revenue</caption>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Revenue</th>
                  <th>Orders</th>
                </tr>
              </thead>
              <tbody>
                {chart.map((day) => (
                  <tr key={day.date}>
                    <td>{day.date}</td>
                    <td>{formatPrice(day.revenue)}</td>
                    <td>{day.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fulfilment queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Awaiting action", value: data.pendingOrders, icon: AlertTriangle },
              { label: "Processing", value: data.processingOrders, icon: Package },
              { label: "In transit", value: data.shippedOrders, icon: Truck },
              { label: "Delivered", value: data.deliveredOrders, icon: CheckCircle2 },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <row.icon className="h-4 w-4" />
                  {row.label}
                </span>
                <span className="font-semibold">{row.value}</span>
              </div>
            ))}
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground">
                Commission accrued: {formatPrice(data.commission)}
              </p>
            </div>
            <Button asChild className="w-full" variant="outline">
              <Link href="/seller/orders">Open orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent seller orders</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No orders yet. Approved products will appear in the marketplace
              catalogue.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Order</th>
                    <th className="pb-3 font-medium">Items</th>
                    <th className="pb-3 font-medium">Total</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">
                        {order.order.orderNumber}
                      </td>
                      <td className="py-3">{order._count.items}</td>
                      <td className="py-3">{formatPrice(order.total)}</td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={statusColors[order.status] ?? ""}
                        >
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
