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
  itemCount: number;
  subtotal: number;
  loading: boolean;
  syncCart: () => Promise<void>;
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [serverMode, setServerMode] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setItems(loadCart());
    setHydrated(true);
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (hydrated && !serverMode) saveCart(items);
  }, [items, hydrated, serverMode]);

  const syncCart = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("ponnaloy_token") : null;
    if (!token) {
      setServerMode(false);
      return;
    }

    setLoading(true);
    try {
      // Try to get server cart
      const result = await api.get<{ success: boolean; data: { items: Array<{ id: string; productId: string; quantity: number; product: Product; variant?: ProductVariant | null }> } }>(
        "/api/cart"
      );

      if (result.success) {
        // Server cart exists - merge guest items into it
        const guestItems = loadCart();
        const serverItems = result.data.items || [];

        if (guestItems.length > 0 && serverItems.length >= 0) {
          // Merge guest items into server cart
          for (const guestItem of guestItems) {
            const existingServerItem = serverItems.find(
              (si) => si.productId === guestItem.productId
            );
            if (!existingServerItem) {
              // Add guest item to server cart
              try {
                await api.post("/api/cart/items", {
                  productId: guestItem.productId,
                  quantity: guestItem.quantity,
                  variantId: guestItem.variant?.id || undefined,
                });
              } catch {}
            }
          }
          // Re-fetch the merged cart
          const mergedResult = await api.get<{ success: boolean; data: { items: Array<{ id: string; productId: string; quantity: number; product: Product; variant?: ProductVariant | null }> } }>(
            "/api/cart"
          );
          if (mergedResult.success) {
            const mergedItems: CartItem[] = (mergedResult.data.items || []).map((item) => ({
              id: item.id,
              productId: item.productId,
              name: item.product?.name || "",
              slug: item.product?.slug || "",
              price: item.variant?.price || item.product?.price || 0,
              image: item.product?.images?.[0]?.url || "",
              quantity: item.quantity,
              variant: item.variant ? { id: item.variant.id, name: item.variant.name || "", price: item.variant.price } : null,
            }));
            if (mountedRef.current) {
              setItems(mergedItems);
              setServerMode(true);
              localStorage.removeItem(STORAGE_KEY);
            }
          }
        } else if (serverItems.length > 0) {
          const serverItemsFormatted: CartItem[] = serverItems.map((item) => ({
            id: item.id,
            productId: item.productId,
            name: item.product?.name || "",
            slug: item.product?.slug || "",
            price: item.variant?.price || item.product?.price || 0,
            image: item.product?.images?.[0]?.url || "",
            quantity: item.quantity,
            variant: item.variant ? { id: item.variant.id, name: item.variant.name || "", price: item.variant.price } : null,
          }));
          if (mountedRef.current) {
            setItems(serverItemsFormatted);
            setServerMode(true);
            localStorage.removeItem(STORAGE_KEY);
          }
        } else {
          // Empty server cart, just switch to server mode
          if (mountedRef.current) {
            setServerMode(true);
          }
        }
      }
    } catch {
      // Server not available, stay in local mode
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

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
    localStorage.removeItem(STORAGE_KEY);
  }, [serverMode]);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      itemCount,
      subtotal,
      loading,
      syncCart,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal, loading, syncCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
