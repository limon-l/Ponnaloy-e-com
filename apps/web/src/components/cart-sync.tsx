"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";

export function CartSync() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { syncCart } = useCart();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !syncedRef.current) {
      syncedRef.current = true;
      syncCart();
    }
    if (!isAuthenticated) {
      syncedRef.current = false;
    }
  }, [isAuthenticated, authLoading, syncCart]);

  return null;
}
