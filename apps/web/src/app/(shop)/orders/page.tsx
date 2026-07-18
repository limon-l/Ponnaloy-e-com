"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package, ChevronDown, ChevronUp, ShoppingBag,
  Clock, CheckCircle2, Truck, MapPin, XCircle, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

type OrderStatus = "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED" | "RETURNED" | "REFUNDED";

interface OrderItem {
  name: string;
  image: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  statusHistory?: Array<{ status: string; note?: string; createdAt: string }>;
}

const allStatuses: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

const statusConfig: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  PENDING: { label: "Pending", variant: "secondary", icon: Clock },
  CONFIRMED: { label: "Confirmed", variant: "default", icon: CheckCircle2 },
  PROCESSING: { label: "Processing", variant: "default", icon: Package },
  SHIPPED: { label: "Shipped", variant: "default", icon: Truck },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", variant: "default", icon: Truck },
  DELIVERED: { label: "Delivered", variant: "outline", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", variant: "destructive", icon: XCircle },
  RETURNED: { label: "Returned", variant: "destructive", icon: XCircle },
  REFUNDED: { label: "Refunded", variant: "secondary", icon: XCircle },
};

const filterOptions = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

function OrderTrackingTimeline({ status, statusHistory }: { status: OrderStatus; statusHistory?: Array<{ status: string; note?: string; createdAt: string }> }) {
  const currentIdx = allStatuses.indexOf(status);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-8">
        {allStatuses.map((s, i) => {
          const isCompleted = currentIdx >= i;
          const isCurrent = currentIdx === i;
          const Icon = statusConfig[s].icon;
          return (
            <div key={s} className="flex flex-col items-center relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                isCompleted
                  ? isCurrent
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}>
                {isCompleted && !isCurrent ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span className={`text-[10px] mt-1.5 text-center whitespace-nowrap ${isCurrent ? "text-primary font-medium" : isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                {statusConfig[s].label}
              </span>
            </div>
          );
        })}
      </div>
      {/* Progress bar */}
      <div className="absolute top-4 left-4 right-4 h-0.5 bg-muted -z-0">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${currentIdx >= 0 ? (currentIdx / (allStatuses.length - 1)) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    async function fetchOrders() {
      try {
        const res = await api.get<{ success: boolean; data: Array<{
          id: string;
          orderNumber: string;
          createdAt: string;
          status: string;
          total: number;
          items: Array<{
            quantity: number;
            unitPrice: number;
            product: { name: string; images: Array<{ url: string }> };
          }>;
          statusHistory?: Array<{ status: string; note?: string; createdAt: string }>;
        }> }>("/api/orders");
        if (res.success && res.data.length > 0) {
          setOrders(
            res.data.map((o) => ({
              id: o.id,
              orderNumber: o.orderNumber,
              date: o.createdAt,
              status: o.status as OrderStatus,
              total: o.total,
              items: o.items.map((i) => ({
                name: i.product.name,
                image: i.product.images?.[0]?.url || "https://picsum.photos/seed/product/600/600",
                price: i.unitPrice,
                quantity: i.quantity,
              })),
              statusHistory: o.statusHistory,
            }))
          );
        }
      } catch {
        // Not authenticated or API error
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [isAuthenticated, authLoading]);

  const filteredOrders =
    filter === "all"
      ? orders
      : orders.filter((o) => o.status.toLowerCase() === filter);

  const toggleOrder = (id: string) => {
    setExpandedOrder((prev) => (prev === id ? null : id));
  };

  if (authLoading || loading) {
    return (
      <div className="container py-8">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-8" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-16 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Sign in to view orders</h1>
        <p className="text-muted-foreground mb-6">Track and manage your orders by signing in.</p>
        <Button asChild>
          <Link href="/sign-in?redirect=/orders">Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Order History</h1>
        <p className="text-muted-foreground mt-1">Track and manage your orders</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterOptions.map((option) => (
          <Button
            key={option.value}
            variant={filter === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No orders found</h2>
          <p className="text-muted-foreground mb-6">
            {filter === "all"
              ? "You haven't placed any orders yet."
              : `No ${filter} orders found.`}
          </p>
          <Button asChild>
            <Link href="/products">Start Shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrder === order.id;
            const statusInfo = statusConfig[order.status];

            return (
              <div key={order.id} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleOrder(order.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold text-sm sm:text-base">{order.orderNumber}</span>
                    </div>
                    <Badge variant={statusInfo?.variant || "secondary"}>{statusInfo?.label || order.status}</Badge>
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                      {new Date(order.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatPrice(order.total)}</span>
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t bg-muted/30 p-4 space-y-4">
                    <p className="text-sm text-muted-foreground sm:hidden">
                      {new Date(order.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </p>

                    {/* Order Tracking Timeline */}
                    <div className="bg-background rounded-lg p-4">
                      <h4 className="font-medium mb-4 text-sm">Order Tracking</h4>
                      <OrderTrackingTimeline status={order.status} statusHistory={order.statusHistory} />
                    </div>

                    {/* Items */}
                    <div className="space-y-2">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-background rounded-md p-3">
                          <div className="relative w-14 h-14 rounded-md overflow-hidden bg-muted shrink-0">
                            <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <span className="font-medium text-sm shrink-0">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Order Total</span>
                      <span className="font-semibold">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
