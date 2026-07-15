"use client";

import { useState } from "react";
import { Search, Eye, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/utils";

type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";

interface Order {
  id: string;
  customer: string;
  items: number;
  total: number;
  status: OrderStatus;
  date: string;
}

const mockOrders: Order[] = [
  { id: "PN2501-ABC123", customer: "John Doe", items: 3, total: 15998, status: "CONFIRMED", date: "2025-01-15" },
  { id: "PN2501-DEF456", customer: "Jane Smith", items: 1, total: 24999, status: "SHIPPED", date: "2025-01-15" },
  { id: "PN2501-GHI789", customer: "Bob Wilson", items: 2, total: 7999, status: "PENDING", date: "2025-01-14" },
  { id: "PN2501-JKL012", customer: "Alice Brown", items: 1, total: 4499, status: "DELIVERED", date: "2025-01-14" },
  { id: "PN2501-MNO345", customer: "Charlie Davis", items: 4, total: 12999, status: "CONFIRMED", date: "2025-01-13" },
  { id: "PN2501-PQR678", customer: "Eva Martinez", items: 2, total: 5998, status: "CANCELLED", date: "2025-01-13" },
  { id: "PN2501-STU901", customer: "Frank Lee", items: 1, total: 1999, status: "SHIPPED", date: "2025-01-12" },
  { id: "PN2501-VWX234", customer: "Grace Kim", items: 3, total: 8997, status: "PENDING", date: "2025-01-12" },
  { id: "PN2501-YZA567", customer: "Henry Chen", items: 2, total: 14998, status: "DELIVERED", date: "2025-01-11" },
  { id: "PN2501-BCD890", customer: "Iris Patel", items: 1, total: 3499, status: "CONFIRMED", date: "2025-01-11" },
  { id: "PN2501-EFG123", customer: "Jack Thompson", items: 5, total: 22495, status: "SHIPPED", date: "2025-01-10" },
  { id: "PN2501-HIJ456", customer: "Karen White", items: 1, total: 999, status: "PENDING", date: "2025-01-10" },
];

const ITEMS_PER_PAGE = 8;

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  CONFIRMED: { label: "Confirmed", className: "bg-blue-100 text-blue-800 border-blue-200" },
  SHIPPED: { label: "Shipped", className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  DELIVERED: { label: "Delivered", className: "bg-green-100 text-green-800 border-green-200" },
  CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-800 border-red-200" },
};

export default function AdminOrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filtered = mockOrders.filter((order) => {
    const matchesSearch = order.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const viewOrder = (order: Order) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground">
          View and manage customer orders.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Orders ({filtered.length})</CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search order #..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 sm:w-64"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                    Date
                  </th>
                  <th className="pb-3 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <ShoppingCart className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((order) => {
                    const config = statusConfig[order.status];
                    return (
                      <tr key={order.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium font-mono text-xs">
                          {order.id}
                        </td>
                        <td className="py-3 pr-4">{order.customer}</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {order.items} {order.items === 1 ? "item" : "items"}
                        </td>
                        <td className="py-3 pr-4 font-medium">
                          {formatPrice(order.total)}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant="outline"
                            className={config.className}
                          >
                            {config.label}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {order.date}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => viewOrder(order)}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="h-8 w-8 p-0"
                    >
                      {page}
                    </Button>
                  )
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              {selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedOrder.customer}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{selectedOrder.date}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Items</p>
                  <p className="font-medium">
                    {selectedOrder.items} {selectedOrder.items === 1 ? "item" : "items"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">{formatPrice(selectedOrder.total)}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">Status</p>
                <Badge
                  variant="outline"
                  className={statusConfig[selectedOrder.status].className}
                >
                  {statusConfig[selectedOrder.status].label}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
