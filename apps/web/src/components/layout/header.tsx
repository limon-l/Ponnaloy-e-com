"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ShoppingBag, User, Menu, Sun, Moon, Heart,
  LogOut, ChevronDown, Package, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/use-theme";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { useAuth } from "@/contexts/auth-context";
import { getInitials, cn } from "@/lib/utils";

const navLinks = [
  { label: "New Arrivals", href: "/products?sort=newest" },
  { label: "Trending", href: "/products?sort=trending" },
  { label: "Deals", href: "/products?sort=deals" },
  { label: "Categories", href: "/products" },
];

function AnimatedBadge({ count, className }: { count: number; className?: string }) {
  const prevCount = useRef(count);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (count !== prevCount.current) {
      setAnimate(true);
      prevCount.current = count;
      const t = setTimeout(() => setAnimate(false), 300);
      return () => clearTimeout(t);
    }
  }, [count]);

  if (count === 0) return null;

  return (
    <Badge
      variant="destructive"
      size="icon"
      className={cn(
        "absolute -top-1 -right-1 transition-transform duration-300",
        animate && "scale-125",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </Badge>
  );
}

export function Header() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { user, isAuthenticated, signOut } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const handleSignOut = () => {
    signOut();
    router.push("/");
  };

  return (
    <TooltipProvider delayDuration={300}>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4">
          {/* Logo - Always visible */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg sm:text-xl">Ponnaloy</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium transition-colors hover:text-primary whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex items-center flex-1 max-w-md mx-2 lg:mx-6"
          >
            <Input
              type="search"
              placeholder="Search products..."
              icon={<Search className="h-4 w-4" />}
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Theme Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  aria-label="Toggle theme"
                >
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle theme</TooltipContent>
            </Tooltip>

            {/* Wishlist */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" asChild>
                  <Link href={isAuthenticated ? "/account?tab=wishlist" : "/sign-in?redirect=/account?tab=wishlist"} aria-label="Wishlist">
                    <Heart className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
                    <AnimatedBadge count={wishlistCount} />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Wishlist</TooltipContent>
            </Tooltip>

            {/* Cart */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" asChild>
                  <Link href="/cart" aria-label="Cart">
                    <ShoppingBag className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
                    <AnimatedBadge count={itemCount} />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cart</TooltipContent>
            </Tooltip>

            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 px-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user?.avatar || undefined} />
                      <AvatarFallback className="text-2xs bg-primary/10 text-primary">
                        {getInitials(user?.firstName, user?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-xs font-medium max-w-[100px] truncate">
                      {user?.firstName || "Account"}
                    </span>
                    <ChevronDown className="h-3 w-3 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      My Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders" className="cursor-pointer">
                      <Package className="h-4 w-4 mr-2" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account?tab=wishlist" className="cursor-pointer">
                      <Heart className="h-4 w-4 mr-2" />
                      Wishlist
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === "ADMIN" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="sm" asChild className="gap-1.5 px-2">
                <Link href="/sign-in">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">Sign In</span>
                </Link>
              </Button>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <div className="flex flex-col space-y-4 mt-8">
                  <Link
                    href="/"
                    className="text-lg font-bold"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Ponnaloy
                  </Link>
                  {navLinks.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="text-sm font-medium hover:text-primary transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <form onSubmit={handleSearch} className="pt-4">
                    <Input
                      type="search"
                      placeholder="Search products..."
                      icon={<Search className="h-4 w-4" />}
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </form>
                  <div className="pt-4 border-t space-y-2">
                    {isAuthenticated ? (
                      <>
                        <div className="flex items-center gap-3 px-1 py-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user?.avatar || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(user?.firstName, user?.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                          </div>
                        </div>
                        <Link
                          href="/account"
                          className="block text-sm font-medium hover:text-primary transition-colors py-1"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          My Account
                        </Link>
                        <Link
                          href="/orders"
                          className="block text-sm font-medium hover:text-primary transition-colors py-1"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          My Orders
                        </Link>
                        <button
                          onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                          className="block text-sm font-medium text-destructive hover:text-destructive/80 transition-colors py-1"
                        >
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/sign-in"
                          className="block text-sm font-medium hover:text-primary transition-colors py-1"
                          onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign In / Create Account
                      </Link>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
