"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Store,
  ClipboardList,
  ArrowLeft,
  Menu,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { SellerProvider, useSeller } from "@/contexts/seller-context";
import { cn } from "@/lib/utils";

const sidebarLinks = [
  { label: "Dashboard", href: "/seller", icon: LayoutDashboard },
  { label: "Products", href: "/seller/products", icon: Package },
  { label: "Orders", href: "/seller/orders", icon: ShoppingCart },
  { label: "Analytics", href: "/seller/analytics", icon: BarChart3 },
  { label: "Storefront", href: "/seller/storefront", icon: Store },
  { label: "Seller status", href: "/seller/apply", icon: ClipboardList },
];

const statusStyles: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  SUSPENDED: "bg-red-100 text-red-800 border-red-200",
  REJECTED: "bg-gray-100 text-gray-800 border-gray-200",
};

function SellerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    memberships,
    active,
    loading,
    selectSeller,
  } = useSeller();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/sign-in?next=%2Fseller");
    }
  }, [authLoading, user, router]);

  if (authLoading || (user && loading)) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden w-64 border-r bg-muted/50 p-6 lg:block">
          <Skeleton className="mb-8 h-6 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="mb-4 h-9 w-56" />
          <Skeleton className="mb-8 h-4 w-80" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <h1 className="text-2xl font-bold">Sign in to sell</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in or create an account to open the seller workspace.
          </p>
          <Button asChild className="mt-6">
            <Link href="/sign-in?next=%2Fseller">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  const navigation = (
    <nav className="flex-1 space-y-1 px-4">
      {sidebarLinks.map((link) => {
        const isActive =
          pathname === link.href ||
          (link.href !== "/seller" && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  const switcher =
    memberships.length > 1 ? (
      <div className="px-4 pb-4">
        <label
          htmlFor="seller-switcher"
          className="mb-1 block text-xs font-medium text-muted-foreground"
        >
          Active store
        </label>
        <Select value={active?.sellerId} onValueChange={selectSeller}>
          <SelectTrigger id="seller-switcher" className="w-full">
            <SelectValue placeholder="Select store" />
          </SelectTrigger>
          <SelectContent>
            {memberships.map((membership) => (
              <SelectItem key={membership.sellerId} value={membership.sellerId}>
                {membership.seller.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ) : null;

  const brand = (
    <div className="p-6">
      <Link href="/seller" className="flex items-center gap-2">
        <Store className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">Seller Center</span>
      </Link>
      {active ? (
        <div className="mt-2 flex items-center gap-2">
          <p className="truncate text-sm text-muted-foreground">
            {active.seller.name}
          </p>
          <Badge
            variant="outline"
            className={cn("text-[10px]", statusStyles[active.seller.status])}
          >
            {active.seller.status}
          </Badge>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No store yet</p>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r bg-muted/50 lg:flex">
        {brand}
        {switcher}
        {navigation}
        <div className="border-t p-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to store
          </Link>
        </div>
      </aside>

      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed left-4 top-4 z-50 lg:hidden"
            aria-label="Open seller navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          {brand}
          {switcher}
          {navigation}
        </SheetContent>
      </Sheet>

      <main className="flex-1 overflow-auto">
        {active && active.seller.status !== "APPROVED" && (
          <div
            role="status"
            className="border-b border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 sm:px-6 lg:px-8"
          >
            Your store is {active.seller.status.toLowerCase()}. You can prepare
            your catalogue, but it will not be published until an administrator
            approves the store.
          </div>
        )}
        <div className="px-4 pb-10 pt-16 sm:px-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SellerProvider>
      <SellerShell>{children}</SellerShell>
    </SellerProvider>
  );
}
