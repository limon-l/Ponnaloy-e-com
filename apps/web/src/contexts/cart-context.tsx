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

interface CartContextValue {
  items: CartItem[];
  addItem: (
    product: Product,
    quantity?: number,
    variant?: ProductVariant | null
  ) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  resetCart: () => void;
  itemCount: number;
  subtotal: number;
  discount: number;
  couponCode: string | null;
  total: number;
  loading: boolean;
  syncCart: () => Promise<void>;
  mergeGuestToServer: () => Promise<void>;
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

function getCartItemKey(item: CartItem): string {
  return `${item.productId}-${item.variant?.id || "none"}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [serverMode, setServerMode] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState<string | null>(null);
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

  const recalcTotals = useCallback((serverData: any) => {
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

  const syncCart = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("ponnaloy_token") : null;
    if (!token) {
      setServerMode(false);
      return;
    }

    setLoading(true);
    try {
      const result = await api.get<{
        success: boolean;
        data: {
          items: Array<{
            id: string;
            productId: string;
            quantity: number;
            product: Product;
            variant?: ProductVariant | null;
          }>;
          discount?: number;
          coupon?: { code: string; discount: number } | null;
        };
      }>("/api/cart");

      if (result.success && mountedRef.current) {
        const serverItems = (result.data.items || []).map(formatServerItem);
        setItems(serverItems);
        setServerMode(true);
        recalcTotals(result.data);
        saveCart(serverItems);
      }
    } catch {
      // Server not available, keep local state
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [recalcTotals]);

  const mergeGuestToServer = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("ponnaloy_token") : null;
    if (!token) return;
    if (mergingRef.current) return;
    mergingRef.current = true;

    setLoading(true);
    try {
      const guestItems = loadCart();

      if (guestItems.length > 0) {
        for (const guestItem of guestItems) {
          try {
            await api.post("/api/cart/items", {
              productId: guestItem.productId,
              quantity: guestItem.quantity,
              variantId: guestItem.variant?.id || undefined,
            });
          } catch {}
        }
      }

      await syncCart();
    } catch {
      // Fallback: just sync whatever server has
      await syncCart();
    } finally {
      mergingRef.current = false;
    }
  }, [syncCart]);

  const addItem = useCallback(
    async (product: Product, quantity = 1, variant?: ProductVariant | null) => {
      if (serverMode) {
        try {
          await api.post("/api/cart/items", {
            productId: product.id,
            quantity,
            variantId: variant?.id || undefined,
          });
          await syncCart();
          return;
        } catch {
          // Fall back to local mode
        }
      }

      const variantId = variant?.id || null;
      const key = `${product.id}-${variantId || "none"}`;

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
    },
    [serverMode, syncCart]
  );

  const removeItem = useCallback(
    async (id: string) => {
      if (serverMode) {
        try {
          await api.delete(`/api/cart/items/${id}`);
          await syncCart();
          return;
        } catch {}
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [serverMode, syncCart]
  );

  const updateQuantity = useCallback(
    async (id: string, quantity: number) => {
      if (quantity < 1) return;
      if (serverMode) {
        try {
          await api.put(`/api/cart/items/${id}`, { quantity });
          await syncCart();
          return;
        } catch {}
      }
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity } : item))
      );
    },
    [serverMode, syncCart]
  );

  const clearCart = useCallback(async () => {
    if (serverMode) {
      try {
        await api.delete("/api/cart");
      } catch {}
    }
    setItems([]);
    setDiscount(0);
    setCouponCode(null);
    saveCart([]);
  }, [serverMode]);

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
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, resetCart, itemCount, subtotal, discount, couponCode, total, loading, syncCart, mergeGuestToServer]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
