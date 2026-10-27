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

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }

  return data;
}

export const api = {
  get: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: "GET", token }),

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
