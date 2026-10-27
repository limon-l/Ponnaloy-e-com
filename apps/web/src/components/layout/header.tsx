"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ShoppingBag, User, Menu, Sun, Moon, Heart,
  LogOut, ChevronDown, Package, Settings, Clock, TrendingUp,
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
import { api } from "@/lib/api";

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

  const [suggestions, setSuggestions] = useState<{ products: Array<{ id: string; slug: string; name: string; image: string; price: number }>; categories: Array<{ id: string; slug: string; name: string }>; total: number }>({ products: [], categories: [], total: 0 });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ponnaloy_recent_searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const query = searchQuery.trim();
      if (!query) {
        setSuggestions({ products: [], categories: [], total: 0 });
        setShowSuggestions(recentSearches.length > 0);
        setSelectedIndex(-1);
        return;
      }
      try {
        const res: any = await api.get(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
        setSuggestions(res.data?.data || res.data || { products: [], categories: [], total: 0 });
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
        setSuggestions({ products: [], categories: [], total: 0 });
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, recentSearches.length]);

  const saveRecentSearch = (query: string) => {
    try {
      const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("ponnaloy_recent_searches", JSON.stringify(updated));
    } catch (error) {
      console.error(error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      saveRecentSearch(query);
      router.push(`/products?q=${encodeURIComponent(query)}`);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (href: string, query?: string) => {
    if (query) {
      saveRecentSearch(query);
    }
    router.push(href);
    setShowSuggestions(false);
    setSearchQuery(query || "");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = [
      ...suggestions.categories.map((c) => ({ type: "category", data: c })),
      ...suggestions.products.map((p) => ({ type: "product", data: p })),
    ];
    const hasRecent = !searchQuery.trim() && recentSearches.length > 0;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hasRecent) {
        setSelectedIndex((prev) => (prev < recentSearches.length - 1 ? prev + 1 : prev));
        setShowSuggestions(true);
      } else if (items.length > 0) {
        setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
        setShowSuggestions(true);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (selectedIndex > 0) {
        setSelectedIndex((prev) => prev - 1);
      } else {
        setSelectedIndex(-1);
      }
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0) {
        e.preventDefault();
        if (hasRecent) {
          const query = recentSearches[selectedIndex];
          handleSuggestionClick(`/products?q=${encodeURIComponent(query)}`, query);
        } else if (items[selectedIndex]) {
          const item = items[selectedIndex];
          if (item.type === "category") {
            const c = item.data as any;
            handleSuggestionClick(`/products?category=${c.slug}`);
          } else if (item.type === "product") {
            const p = item.data as any;
            handleSuggestionClick(`/product/${p.slug}`);
          }
        }
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
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
          <div ref={searchContainerRef} className="hidden md:flex items-center flex-1 max-w-md mx-2 lg:mx-6 relative">
            <form onSubmit={handleSearch} className="w-full">
              <Input
                type="search"
                placeholder="Search products..."
                icon={<Search className="h-4 w-4" />}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(searchQuery.trim() ? true : recentSearches.length > 0)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
              />
            </form>
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                {!searchQuery.trim() && recentSearches.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Recent Searches
                    </div>
                    {recentSearches.map((q, i) => (
                      <button
                        key={q}
                        onClick={() => handleSuggestionClick(`/products?q=${encodeURIComponent(q)}`, q)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted flex items-center justify-between",
                          selectedIndex === i && "bg-muted"
                        )}
                      >
                        <span>{q}</span>
                      </button>
                    ))}
                    {recentSearches.length > 0 && (
                      <button
                        onClick={() => { setRecentSearches([]); localStorage.removeItem("ponnaloy_recent_searches"); }}
                        className="w-full text-left px-3 py-1 text-xs text-muted-foreground hover:text-foreground mt-1"
                      >
                        Clear recent
                      </button>
                    )}
                  </div>
                )}
                {(suggestions.categories.length > 0 || suggestions.products.length > 0) && (
                  <>
                    {suggestions.categories.length > 0 && (
                      <div className="p-2 border-b">
                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-2">
                          <TrendingUp className="h-3 w-3" />
                          Categories
                        </div>
                        {suggestions.categories.map((c, i) => {
                          const idx = (recentSearches.length > 0 && !searchQuery.trim()) ? 999 : i;
                          return (
                            <button
                              key={c.id}
                              onClick={() => handleSuggestionClick(`/products?category=${c.slug}`)}
                              className={cn(
                                "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted flex items-center gap-2",
                                selectedIndex === i && "bg-muted"
                              )}
                            >
                              <Search className="h-3 w-3 text-muted-foreground" />
                              <span>{c.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {suggestions.products.length > 0 && (
                      <div className="p-2">
                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Products</div>
                        {suggestions.products.map((p, i) => {
                          const offset = suggestions.categories.length;
                          return (
                            <button
                              key={p.id}
                              onClick={() => handleSuggestionClick(`/product/${p.slug}`)}
                              className={cn(
                                "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted flex items-center gap-3",
                                selectedIndex === offset + i && "bg-muted"
                              )}
                            >
                              {p.image && (
                                <div className="relative w-8 h-8 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="truncate font-medium">{p.name}</p>
                                <p className="text-xs text-muted-foreground">${p.price.toFixed(2)}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

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
                      onFocus={() => setShowSuggestions(recentSearches.length > 0 || searchQuery.trim().length > 0)}
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
