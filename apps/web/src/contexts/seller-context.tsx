"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, type ApiResponse } from "@/lib/api";
import { useAuth } from "./auth-context";

export interface SellerMembershipSummary {
  id: string;
  sellerId: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  seller: {
    id: string;
    name: string;
    slug: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
    logo: string | null;
    commissionRate: number;
    approvedAt: string | null;
  };
}

export interface SellerApplicationSummary {
  id: string;
  businessName: string;
  status:
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "CHANGES_REQUESTED";
  reviewNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  sellerId: string | null;
}

interface SellerContextValue {
  memberships: SellerMembershipSummary[];
  applications: SellerApplicationSummary[];
  active: SellerMembershipSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  selectSeller: (sellerId: string) => void;
  /** Headers required for every seller-scoped API call. */
  headers: Record<string, string>;
}

const SellerContext = createContext<SellerContextValue | undefined>(undefined);

const STORAGE_KEY = "ponnaloy_seller_id";

export function SellerProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated, loading: authLoading } = useAuth();
  const [memberships, setMemberships] = useState<SellerMembershipSummary[]>([]);
  const [applications, setApplications] = useState<SellerApplicationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setMemberships([]);
      setApplications([]);
      setActiveId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get<
        ApiResponse<{
          memberships: SellerMembershipSummary[];
          applications: SellerApplicationSummary[];
        }>
      >("/api/seller/me", token ?? undefined);

      const nextMemberships = response.data.memberships ?? [];
      setMemberships(nextMemberships);
      setApplications(response.data.applications ?? []);

      const stored =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY)
          : null;
      const preferred =
        nextMemberships.find((item) => item.sellerId === stored) ??
        nextMemberships[0] ??
        null;

      setActiveId(preferred?.sellerId ?? null);
      if (preferred && typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, preferred.sellerId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load seller data.");
      setMemberships([]);
      setApplications([]);
      setActiveId(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!authLoading) void refresh();
  }, [authLoading, refresh]);

  const selectSeller = useCallback((sellerId: string) => {
    setActiveId(sellerId);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, sellerId);
    }
  }, []);

  const active =
    memberships.find((item) => item.sellerId === activeId) ?? null;

  const headers = useMemo<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    if (active) result["x-seller-id"] = active.sellerId;
    return result;
  }, [active]);

  const value = useMemo<SellerContextValue>(
    () => ({
      memberships,
      applications,
      active,
      loading,
      error,
      refresh,
      selectSeller,
      headers,
    }),
    [memberships, applications, active, loading, error, refresh, selectSeller, headers]
  );

  return <SellerContext.Provider value={value}>{children}</SellerContext.Provider>;
}

export function useSeller() {
  const context = useContext(SellerContext);
  if (!context) {
    throw new Error("useSeller must be used within a SellerProvider");
  }
  return context;
}
