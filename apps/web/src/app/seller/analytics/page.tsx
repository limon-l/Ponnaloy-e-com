"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSeller } from "@/contexts/seller-context";
import { api, type ApiResponse } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

interface AnalyticsData {
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
  statusCounts: Record<string, number>;
  topProducts: Array<{
    productId: string;
    name: string;
    slug: string;
    quantity: number;
    revenue: number;
  }>;
}

export default function SellerAnalyticsPage() {
  const { active, headers, loading: sellerLoading } = useSeller();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || active.seller.status !== "APPROVED") return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getWithHeaders<ApiResponse<AnalyticsData>>("/api/seller/analytics", headers)
      .then((response) => {
        if (!cancelled) setData(response.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load analytics.");
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
    const max = Math.max(1, ...data.revenueByDay.map((day) => day.revenue));
    return data.revenueByDay.map((day) => ({
      ...day,
      height: Math.max(2, Math.round((day.revenue / max) * 100)),
    }));
  }, [data]);

  const totals = useMemo(() => {
    if (!data) return { revenue: 0, orders: 0 };
    return data.revenueByDay.reduce(
      (acc, day) => ({
        revenue: acc.revenue + day.revenue,
        orders: acc.orders + day.orders,
      }),
      { revenue: 0, orders: 0 }
    );
  }, [data]);

  if (sellerLoading) {
    return <p className="text-muted-foreground">Loading seller workspace…</p>;
  }

  if (!active || active.seller.status !== "APPROVED") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Analytics become available after your store is approved.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading analytics…
      </p>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error ?? "Analytics data is unavailable."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Last 30 days, calculated from your own seller orders and items.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="mt-1 text-2xl font-bold">{formatPrice(totals.revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Orders</p>
            <p className="mt-1 text-2xl font-bold">{totals.orders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Products sold</p>
            <p className="mt-1 text-2xl font-bold">
              {data.topProducts.reduce((sum, item) => sum + item.quantity, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="flex h-56 items-end gap-1"
            role="img"
            aria-label="Bar chart of daily revenue over the last 30 days"
          >
            {chart.map((day) => (
              <div
                key={day.date}
                className="group relative flex flex-1 flex-col items-center justify-end"
                title={`${day.date}: ${formatPrice(day.revenue)}`}
              >
                <div
                  className="w-full rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
                  style={{ height: `${day.height}%` }}
                />
              </div>
            ))}
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orders by status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(data.statusCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              Object.entries(data.statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <Badge variant="outline">{status.replace(/_/g, " ")}</Badge>
                  <span className="font-semibold">{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Best-selling products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet.</p>
            ) : (
              <div className="space-y-3">
                {data.topProducts.slice(0, 8).map((product) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.quantity} sold
                      </p>
                    </div>
                    <span className="shrink-0 font-medium">
                      {formatPrice(product.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
