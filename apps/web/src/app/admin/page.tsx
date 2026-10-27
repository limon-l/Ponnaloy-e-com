"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type ApiResponse } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/utils";

interface RecentOrder {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  user: { firstName: string | null; lastName: string | null; email: string };
  items: Array<{ quantity: number; product: { name: string } | null }>;
}

interface LowStockProduct {
  id: string;
  name: string;
  sku: string | null;
  image: string | null;
  effectiveStock: number;
}

interface DashboardStats {
  totalProducts: number;
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  pendingFulfillment: number;
  recentOrders: RecentOrder[];
  lowStockProducts: LowStockProduct[];
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  OUT_FOR_DELIVERY: "bg-cyan-100 text-cyan-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  RETURNED: "bg-orange-100 text-orange-800",
  REFUNDED: "bg-gray-100 text-gray-800",
};

function customerName(order: RecentOrder): string {
  const name = [order.user?.firstName, order.user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || order.user?.email || "Guest";
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ApiResponse<DashboardStats>>(
        "/api/admin/stats"
      );
      setStats(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cards = stats
    ? [
        {
          title: "Total Revenue",
          value: formatPrice(stats.totalRevenue),
          detail: "Excludes cancelled orders",
          icon: DollarSign,
        },
        {
          title: "Orders",
          value: stats.totalOrders.toLocaleString(),
          detail: `${stats.pendingOrders} awaiting confirmation`,
          icon: ShoppingCart,
        },
        {
          title: "Products",
          value: stats.totalProducts.toLocaleString(),
          detail: "In the catalogue",
          icon: Package,
        },
        {
          title: "Customers",
          value: stats.totalUsers.toLocaleString(),
          detail: "Registered accounts",
          icon: Users,
        },
      ]
    : [];

  const chartMax = stats
    ? Math.max(1, ...stats.revenueByDay.map((day) => day.revenue))
    : 1;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Live operational data from your store database.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={load}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && !stats ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        </>
      ) : (
        stats && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {cards.map((card) => (
                <Card key={card.title}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </CardTitle>
                    <card.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{card.value}</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {card.detail}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {stats.pendingFulfillment > 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span>
                      <strong>{stats.pendingFulfillment}</strong>{" "}
                      {stats.pendingFulfillment === 1 ? "order is" : "orders are"}{" "}
                      confirmed and awaiting fulfilment.
                    </span>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/admin/orders?status=CONFIRMED">Open orders</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Revenue — last 30 days</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="flex h-32 items-end gap-1"
                  role="img"
                  aria-label={`Daily revenue for the last 30 days. Highest day ${formatPrice(
                    chartMax
                  )}.`}
                >
                  {stats.revenueByDay.map((day) => (
                    <div
                      key={day.date}
                      className="flex-1 rounded-t bg-primary/70 transition-colors hover:bg-primary"
                      style={{
                        height: `${Math.max(
                          day.revenue > 0 ? 4 : 1,
                          (day.revenue / chartMax) * 100
                        )}%`,
                      }}
                      title={`${formatDate(day.date)}: ${formatPrice(
                        day.revenue
                      )} · ${day.orders} orders`}
                    />
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Bars represent daily order value excluding cancellations.
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent Orders</CardTitle>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/admin/orders">View all</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {stats.recentOrders.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No orders have been placed yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {stats.recentOrders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-mono text-sm font-medium">
                              {order.orderNumber}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {customerName(order)} ·{" "}
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-medium">
                              {formatPrice(order.total)}
                            </p>
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                                statusColors[order.status] ||
                                "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {order.status.replaceAll("_", " ")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Low Stock
                  </CardTitle>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/admin/products">Manage</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {stats.lowStockProducts.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No active products are below the low-stock threshold.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {stats.lowStockProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {product.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {product.sku ? `SKU: ${product.sku}` : "No SKU"}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 text-sm font-medium ${
                              product.effectiveStock === 0
                                ? "text-red-600"
                                : "text-yellow-600"
                            }`}
                          >
                            {product.effectiveStock} left
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )
      )}
    </div>
  );
}
