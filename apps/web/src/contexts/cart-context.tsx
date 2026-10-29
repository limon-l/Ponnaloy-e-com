"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Product, ProductVariant } from "@/types";
import { api } from "@/lib/api";
import { FREE_SHIPPING_THRESHOLD, DEFAULT_SHIPPING_FEE } from "@ponnaloy/shared";
import { useAuth } from "@/contexts/auth-context";

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  quantity: number;
  variant?: { id: string; name: string; price: number } | null;
}

interface ServerCartPayload {
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    product: Product;
    variant?: ProductVariant | null;
  }>;
  discount?: number;
  coupon?: { code: string; discount: number } | null;
}

interface ServerCartResponse {
  success: boolean;
  data: ServerCartPayload;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (
    product: Product,
    quantity?: number,
    variant?: ProductVariant | null
  ) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  resetCart: () => void;
  itemCount: number;
  subtotal: number;
  discount: number;
  couponCode: string | null;
  total: number;
  loading: boolean;
  syncCart: () => Promise<void>;
  mergeGuestToServer: () => Promise<void>;
  applyCoupon: (code: string) => Promise<unknown>;
  removeCoupon: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "ponnaloy_cart";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

function formatServerItem(item: {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
  variant?: ProductVariant | null;
}): CartItem {
  return {
    id: item.id,
    productId: item.productId,
    name: item.product?.name || "",
    slug: item.product?.slug || "",
    price: item.variant?.price || item.product?.price || 0,
    image: item.product?.images?.[0]?.url || "",
    quantity: item.quantity,
    variant: item.variant
      ? { id: item.variant.id, name: item.variant.name || "", price: item.variant.price }
      : null,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [serverMode, setServerMode] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const mountedRef = useRef(true);
  const mergingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    setItems(loadCart());
    setHydrated(true);
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (hydrated) saveCart(items);
  }, [items, hydrated]);

  const recalcTotals = useCallback((serverData?: ServerCartPayload) => {
    if (serverData && typeof serverData.discount === "number") {
      setDiscount(serverData.discount);
    } else {
      setDiscount(0);
    }
    if (serverData?.coupon?.code) {
      setCouponCode(serverData.coupon.code);
    } else {
      setCouponCode(null);
    }
  }, []);

  const applyServerCart = useCallback(
    (data: ServerCartPayload) => {
      const serverItems = (data.items || []).map(formatServerItem);
      setItems(serverItems);
      setServerMode(true);
      recalcTotals(data);
      saveCart(serverItems);
    },
    [recalcTotals]
  );

  const syncCart = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("ponnaloy_token") : null;
    if (!token) {
      setServerMode(false);
      return;
    }

    setLoading(true);
    try {
      const result = await api.get<ServerCartResponse>("/api/cart");

      if (result.success && mountedRef.current) {
        applyServerCart(result.data);
      }
    } catch {
      // Server not available, keep local state
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [applyServerCart]);

  const mergeGuestToServer = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("ponnaloy_token") : null;
    if (!token) return;
    if (mergingRef.current) return;
    mergingRef.current = true;

    setLoading(true);
    try {
      const guestItems = loadCart();
      let latestCart: ServerCartPayload | null = null;

      for (const guestItem of guestItems) {
        try {
          const result = await api.post<ServerCartResponse>("/api/cart/items", {
            productId: guestItem.productId,
            quantity: guestItem.quantity,
            variantId: guestItem.variant?.id || undefined,
          });
          if (result.success) latestCart = result.data;
        } catch {}
      }

      if (latestCart && mountedRef.current) {
        applyServerCart(latestCart);
      } else {
        await syncCart();
      }
    } catch {
      // Fallback: just sync whatever server has
      await syncCart();
    } finally {
      mergingRef.current = false;
    }
  }, [applyServerCart, syncCart]);

  const addItem = useCallback(
    async (product: Product, quantity = 1, variant?: ProductVariant | null) => {
      const variantId = variant?.id || null;
      const key = `${product.id}-${variantId || "none"}`;

      // Update the UI first. Server mode reconciles below, but the click must
      // never wait for an Atlas round trip before the cart badge changes.
      setItems((prev) => {
        const existing = prev.find((item) => item.id === key);
        if (existing) {
          return prev.map((item) =>
            item.id === key
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        return [
          ...prev,
          {
            id: key,
            productId: product.id,
            name: product.name,
            slug: product.slug,
            price: variant?.price ?? product.price,
            image: product.images?.[0]?.url || "",
            quantity,
            variant: variant
              ? { id: variant.id, name: variant.name, price: variant.price }
              : null,
          },
        ];
      });

      if (!serverMode) return;

      try {
        // The API returns the updated cart, so there is no need to follow the
        // mutation with a second GET request.
        const result = await api.post<ServerCartResponse>("/api/cart/items", {
          productId: product.id,
          quantity,
          variantId: variant?.id || undefined,
        });
        if (result.success && mountedRef.current) {
          applyServerCart(result.data);
        }
      } catch {
        // Reconcile with server truth (e.g. the item went out of stock).
        await syncCart();
      }
    },
    [serverMode, applyServerCart, syncCart]
  );

  const removeItem = useCallback(
    async (id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (!serverMode) return;
      try {
        // The local state is already correct; only reconcile if the request
        // fails, which avoids a redundant GET after every click.
        await api.delete(`/api/cart/items/${id}`);
      } catch {
        await syncCart();
      }
    },
    [serverMode, syncCart]
  );

  const updateQuantity = useCallback(
    async (id: string, quantity: number) => {
      if (quantity < 1) return;
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity } : item))
      );
      if (!serverMode) return;
      try {
        await api.put(`/api/cart/items/${id}`, { quantity });
      } catch {
        await syncCart();
      }
    },
    [serverMode, syncCart]
  );

  const clearCart = useCallback(async () => {
    setItems([]);
    setDiscount(0);
    setCouponCode(null);
    saveCart([]);
    if (!serverMode) return;
    try {
      await api.delete("/api/cart");
    } catch {
      // The next sync restores server state if the request did not land.
    }
  }, [serverMode]);

  const applyCoupon = useCallback(
    async (code: string) => {
      if (serverMode && isAuthenticated) {
        const res = await api.post<{
          success: boolean;
          data: { code: string; discount: number };
        }>("/api/cart/coupon", { code: code.toUpperCase() });
        if (res.success && res.data) {
          setCouponCode(res.data.code);
          setDiscount(res.data.discount);
        }
        return res.data;
      }
      // Guest: no coupon apply via API; skip server sync path
      setCouponCode(code.toUpperCase());
    },
    [serverMode, isAuthenticated]
  );

  const removeCoupon = useCallback(async () => {
    if (serverMode && isAuthenticated) {
      await api.delete("/api/cart/coupon");
    }
    setCouponCode(null);
    setDiscount(0);
  }, [serverMode, isAuthenticated]);

  const resetCart = useCallback(() => {
    setItems([]);
    setServerMode(false);
    setDiscount(0);
    setCouponCode(null);
    saveCart([]);
  }, []);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const total = useMemo(() => {
    const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE;
    return Math.max(0, subtotal + shippingFee - discount);
  }, [subtotal, discount]);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      resetCart,
      itemCount,
      subtotal,
      discount,
      couponCode,
      total,
      loading,
      syncCart,
      mergeGuestToServer,
      applyCoupon,
      removeCoupon,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, resetCart, itemCount, subtotal, discount, couponCode, total, loading, syncCart, mergeGuestToServer, applyCoupon, removeCoupon]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
