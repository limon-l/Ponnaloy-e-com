"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";

export function CartSync() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { mergeGuestToServer, resetCart } = useCart();
  const prevAuthRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;

    const prevAuth = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (isAuthenticated && prevAuth !== true) {
      mergeGuestToServer();
    }

    if (!isAuthenticated && prevAuth === true) {
      resetCart();
    }
  }, [isAuthenticated, authLoading, mergeGuestToServer, resetCart]);

  return null;
}
