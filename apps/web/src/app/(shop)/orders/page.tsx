"use client";

import { useState } from "react";
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

// --- Mock Data ---

type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

interface OrderItem {
  name: string;
  image: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  date: string;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
}

const mockOrders: Order[] = [
  {
    id: "ORD-2024-001",
    date: "2024-12-15",
    status: "delivered",
    total: 32998,
    items: [
      {
        name: "Wireless Earbuds Pro",
        image: "https://picsum.photos/seed/earbuds/600/600",
        price: 7999,
        quantity: 1,
      },
      {
        name: "Smart Watch Ultra",
        image: "https://picsum.photos/seed/watch/600/600",
        price: 24999,
        quantity: 1,
      },
    ],
  },
  {
    id: "ORD-2024-002",
    date: "2024-12-20",
    status: "shipped",
    total: 7999,
    items: [
      {
        name: "Leather Crossbody Bag",
        image: "https://picsum.photos/seed/bag/600/600",
        price: 7999,
        quantity: 1,
      },
    ],
  },
  {
    id: "ORD-2024-003",
    date: "2025-01-05",
    status: "pending",
    total: 6498,
    items: [
      {
        name: "Cotton Crew Neck T-Shirt",
        image: "https://picsum.photos/seed/tshirt/600/600",
        price: 2499,
        quantity: 1,
      },
      {
        name: "Minimalist Desk Lamp",
        image: "https://picsum.photos/seed/lamp/600/600",
        price: 3999,
        quantity: 1,
      },
    ],
  },
  {
    id: "ORD-2024-004",
    date: "2025-01-10",
    status: "confirmed",
    total: 3999,
    items: [
      {
        name: "Yoga Mat Premium",
        image: "https://picsum.photos/seed/yoga/600/600",
        price: 3999,
        quantity: 1,
      },
    ],
  },
  {
    id: "ORD-2024-005",
    date: "2024-11-28",
    status: "cancelled",
    total: 12499,
    items: [
      {
        name: "Smart Watch Ultra",
        image: "https://picsum.photos/seed/watch/600/600",
        price: 24999,
        quantity: 1,
      },
    ],
  },
];

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pending", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  shipped: { label: "Shipped", variant: "default" },
  delivered: { label: "Delivered", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const filterOptions: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

// --- Page Component ---

export default function OrdersPage() {
  const [filter, setFilter] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const filteredOrders =
    filter === "all"
      ? mockOrders
      : mockOrders.filter((o) => o.status === filter);

  const toggleOrder = (id: string) => {
    setExpandedOrder((prev) => (prev === id ? null : id));
  };

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
                {mockOrders.filter(
                  (o) => o.status === option.value
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
                        {order.id}
                      </span>
                    </div>
                    <Badge variant={statusConfig[order.status].variant}>
                      {statusConfig[order.status].label}
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
