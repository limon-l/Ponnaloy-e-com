"use client";

import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

const stats = [
  {
    title: "Total Revenue",
    value: "$45,231.89",
    change: "+20.1% from last month",
    icon: DollarSign,
  },
  {
    title: "Orders",
    value: "235",
    change: "+180.1% from last month",
    icon: ShoppingCart,
  },
  {
    title: "Products",
    value: "500+",
    change: "10 new this week",
    icon: Package,
  },
  {
    title: "Customers",
    value: "1,200",
    change: "+12.5% from last month",
    icon: Users,
  },
];

const recentOrders = [
  { id: "PN2501-ABC123", customer: "John Doe", total: 15998, status: "CONFIRMED", date: "2025-01-15" },
  { id: "PN2501-DEF456", customer: "Jane Smith", total: 24999, status: "SHIPPED", date: "2025-01-15" },
  { id: "PN2501-GHI789", customer: "Bob Wilson", total: 7999, status: "PENDING", date: "2025-01-14" },
  { id: "PN2501-JKL012", customer: "Alice Brown", total: 4499, status: "DELIVERED", date: "2025-01-14" },
  { id: "PN2501-MNO345", customer: "Charlie Davis", total: 12999, status: "PROCESSING", date: "2025-01-13" },
];

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const lowStockProducts = [
  { name: "USB-C Hub Adapter", stock: 3, sku: "PN-00004" },
  { name: "RC Racing Car", stock: 5, sku: "PN-00023" },
  { name: "Car Phone Mount", stock: 7, sku: "PN-00024" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back. Here&apos;s an overview of your store.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm">{order.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.customer}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">
                      {formatPrice(order.total)}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                        statusColors[order.status] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockProducts.map((product) => (
                <div
                  key={product.sku}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {product.sku}
                    </p>
                  </div>
                  <span
                    className={`font-medium text-sm ${
                      product.stock < 5 ? "text-red-600" : "text-yellow-600"
                    }`}
                  >
                    {product.stock} left
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
