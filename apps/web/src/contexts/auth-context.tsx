"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone?: string | null;
  avatar?: string | null;
  role: string;
  createdAt?: string;
  _count?: {
    orders: number;
    reviews: number;
    wishlist: number;
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<{ error?: string }>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "ponnaloy_token";
const USER_KEY = "ponnaloy_user";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        setUser(storedUser);
        setLoading(false);
      } else {
        refreshUser(storedToken).finally(() => setLoading(false));
      }
    } else {
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async (tokenOverride?: string) => {
    const currentToken = tokenOverride || getStoredToken();
    if (!currentToken) return;

    try {
      const API_BASE =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setUser(data.data);
        localStorage.setItem(USER_KEY, JSON.stringify(data.data));
      } else {
        signOut();
      }
    } catch {
      // Token might be expired, keep stored data
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const API_BASE =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const res = await fetch(`${API_BASE}/api/auth/sign-in`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          return { error: data.error || "Invalid credentials" };
        }

        const newToken = data.data.token;
        const userData: AuthUser = {
          id: data.data.id,
          email: data.data.email,
          firstName: data.data.firstName,
          lastName: data.data.lastName,
          avatar: data.data.avatar,
          role: data.data.role,
        };

        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);

        return {};
      } catch {
        return { error: "Something went wrong. Please try again." };
      }
    },
    []
  );

  const signUp = useCallback(
    async (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }) => {
      try {
        const API_BASE =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const res = await fetch(`${API_BASE}/api/auth/sign-up`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();

        if (!res.ok || !result.success) {
          return { error: result.error || "Failed to create account" };
        }

        return {};
      } catch {
        return { error: "Something went wrong. Please try again." };
      }
    },
    []
  );

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      signIn,
      signUp,
      signOut,
      refreshUser,
      isAuthenticated: !!user && !!token,
    }),
    [user, token, loading, signIn, signUp, signOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
