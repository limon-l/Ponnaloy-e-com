"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  RefreshCw,
  Loader2,
  UserCheck,
  UserX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/auth-context";
import { api, type ApiResponse } from "@/lib/api";
import { formatDate } from "@/lib/utils";

type CustomerRole = "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";

interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  role: CustomerRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { orders: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const roleConfig: Record<CustomerRole, { label: string; className: string }> = {
  SUPER_ADMIN: {
    label: "Super admin",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  ADMIN: {
    label: "Admin",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  CUSTOMER: {
    label: "Customer",
    className: "bg-secondary text-secondary-foreground",
  },
};

function displayName(user: AdminUser): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || "Unnamed customer";
}

function pageWindow(current: number, total: number): number[] {
  const size = Math.min(5, total);
  const start = Math.max(1, Math.min(current - 2, total - size + 1));
  return Array.from({ length: size }, (_, index) => start + index);
}

export default function AdminCustomersPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  const [toggleTarget, setToggleTarget] = useState<AdminUser | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (roleFilter !== "ALL") params.set("role", roleFilter);

      const response = await api.get<
        ApiResponse<AdminUser[]> & { pagination: Pagination }
      >(`/api/admin/users?${params.toString()}`);

      setUsers(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load customers."
      );
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const updateRole = async (target: AdminUser, role: CustomerRole) => {
    if (role === target.role) return;
    setPendingRole(target.id);
    try {
      await api.put(`/api/admin/users/${target.id}/role`, { role });
      toast({
        title: "Role updated",
        description: `${displayName(target)} is now ${roleConfig[role].label.toLowerCase()}.`,
        variant: "success",
      });
      await loadUsers();
    } catch (err) {
      toast({
        title: "Could not update role",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPendingRole(null);
    }
  };

  const toggleActive = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      const response = await api.put<{ success: boolean; message: string }>(
        `/api/admin/users/${toggleTarget.id}/toggle`
      );
      toast({
        title: toggleTarget.isActive ? "Account deactivated" : "Account activated",
        description: response.message,
        variant: "success",
      });
      setToggleTarget(null);
      await loadUsers();
    } catch (err) {
      toast({
        title: "Could not update account",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setToggling(false);
    }
  };

  const pages = pageWindow(pagination.page, pagination.totalPages);
  const toggleName = toggleTarget ? displayName(toggleTarget) : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customers</h1>
        <p className="text-muted-foreground">
          Manage customer accounts and staff permissions. Role changes take
          effect immediately on the API.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>
              {loading
                ? "Loading customers…"
                : `${pagination.total} ${
                    pagination.total === 1 ? "account" : "accounts"
                  }`}
            </CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name or email…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9 sm:w-64"
                  aria-label="Search customers"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]" aria-label="Filter by role">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All roles</SelectItem>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super admin</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={loadUsers}
                disabled={loading}
                aria-label="Refresh customers"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

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
                  <th className="pb-3 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && users.length === 0 ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td colSpan={7} className="py-3">
                        <Skeleton className="h-10 w-full" />
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      {debouncedSearch || roleFilter !== "ALL"
                        ? "No accounts match these filters."
                        : "No customer accounts yet."}
                    </td>
                  </tr>
                ) : (
                  users.map((account) => {
                    const config = roleConfig[account.role];
                    const isSelf = currentUser?.id === account.id;
                    return (
                      <tr key={account.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">
                          {displayName(account)}
                          {isSelf && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (you)
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {account.email}
                        </td>
                        <td className="py-3 pr-4">
                          <Select
                            value={account.role}
                            onValueChange={(value) =>
                              updateRole(account, value as CustomerRole)
                            }
                            disabled={isSelf || pendingRole === account.id}
                          >
                            <SelectTrigger
                              className="h-8 w-[140px]"
                              aria-label={`Role for ${displayName(account)}`}
                            >
                              <SelectValue>
                                <Badge variant="outline" className={config.className}>
                                  {config.label}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CUSTOMER">Customer</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="SUPER_ADMIN">
                                Super admin
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {account._count.orders}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatDate(account.createdAt)}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant="outline"
                            className={
                              account.isActive
                                ? "bg-green-100 text-green-800 border-green-200"
                                : "bg-gray-100 text-gray-800 border-gray-200"
                            }
                          >
                            {account.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setToggleTarget(account)}
                              disabled={isSelf}
                              aria-label={
                                account.isActive
                                  ? `Deactivate ${displayName(account)}`
                                  : `Activate ${displayName(account)}`
                              }
                            >
                              {account.isActive ? (
                                <>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
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

          {pagination.totalPages > 1 && (
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={pagination.page === 1 || loading}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {pages.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === pagination.page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNumber)}
                    className="h-8 w-8 p-0"
                    disabled={loading}
                  >
                    {pageNumber}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pagination.totalPages, current + 1)
                    )
                  }
                  disabled={pagination.page === pagination.totalPages || loading}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={toggleTarget !== null}
        onOpenChange={(open) => {
          if (!open && !toggling) setToggleTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {toggleTarget?.isActive ? "Deactivate account" : "Activate account"}
            </DialogTitle>
            <DialogDescription>
              {toggleTarget?.isActive
                ? `Deactivate ${toggleName}? They will not be able to sign in until the account is reactivated.`
                : `Activate ${toggleName}? They will be able to sign in again.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setToggleTarget(null)}
              disabled={toggling}
            >
              Cancel
            </Button>
            <Button
              variant={toggleTarget?.isActive ? "destructive" : "default"}
              onClick={toggleActive}
              disabled={toggling}
            >
              {toggling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {toggleTarget?.isActive ? "Deactivate" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
