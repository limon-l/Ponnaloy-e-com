"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  image: string;
}

const mockProducts: Product[] = [
  { id: "1", name: "Wireless Bluetooth Earbuds", category: "Electronics", price: 2999, stock: 45, status: "ACTIVE", image: "/placeholder.svg" },
  { id: "2", name: "USB-C Hub Adapter", category: "Electronics", price: 1599, stock: 3, status: "ACTIVE", image: "/placeholder.svg" },
  { id: "3", name: "RC Racing Car", category: "Toys", price: 7999, stock: 5, status: "ACTIVE", image: "/placeholder.svg" },
  { id: "4", name: "Car Phone Mount", category: "Accessories", price: 1299, stock: 7, status: "ACTIVE", image: "/placeholder.svg" },
  { id: "5", name: "LED Desk Lamp", category: "Home", price: 3499, stock: 22, status: "DRAFT", image: "/placeholder.svg" },
  { id: "6", name: "Portable Power Bank 10000mAh", category: "Electronics", price: 2499, stock: 30, status: "ACTIVE", image: "/placeholder.svg" },
  { id: "7", name: "Leather Wallet", category: "Accessories", price: 1999, stock: 0, status: "ARCHIVED", image: "/placeholder.svg" },
  { id: "8", name: "Bluetooth Speaker Mini", category: "Electronics", price: 4999, stock: 18, status: "ACTIVE", image: "/placeholder.svg" },
  { id: "9", name: "Kids Puzzle Set", category: "Toys", price: 999, stock: 50, status: "DRAFT", image: "/placeholder.svg" },
  { id: "10", name: "Stainless Steel Water Bottle", category: "Home", price: 1499, stock: 40, status: "ACTIVE", image: "/placeholder.svg" },
  { id: "11", name: "Wireless Mouse Ergonomic", category: "Electronics", price: 2799, stock: 15, status: "ACTIVE", image: "/placeholder.svg" },
  { id: "12", name: "Canvas Backpack", category: "Accessories", price: 3999, stock: 12, status: "ARCHIVED", image: "/placeholder.svg" },
];

const ITEMS_PER_PAGE = 8;

const statusConfig: Record<Product["status"], { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-green-100 text-green-800 border-green-200" },
  DRAFT: { label: "Draft", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  ARCHIVED: { label: "Archived", className: "bg-gray-100 text-gray-800 border-gray-200" },
};

export default function AdminProductsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const filtered = mockProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            Manage your product inventory.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Products ({filtered.length})</CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
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
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
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
                    Image
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Category
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Price
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Stock
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Status
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
                      <Package className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      No products found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((product) => {
                    const config = statusConfig[product.status];
                    return (
                      <tr key={product.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </td>
                        <td className="py-3 pr-4 font-medium">{product.name}</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {product.category}
                        </td>
                        <td className="py-3 pr-4">{formatPrice(product.price)}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={
                              product.stock === 0
                                ? "text-red-600 font-medium"
                                : product.stock < 10
                                  ? "text-yellow-600 font-medium"
                                  : ""
                            }
                          >
                            {product.stock}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant="outline"
                            className={config.className}
                          >
                            {config.label}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(product)}
                            >
                              <Trash2 className="h-4 w-4" />
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedProduct?.name}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
