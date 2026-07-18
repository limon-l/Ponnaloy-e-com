"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { api } from "@/lib/api";

type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";

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
}

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "Pending", variant: "secondary" },
  CONFIRMED: { label: "Confirmed", variant: "default" },
  SHIPPED: { label: "Shipped", variant: "default" },
  DELIVERED: { label: "Delivered", variant: "outline" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

const filterOptions: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  ...Object.entries(statusConfig).map(([value, config]) => ({
    value: value.toLowerCase(),
    label: config.label,
  })),
];

// Demo orders shown when not authenticated
const demoOrders: Order[] = [
  {
    id: "ORD-2024-001",
    orderNumber: "ORD-2024-001",
    date: "2024-12-15",
    status: "DELIVERED",
    total: 32998,
    items: [
      { name: "Wireless Earbuds Pro", image: "https://picsum.photos/seed/earbuds/600/600", price: 7999, quantity: 1 },
      { name: "Smart Watch Ultra", image: "https://picsum.photos/seed/watch/600/600", price: 24999, quantity: 1 },
    ],
  },
  {
    id: "ORD-2024-002",
    orderNumber: "ORD-2024-002",
    date: "2024-12-20",
    status: "SHIPPED",
    total: 7999,
    items: [
      { name: "Leather Crossbody Bag", image: "https://picsum.photos/seed/bag/600/600", price: 7999, quantity: 1 },
    ],
  },
  {
    id: "ORD-2024-003",
    orderNumber: "ORD-2024-003",
    date: "2025-01-05",
    status: "PENDING",
    total: 6498,
    items: [
      { name: "Cotton Crew Neck T-Shirt", image: "https://picsum.photos/seed/tshirt/600/600", price: 2499, quantity: 1 },
      { name: "Minimalist Desk Lamp", image: "https://picsum.photos/seed/lamp/600/600", price: 3999, quantity: 1 },
    ],
  },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
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
            }))
          );
          return;
        }
      } catch {
        // Not authenticated or API error — use demo data
      }
      setOrders(demoOrders);
    }
    fetchOrders().finally(() => setLoading(false));
  }, []);

  const filteredOrders =
    filter === "all"
      ? orders
      : orders.filter((o) => o.status.toLowerCase() === filter);

  const toggleOrder = (id: string) => {
    setExpandedOrder((prev) => (prev === id ? null : id));
  };

  if (loading) {
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

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Order History</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage your orders
        </p>
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
            {option.value !== "all" && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 min-w-5 justify-center px-1"
              >
                {orders.filter(
                  (o) => o.status.toLowerCase() === option.value
                ).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No orders found</h2>
          <p className="text-muted-foreground mb-6">
            {filter === "all"
              ? "You haven&apos;t placed any orders yet."
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

            return (
              <div key={order.id} className="border rounded-lg overflow-hidden">
                {/* Order Summary Row */}
                <button
                  onClick={() => toggleOrder(order.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold text-sm sm:text-base">
                        {order.orderNumber || order.id}
                      </span>
                    </div>
                    <Badge variant={statusConfig[order.status]?.variant || "secondary"}>
                      {statusConfig[order.status]?.label || order.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                      {new Date(order.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      {formatPrice(order.total)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t bg-muted/30 p-4 space-y-3">
                    {/* Mobile date */}
                    <p className="text-sm text-muted-foreground sm:hidden">
                      {new Date(order.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>

                    {/* Items */}
                    <div className="space-y-2">
                      {order.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 bg-background rounded-md p-3"
                        >
                          <div className="relative w-14 h-14 rounded-md overflow-hidden bg-muted shrink-0">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-1">
                              {item.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {item.quantity}
                            </p>
                          </div>
                          <span className="font-medium text-sm shrink-0">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-muted-foreground">
                        Order Total
                      </span>
                      <span className="font-semibold">
                        {formatPrice(order.total)}
                      </span>
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
