"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Users } from "lucide-react";
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

type CustomerRole = "ADMIN" | "CUSTOMER";

interface Customer {
  id: string;
  name: string;
  email: string;
  role: CustomerRole;
  orders: number;
  joined: string;
  status: "ACTIVE" | "INACTIVE";
}

const mockCustomers: Customer[] = [
  { id: "1", name: "John Doe", email: "john@example.com", role: "CUSTOMER", orders: 12, joined: "2024-06-15", status: "ACTIVE" },
  { id: "2", name: "Jane Smith", email: "jane@example.com", role: "CUSTOMER", orders: 8, joined: "2024-07-22", status: "ACTIVE" },
  { id: "3", name: "Bob Wilson", email: "bob@example.com", role: "CUSTOMER", orders: 3, joined: "2024-08-10", status: "ACTIVE" },
  { id: "4", name: "Alice Brown", email: "alice@example.com", role: "CUSTOMER", orders: 15, joined: "2024-05-03", status: "ACTIVE" },
  { id: "5", name: "Admin User", email: "admin@ponnaloy.com", role: "ADMIN", orders: 0, joined: "2024-01-01", status: "ACTIVE" },
  { id: "6", name: "Charlie Davis", email: "charlie@example.com", role: "CUSTOMER", orders: 1, joined: "2024-09-18", status: "INACTIVE" },
  { id: "7", name: "Eva Martinez", email: "eva@example.com", role: "CUSTOMER", orders: 6, joined: "2024-07-01", status: "ACTIVE" },
  { id: "8", name: "Frank Lee", email: "frank@example.com", role: "CUSTOMER", orders: 4, joined: "2024-10-05", status: "ACTIVE" },
  { id: "9", name: "Grace Kim", email: "grace@example.com", role: "CUSTOMER", orders: 9, joined: "2024-06-20", status: "ACTIVE" },
  { id: "10", name: "Henry Chen", email: "henry@example.com", role: "CUSTOMER", orders: 0, joined: "2024-11-12", status: "INACTIVE" },
  { id: "11", name: "Iris Patel", email: "iris@example.com", role: "CUSTOMER", orders: 7, joined: "2024-08-28", status: "ACTIVE" },
  { id: "12", name: "Jack Thompson", email: "jack@example.com", role: "CUSTOMER", orders: 2, joined: "2024-09-30", status: "ACTIVE" },
];

const ITEMS_PER_PAGE = 8;

const roleConfig: Record<CustomerRole, { label: string; className: string }> = {
  ADMIN: { label: "Admin", className: "bg-purple-100 text-purple-800 border-purple-200" },
  CUSTOMER: { label: "Customer", className: "bg-secondary text-secondary-foreground" },
};

export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = mockCustomers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      customer.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "ALL" || customer.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customers</h1>
        <p className="text-muted-foreground">
          View and manage your customers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Customers ({filtered.length})</CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name or email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 sm:w-64"
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
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
                    Name
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Orders
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Joined
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((customer) => {
                    const config = roleConfig[customer.role];
                    return (
                      <tr key={customer.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{customer.name}</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {customer.email}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className={config.className}>
                            {config.label}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {customer.orders}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {customer.joined}
                        </td>
                        <td className="py-3">
                          <Badge
                            variant="outline"
                            className={
                              customer.status === "ACTIVE"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : "bg-gray-100 text-gray-800 border-gray-200"
                            }
                          >
                            {customer.status === "ACTIVE" ? "Active" : "Inactive"}
                          </Badge>
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
    </div>
  );
}
