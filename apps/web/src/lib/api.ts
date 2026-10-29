const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Absolute URL for a media value returned by the API. Local uploads are stored
 * as `/uploads/<file>` and served by the API origin, while external CDN URLs
 * are returned unchanged.
 */
export function resolveMediaUrl(
  url?: string | null
): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

interface RequestOptions extends RequestInit {
  token?: string;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ponnaloy_token");
}

/**
 * Public catalogue responses change rarely. Caching them briefly in the browser
 * removes a round trip when a shopper navigates back to a page or when several
 * components ask for the same data. Authenticated responses are never cached.
 */
const PUBLIC_GET_PREFIXES = [
  "/api/products",
  "/api/categories",
  "/api/brands",
  "/api/collections",
  "/api/sellers",
  "/api/banners",
  "/api/search",
];
const PUBLIC_MUTATION_PREFIXES = [
  "/api/products",
  "/api/categories",
  "/api/brands",
  "/api/collections",
  "/api/sellers",
  "/api/banners",
  "/api/admin",
];
const GET_CACHE_TTL_MS = 15_000;
const GET_CACHE_MAX_ENTRIES = 100;

const responseCache = new Map<string, { expiresAt: number; value: unknown }>();
const inFlightRequests = new Map<string, Promise<unknown>>();

function readCached<T>(key: string): T | undefined {
  const entry = responseCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function writeCached(key: string, value: unknown): void {
  if (responseCache.size >= GET_CACHE_MAX_ENTRIES) {
    const oldest = responseCache.keys().next().value;
    if (oldest) responseCache.delete(oldest);
  }
  responseCache.set(key, { value, expiresAt: Date.now() + GET_CACHE_TTL_MS });
}

export function clearApiCache(): void {
  responseCache.clear();
}

function isCacheableGet(endpoint: string, method: string, token: string | null): boolean {
  if (token || method !== "GET") return false;
  return PUBLIC_GET_PREFIXES.some((prefix) => endpoint.startsWith(prefix));
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token: tokenOverride, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (fetchOptions.body) {
    headers["Content-Type"] = "application/json";
  }

  const token = tokenOverride || getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const method = (fetchOptions.method || "GET").toUpperCase();
  const cacheable = isCacheableGet(endpoint, method, token);

  if (cacheable) {
    const cached = readCached<T>(endpoint);
    if (cached !== undefined) return cached;

    // Collapse concurrent identical requests (for example, two components
    // mounting at the same time) into a single network call.
    const pending = inFlightRequests.get(endpoint) as Promise<T> | undefined;
    if (pending) return pending;
  }

  const execute = async (): Promise<T> => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || "Request failed");
    }

    if (cacheable) {
      writeCached(endpoint, data);
    } else if (
      method !== "GET" &&
      PUBLIC_MUTATION_PREFIXES.some((prefix) => endpoint.startsWith(prefix))
    ) {
      clearApiCache();
    }

    return data as T;
  };

  if (!cacheable) return execute();

  const promise = execute().finally(() => inFlightRequests.delete(endpoint));
  inFlightRequests.set(endpoint, promise);
  return promise;
}

export const api = {
  get: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: "GET", token }),

  getWithHeaders: <T>(endpoint: string, headers: Record<string, string>) =>
    request<T>(endpoint, { method: "GET", headers }),

  postWithHeaders: <T>(
    endpoint: string,
    body: unknown,
    headers: Record<string, string>
  ) =>
    request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  putWithHeaders: <T>(
    endpoint: string,
    body: unknown,
    headers: Record<string, string>
  ) =>
    request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  deleteWithHeaders: <T>(endpoint: string, headers: Record<string, string>) =>
    request<T>(endpoint, { method: "DELETE", headers }),

  post: <T>(endpoint: string, body?: unknown, token?: string) =>
    request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      token,
    }),

  put: <T>(endpoint: string, body?: unknown, token?: string) =>
    request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      token,
    }),

  delete: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: "DELETE", token }),

  /**
   * Multipart upload (admin media). The browser sets the multipart boundary,
   * so no Content-Type header is supplied here.
   */
  upload: async <T>(endpoint: string, formData: FormData): Promise<T> => {
    const token = getToken();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        (data as { error?: string }).error || "Upload failed"
      );
    }
    return data as T;
  },
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
